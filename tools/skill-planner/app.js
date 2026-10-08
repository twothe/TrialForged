/** Browser controller: bounded history, recoverable local drafts, SVG graph editing and file handoff. */
(() => {
    'use strict';
    const M = SkillPlan, $ = id => document.getElementById(id);
    const STORAGE = SkillDraftCache.KEY;
    // Defer access so blocked browser storage reports a recoverable error instead of preventing startup.
    const cache = SkillDraftCache.create({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
    const globalFields = ['planName', 'planNotes', 'progression', 'treeName', 'category', 'treeNotes'];
    const skillFields = ['skillName', 'description', 'icon', 'color', 'colorHex', 'cost', 'requiredSkills', 'requiredPoints', 'requiredSpentPoints', 'q', 'r', 'implementation', 'acceptance'];
    const iconItems = new Map(SkillIcons.map(item => [item.id, item]));
    let plan = M.createPlan(), treeId = plan.trees[0].id, selection = null, mode = 'select', pending = null;
    let undo = [], redo = [], view = { x: 0, y: 0, zoom: 1 }, drag = null, suppressClick = false;
    let copyTemplate = null;
    let toastTimer, lastSnapshot = JSON.stringify(plan), storageFailed = false, formDirty = false, lastEditKey = null, lastEditTime = 0;
    const svg = $('canvas'), scene = $('scene');
    const currentTree = () => plan.trees.find(t => t.id === treeId);
    const currentSkill = () => M.resolveSkill(plan, currentTree().skills.find(s => s.id === selection));
    const el = (tag, text, className) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; };
    function svgEl(tag, attrs, text) {
        const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attrs || {})) e.setAttribute(key, value);
        if (text !== undefined) e.textContent = text;
        return e;
    }
    function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 5000); }
    function persist() {
        try {
            const fields = [...globalFields, ...(currentSkill() ? skillFields : [])];
            const raw = Object.fromEntries(fields.map(id => [id, { value: $(id).value, invalid: $(id).getAttribute('aria-invalid') === 'true' }]));
            const effects = currentSkill() ? Array.from($('effects').querySelectorAll('input')).map(input => ({ amount: input.value, invalid: input.getAttribute('aria-invalid') === 'true' })) : [];
            cache.write({ version: 1, plan, treeId, selection, view, query: $('search').value, raw, effects }); storageFailed = false;
            $('saveStatus').textContent = (formDirty ? 'Unfinished input saved · ' : 'Autosaved in this browser · ') + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            storageFailed = true; $('saveStatus').textContent = 'Browser storage is unavailable. Please export a JSON backup!';
            console.error('Local draft persistence failed', error);
        }
    }
    function commit(editKey = null) {
        const next = JSON.stringify(plan);
        if (next === lastSnapshot) return;
        const now = Date.now();
        if (!editKey || editKey !== lastEditKey || now - lastEditTime > 800) undo.push(lastSnapshot);
        if (undo.length > 100) undo.shift(); redo = []; lastSnapshot = next; lastEditKey = editKey; lastEditTime = now;
        renderList(); renderGraph(); renderHistory();
    }
    function change(action, inspector = false) {
        if (formDirty) { toast('Finish the highlighted inputs first. Your unfinished input is autosaved.'); return; }
        const before = M.clone(plan), previousTree = treeId, previousSelection = selection, previousPending = pending;
        try { action(); M.validate(plan); commit(); if (inspector) renderInspector(); persist(); }
        catch (error) { plan = before; treeId = previousTree; selection = previousSelection; pending = previousPending; toast(error.message); console.error('Skill plan change rejected', error); renderAll(); }
    }
    /** Persist each keystroke, keeping invalid intermediate input separate from the last valid model. */
    function edit(input, action) {
        const before = M.clone(plan);
        try {
            if (!input.checkValidity() || input.type === 'number' && !input.value) throw new Error('Incomplete input.');
            action(); M.validate(plan); input.removeAttribute('aria-invalid');
            if (input.id === 'skillName') $('nameError').textContent = '';
            commit((input.id || input.getAttribute('aria-label')) + ':' + selection);
        } catch (error) {
            plan = before; input.setAttribute('aria-invalid', 'true');
            if (input.id === 'skillName') $('nameError').textContent = error.message;
            if (!(error instanceof Error)) console.error('Unexpected input failure', error);
        }
        formDirty = !!document.querySelector('[aria-invalid="true"]'); persist();
    }
    function restore(snapshot) {
        plan = M.parse(snapshot); lastSnapshot = snapshot;
        if (!plan.trees.some(t => t.id === treeId)) treeId = plan.trees[0].id;
        if (!currentTree().skills.some(s => s.id === selection)) selection = null;
        pending = null; lastEditKey = null; renderAll(); persist();
    }
    function renderHistory() { $('undo').disabled = !undo.length; $('redo').disabled = !redo.length; }
    function history(direction) {
        if (!flush()) return;
        const source = direction === 'undo' ? undo : redo, destination = direction === 'undo' ? redo : undo;
        if (!source.length) return; destination.push(JSON.stringify(plan)); restore(source.pop());
    }
    function renderAll() {
        setMode('select');
        formDirty = false; document.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
        $('planName').value = plan.name; $('planNotes').value = plan.notes; $('progression').value = plan.progression;
        $('treeSelect').replaceChildren(...plan.trees.map(t => { const option = el('option', t.name); option.value = t.id; return option; }));
        $('treeSelect').value = treeId; const t = currentTree();
        $('treeName').value = t.name; $('category').value = t.category; $('treeNotes').value = t.notes; $('exclusiveRoot').checked = t.exclusiveRoot;
        $('removeTree').disabled = plan.trees.length <= 1;
        renderList(); renderGraph(); renderInspector(); renderHistory();
    }
    function renderList() {
        const t = M.resolveTree(plan, currentTree()), query = $('search').value.trim().toLocaleLowerCase('en');
        $('skillCount').textContent = new Set(t.skills.map(s => s.name)).size;
        const buttons = new Map(Array.from($('skillList').children).map(button => [button.dataset.id, button]));
        const visible = M.listSkills(t, query);
        $('filterStatus').textContent = query ? `${visible.length} matches` : '';
        for (const [index, s] of visible.entries()) {
            let button = buttons.get(s.id);
            if (!button) {
                button = el('button'); button.dataset.id = s.id;
                const label = el('div'); label.append(el('span', '', 'skill-title'), el('small', '', 'skill-meta'));
                button.append(el('span', '', 'skill-dot'), label);
            }
            button.onclick = () => {
                if (!flush()) return;
                const nodes = currentTree().skills.filter(node => node.name === s.name), index = nodes.findIndex(node => node.id === selection);
                const node = nodes[(index + 1) % nodes.length]; select(node.id); centerOn(node);
            };
            button.classList.toggle('selected', s.name === currentSkill()?.name);
            button.querySelector('.skill-dot').style.background = s.color;
            button.querySelector('.skill-title').textContent = s.name || '(unnamed)';
            button.querySelector('.skill-meta').textContent = `${t.skills.filter(node => node.name === s.name).length} instances · ${s.cost} points`;
            if ($('skillList').children[index] !== button) $('skillList').insertBefore(button, $('skillList').children[index] || null);
            buttons.delete(s.id);
        }
        for (const obsolete of buttons.values()) obsolete.remove();
        $('skillListEmpty').hidden = visible.length > 0;
        $('skillListEmpty').textContent = t.skills.length ? 'No skills match this filter.' : 'No skills yet. Use + Add skill to create one.';
        $('stats').textContent = `${new Set(t.skills.map(s => s.name)).size} skills · ${t.skills.length} instances · ${t.connections.length} links`;
    }
    function select(id) { if (!flush()) return; selection = id; renderList(); renderGraph(); renderInspector(); persist(); }
    function renderInspector() {
        const s = currentSkill(); $('skillEditor').hidden = !s; $('noSelection').hidden = !!s; if (!s) return;
        $('nameError').textContent = '';
        $('instanceStatus').textContent = M.isPlaceholderName(s.name) ? 'Independent draft · Give it a name before sharing' : `Shared skill · ${M.instances(plan, s.name).length} instances in this plan`;
        const fields = { skillName: 'name', description: 'description', icon: 'icon', color: 'color', colorHex: 'color', cost: 'cost', requiredSkills: 'requiredSkills', requiredPoints: 'requiredPoints', requiredSpentPoints: 'requiredSpentPoints', q: 'q', r: 'r', implementation: 'implementation', acceptance: 'acceptance' };
        for (const [field, key] of Object.entries(fields)) $(field).value = s[key];
        closeIconPicker(); updateIconPreview();
        $('root').checked = s.root; $('skillId').textContent = 'Stable ID: ' + s.id;
        $('effects').replaceChildren(...s.effects.map((effect, index) => {
            const block = el('div', undefined, 'effect'), attribute = el('select'); attribute.setAttribute('aria-label', `Attribute for bonus ${index + 1}`);
            attribute.append(...M.attributes.map(a => { const option = el('option', a.label); option.value = a.id; return option; })); attribute.value = effect.attribute;
            attribute.onchange = () => change(() => currentSkill().effects[index].attribute = attribute.value);
            const row = el('div', undefined, 'row'), operation = el('select'); operation.setAttribute('aria-label', `Calculation for bonus ${index + 1}`);
            operation.append(...Object.entries(M.operations).map(([value, label]) => { const option = el('option', label); option.value = value; return option; })); operation.value = effect.operation;
            const amount = el('input'); amount.type = 'number'; amount.step = 'any'; amount.min = '-1000000'; amount.max = '1000000'; amount.value = effect.amount; amount.setAttribute('aria-label', `Amount for bonus ${index + 1}`);
            const unit = el('span', effect.operation === 'add_value' ? 'pts' : '%');
            amount.oninput = () => edit(amount, () => currentSkill().effects[index].amount = Number(amount.value));
            operation.onchange = () => { change(() => currentSkill().effects[index].operation = operation.value); unit.textContent = operation.value === 'add_value' ? 'pts' : '%'; };
            const remove = el('button', '×', 'effect-remove'); remove.setAttribute('aria-label', `Bonus ${index + 1} remove`); remove.onclick = () => change(() => currentSkill().effects.splice(index, 1), true);
            row.append(amount, unit, remove); block.append(attribute, operation, row); return block;
        }));
        const t = currentTree();
        $('connections').replaceChildren(...t.connections.filter(c => c.from === s.id || c.to === s.id).map(c => {
            const row = el('div', undefined, 'connection'), other = t.skills.find(n => n.id === (c.from === s.id ? c.to : c.from));
            const text = c.type === 'directed' ? (c.from === s.id ? '→ ' : '← ') : c.type === 'exclusive' ? '× ' : '↔ ';
            const remove = el('button', '×'); remove.setAttribute('aria-label', 'Connection to ' + other.name + ' remove');
            remove.onclick = () => change(() => t.connections.splice(t.connections.indexOf(c), 1), true);
            row.append(el('span', text + other.name), remove); return row;
        }));
        if (!$('connections').children.length) $('connections').append(el('p', 'No connections yet.', 'muted'));
    }
    let activeIcon = -1;
    function renderIconPicker() {
        const query = $('iconFilter').value.trim().toLocaleLowerCase('en');
        const items = SkillIcons.filter(item => (item.label + ' ' + item.id).toLocaleLowerCase('en').includes(query))
            .sort((a, b) => a.label.localeCompare(b.label, 'en'));
        activeIcon = -1; $('iconFilter').removeAttribute('aria-activedescendant');
        $('iconPicker').replaceChildren(...items.slice(0, 80).map(item => {
            const option = el('button'); option.id = 'item-' + item.id.replace(/[^a-z0-9_-]/g, '-');
            option.setAttribute('role', 'option'); option.setAttribute('aria-selected', String(currentSkill()?.icon === item.id));
            option.dataset.icon = item.id; option.title = item.id; option.tabIndex = -1;
            if (item.preview) { const image = el('img'); image.src = item.preview; image.alt = ''; option.append(image); }
            option.append(el('span', item.label)); option.onclick = () => chooseIcon(item.id); return option;
        }));
        $('iconFilterStatus').textContent = !items.length ? 'No matching items.' : items.length > 80 ? `${items.length} items · Type to narrow the list` : `${items.length} items`;
    }
    function openIconPicker() {
        if (!currentSkill() || formDirty) return;
        $('iconPopup').hidden = false; $('iconFilter').value = '';
        $('iconFilter').setAttribute('aria-expanded', 'true'); $('iconToggle').setAttribute('aria-expanded', 'true'); renderIconPicker();
    }
    function closeIconPicker() {
        $('iconPopup').hidden = true; $('iconFilter').setAttribute('aria-expanded', 'false'); $('iconToggle').setAttribute('aria-expanded', 'false');
        $('iconFilter').removeAttribute('aria-activedescendant');
        const s = currentSkill(); $('iconFilter').value = s ? iconItems.get(s.icon)?.label || s.icon : '';
    }
    function chooseIcon(id) {
        $('icon').value = id; edit($('icon'), () => currentSkill().icon = id); updateIconPreview(); $('iconFilter').focus(); closeIconPicker();
    }
    function updateIconPreview() {
        const item = iconItems.get($('icon').value), image = $('iconPreview');
        image.hidden = !item?.preview;
        if (item?.preview) image.src = item.preview; else image.removeAttribute('src');
        $('iconPreviewLabel').textContent = item ? item.label + ' · Flat texture preview' : 'No local preview for this item ID.';
        if ($('iconPopup').hidden) $('iconFilter').value = item?.label || $('icon').value;
    }
    const hexPoints = size => Array.from({ length: 6 }, (_, i) => { const angle = (60 * i - 30) * Math.PI / 180; return `${size * Math.cos(angle)},${size * Math.sin(angle)}`; }).join(' ');
    function renderGraph() {
        const t = M.resolveTree(plan, currentTree()), rect = svg.getBoundingClientRect();
        if (!rect.width) return;
        scene.setAttribute('transform', `translate(${rect.width / 2 + view.x} ${rect.height / 2 + view.y}) scale(${view.zoom})`);
        const cells = [], bounds = [];
        for (const x of [0, rect.width]) for (const y of [0, rect.height]) bounds.push(M.hexAt((x - rect.width / 2 - view.x) / view.zoom, (y - rect.height / 2 - view.y) / view.zoom));
        const minQ = Math.min(...bounds.map(b => b.q)) - 2, maxQ = Math.max(...bounds.map(b => b.q)) + 2;
        const minR = Math.min(...bounds.map(b => b.r)) - 2, maxR = Math.max(...bounds.map(b => b.r)) + 2;
        for (let r = minR; r <= maxR; r++) for (let q = minQ; q <= maxQ; q++) {
            const p = M.position(q, r); cells.push(svgEl('polygon', { class: 'grid-cell', points: hexPoints(51), transform: `translate(${p.x} ${p.y})` }));
        }
        $('grid').replaceChildren(...cells);
        const edgeMap = new Map(Array.from($('edges').children).map(group => [group.dataset.key, group]));
        for (const [index, c] of t.connections.entries()) {
            const a = t.skills.find(s => s.id === c.from), b = t.skills.find(s => s.id === c.to), p = M.position(a.q, a.r), end = M.position(b.q, b.r);
            const dx = end.x - p.x, dy = end.y - p.y, distance = Math.hypot(dx, dy), inset = Math.min(36, distance / 3);
            const attrs = { x1: p.x + dx / distance * inset, y1: p.y + dy / distance * inset, x2: end.x - dx / distance * inset, y2: end.y - dy / distance * inset };
            const key = c.from + '|' + c.to; let group = edgeMap.get(key);
            if (!group) { group = svgEl('g', { 'data-key': key }); group.append(svgEl('title'), svgEl('line', { class: 'edge' }), svgEl('line', { class: 'edge-hit' })); $('edges').append(group); }
            group.setAttribute('data-edge', index);
            group.querySelector('title').textContent = `${a.name} ${M.connectionTypes[c.type]} ${b.name} – click to remove`;
            for (const element of group.querySelectorAll('line')) for (const [attribute, value] of Object.entries(attrs)) element.setAttribute(attribute, value);
            const line = group.querySelector('.edge'); line.setAttribute('stroke', c.type === 'exclusive' ? '#efaa91' : c.type === 'directed' ? '#85b8e1' : '#65958c');
            line.removeAttribute('stroke-dasharray'); line.removeAttribute('marker-end');
            if (c.type === 'exclusive') line.setAttribute('stroke-dasharray', '7 5');
            if (c.type === 'directed') line.setAttribute('marker-end', 'url(#arrow)');
            edgeMap.delete(key);
        }
        for (const obsolete of edgeMap.values()) obsolete.remove();
        // Preserve node elements across form blur so pointer targets survive editing followed by a click.
        const nodeMap = new Map(Array.from($('nodes').children).map(group => [group.dataset.skill, group]));
        for (const s of t.skills) {
            const p = M.position(s.q, s.r); let group = nodeMap.get(s.id);
            if (!group) {
                group = svgEl('g', { 'data-skill': s.id, tabindex: 0, role: 'button' });
                group.append(svgEl('title'), svgEl('polygon', { points: hexPoints(34) }),
                    svgEl('image', { x: -18, y: -18, width: 36, height: 36, class: 'node-icon', 'preserveAspectRatio': 'xMidYMid meet' }),
                    svgEl('text', { y: 8, class: 'node-symbol' }), svgEl('text', { y: 49, class: 'node-name' }), svgEl('text', { y: 63, class: 'node-sub' }));
                group.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); nodeClick(s.id); } };
                $('nodes').append(group);
            }
            group.setAttribute('class', 'node' + (selection === s.id ? ' selected' : '') + (pending === s.id ? ' pending' : ''));
            group.setAttribute('transform', `translate(${p.x} ${p.y})`); group.setAttribute('aria-label', s.name + (s.root ? ', Root skill' : ''));
            group.querySelector('title').textContent = `${s.name}\n${s.description}\n${s.effects.map(M.effectText).join('\n')}`;
            group.querySelector('polygon').setAttribute('stroke', s.color);
            group.querySelector('.node-symbol').textContent = s.root ? '◎' : s.implementation.trim() ? '✧' : s.effects.length ? '+' : '·';
            const preview = iconItems.get(s.icon)?.preview, image = group.querySelector('.node-icon');
            image.setAttribute('display', preview ? 'inline' : 'none');
            if (preview) image.setAttribute('href', preview); else image.removeAttribute('href');
            group.querySelector('.node-symbol').setAttribute('display', preview ? 'none' : 'inline');
            const name = s.name.length > 15 ? s.name.slice(0, 14) + '…' : s.name;
            group.querySelector('.node-name').textContent = name;
            group.querySelector('.node-sub').textContent = `${s.root ? '◎ ' : ''}${s.cost} P${s.implementation.trim() ? ' · Custom' : ''}`;
            nodeMap.delete(s.id);
        }
        for (const obsolete of nodeMap.values()) obsolete.remove();
        $('emptyCanvas').hidden = !!t.skills.length; $('zoomLabel').textContent = Math.round(view.zoom * 100) + ' %';
    }
    function point(event) {
        const rect = svg.getBoundingClientRect();
        return { x: (event.clientX - rect.left - rect.width / 2 - view.x) / view.zoom, y: (event.clientY - rect.top - rect.height / 2 - view.y) / view.zoom };
    }
    function setMode(next) {
        mode = next; pending = null;
        if (mode !== 'copy') copyTemplate = null;
        $('copySkill').classList.toggle('active', mode === 'copy');
        document.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
        $('modeHint').textContent = mode === 'add' ? 'Click a free cell · Esc finishes' : mode === 'connect' ? 'Source → target · Esc cancels' : 'Select / drag · Drag to pan · Scroll to zoom';
        if (mode === 'copy') $('modeHint').textContent = 'Place shared instances · Click free cells · Esc finishes';
        renderGraph();
    }
    function nodeClick(id) {
        if (!flush()) return;
        if (mode === 'connect') {
            if (!pending) { pending = id; selection = id; toast('Now select the second skill.'); renderGraph(); renderInspector(); renderList(); }
            else { const from = pending; pending = null; change(() => M.connect(currentTree(), from, id, $('connectionType').value), true); }
        } else select(id);
    }
    function addAt(q, r) {
        change(() => {
            const t = currentTree(); if (t.skills.some(s => s.q === q && s.r === r)) throw new Error('This hex cell is already occupied.');
            const s = M.addSkill(plan, t, q, r); selection = s.id;
        }, true);
    }
    svg.addEventListener('click', event => {
        if (suppressClick) { suppressClick = false; return; }
        const node = event.target.closest('[data-skill]'), edge = event.target.closest('[data-edge]');
        if (node) nodeClick(node.dataset.skill);
        else if (edge) {
            if (confirm('Remove this connection?')) change(() => currentTree().connections.splice(Number(edge.dataset.edge), 1), true);
        } else if (mode === 'add' || mode === 'copy') {
            const p = point(event), hex = M.hexAt(p.x, p.y);
            if (mode === 'copy') change(() => {
                const source = plan.trees.flatMap(t => t.skills).find(s => s.id === copyTemplate);
                if (!source) throw new Error('The source instance was removed. Select a skill and use Copy skill again.');
                selection = M.copySkill(plan, currentTree(), source.name, hex.q, hex.r).id;
            }, true);
            else addAt(hex.q, hex.r);
        }
        else if (mode === 'select') select(null);
    });
    svg.addEventListener('pointerdown', event => {
        if (formDirty) return;
        if (event.button !== 0 || event.target.closest('[data-edge]')) return;
        const node = event.target.closest('[data-skill]');
        if (node && mode !== 'select' || !node && ['add', 'copy'].includes(mode)) return;
        drag = { id: node?.dataset.skill, startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y, moved: false, target: null };
    });
    svg.addEventListener('pointermove', event => {
        if (!drag) return;
        const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
        if (Math.hypot(dx, dy) < 5 && !drag.moved) return;
        // Capturing simple clicks retargets them to the canvas and hides the selected skill inspector.
        if (!drag.moved) svg.setPointerCapture(event.pointerId);
        drag.moved = true;
        if (drag.id) {
            const p = point(event); drag.target = M.hexAt(p.x, p.y);
            const group = Array.from($('nodes').children).find(n => n.dataset.skill === drag.id), pos = M.position(drag.target.q, drag.target.r);
            group.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
        } else { view.x = drag.viewX + dx; view.y = drag.viewY + dy; renderGraph(); }
    });
    svg.addEventListener('pointerup', event => {
        if (!drag) return; const finished = drag; drag = null; if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
        if (!finished.moved) return; suppressClick = true;
        if (finished.id && finished.target) { selection = finished.id; change(() => M.moveSkill(currentTree(), finished.id, finished.target.q, finished.target.r), true); renderGraph(); }
        else persist();
    });
    svg.addEventListener('pointerleave', () => { if (drag && !drag.moved) drag = null; });
    svg.addEventListener('pointercancel', () => { drag = null; renderGraph(); });
    function zoom(factor, event) {
        const previous = view.zoom; const next = Math.max(.35, Math.min(2.5, previous * factor));
        if (event) { const p = point(event); view.x += p.x * (previous - next); view.y += p.y * (previous - next); }
        view.zoom = next; renderGraph(); persist();
    }
    svg.addEventListener('wheel', event => { event.preventDefault(); zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12, event); }, { passive: false });
    function centerOn(s) { const p = M.position(s.q, s.r); view.x = -p.x * view.zoom; view.y = -p.y * view.zoom; renderGraph(); persist(); }
    function fit() {
        const points = currentTree().skills.map(s => M.position(s.q, s.r));
        if (!points.length) { view = { x: 0, y: 0, zoom: 1 }; renderGraph(); persist(); return; }
        const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x)), minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
        const rect = svg.getBoundingClientRect(), factor = Math.max(.35, Math.min(1.4, rect.width / (maxX - minX + 200), rect.height / (maxY - minY + 200)));
        view = { x: -(minX + maxX) / 2 * factor, y: -(minY + maxY) / 2 * factor, zoom: factor }; renderGraph(); persist();
    }
    const fields = { skillName: 'name', description: 'description', icon: 'icon', cost: 'cost', requiredSkills: 'requiredSkills', requiredPoints: 'requiredPoints', requiredSpentPoints: 'requiredSpentPoints', implementation: 'implementation', acceptance: 'acceptance' };
    for (const [field, key] of Object.entries(fields)) $(field).addEventListener('input', () => edit($(field), () => {
        const input = $(field);
        if (currentSkill()) currentSkill()[key] = input.type === 'number' ? Number(input.value) : input.value;
    }));
    $('icon').addEventListener('input', updateIconPreview);
    /** Keep both color controls on one model value while retaining unfinished text in the draft. */
    for (const field of ['color', 'colorHex']) $(field).oninput = () => edit($(field), () => {
        const text = $(field).value.trim();
        if (!/^#?[0-9a-f]{6}$/i.test(text)) throw new Error('Enter six hexadecimal digits, optionally preceded by #.');
        const color = '#' + text.replace(/^#/, '').toLowerCase();
        currentSkill().color = color;
        $('color').value = color; $('colorHex').value = color;
        $('color').removeAttribute('aria-invalid'); $('colorHex').removeAttribute('aria-invalid');
    });
    $('iconFilter').onfocus = openIconPicker;
    $('iconFilter').oninput = () => { $('iconPopup').hidden = false; $('iconFilter').setAttribute('aria-expanded', 'true'); renderIconPicker(); };
    $('iconToggle').onclick = () => { if ($('iconPopup').hidden) { $('iconFilter').focus(); if ($('iconPopup').hidden) openIconPicker(); } else closeIconPicker(); };
    $('iconFilter').onkeydown = event => {
        if (event.key === 'Escape' || event.key === 'Tab') { closeIconPicker(); return; }
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault(); if ($('iconPopup').hidden) openIconPicker();
            const options = Array.from($('iconPicker').children); if (!options.length) return;
            activeIcon = activeIcon < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1)
                : (activeIcon + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
            options.forEach((option, index) => option.classList.toggle('active', index === activeIcon));
            $('iconFilter').setAttribute('aria-activedescendant', options[activeIcon].id); options[activeIcon].scrollIntoView?.({ block: 'nearest' });
        }
        if (event.key === 'Enter' && activeIcon >= 0 && !$('iconPopup').hidden) { event.preventDefault(); chooseIcon($('iconPicker').children[activeIcon].dataset.icon); }
    };
    $('skillName').onblur = () => {
        if ($('skillName').getAttribute('aria-invalid') === 'true') queueMicrotask(() => $('skillName').focus());
    };
    document.addEventListener('pointerdown', event => {
        if ($('skillName').getAttribute('aria-invalid') === 'true' && event.target !== $('skillName')) { event.preventDefault(); $('skillName').focus(); return; }
        if (!event.target.closest('[data-icon-combo]')) closeIconPicker();
    }, true);
    for (const field of ['q', 'r']) $(field).oninput = () => edit($(field), () => {
        if (!$('q').value || !$('r').value) throw new Error('Enter both hex coordinates.');
        M.moveSkill(currentTree(), selection, Number($('q').value), Number($('r').value));
    });
    $('root').onchange = () => change(() => currentSkill().root = $('root').checked);
    const planFields = { planName: 'name', planNotes: 'notes', progression: 'progression' };
    for (const [field, key] of Object.entries(planFields)) $(field).oninput = () => edit($(field), () => plan[key] = $(field).value);
    const treeFields = { treeName: 'name', category: 'category', treeNotes: 'notes' };
    for (const [field, key] of Object.entries(treeFields)) $(field).oninput = () => {
        edit($(field), () => currentTree()[key] = $(field).value);
        if (field === 'treeName') Array.from($('treeSelect').options).find(option => option.value === treeId).textContent = currentTree().name;
    };
    $('exclusiveRoot').onchange = () => change(() => currentTree().exclusiveRoot = $('exclusiveRoot').checked);
    $('treeSelect').onchange = () => { if (!flush()) { $('treeSelect').value = treeId; return; } treeId = $('treeSelect').value; selection = null; pending = null; renderAll(); fit(); persist(); };
    $('addTree').onclick = () => {
        if (!flush()) return;
        change(() => {
            const t = M.tree(); let number = plan.trees.length + 1;
            while (plan.trees.some(existing => existing.category === 'trialforged:tree_' + number)) number++;
            t.category = 'trialforged:tree_' + number; plan.trees.push(t); treeId = t.id; selection = null;
        }); renderAll(); fit();
    };
    $('removeTree').onclick = () => {
        if (!flush()) return;
        if (plan.trees.length > 1 && confirm('Delete the entire skill tree “' + currentTree().name + '”?')) {
            change(() => { plan.trees = plan.trees.filter(t => t.id !== treeId); M.pruneDefinitions(plan); treeId = plan.trees[0].id; selection = null; }); renderAll(); fit();
        }
    };
    $('addEffect').onclick = () => change(() => currentSkill().effects.push({ attribute: 'puffish_attributes:sprinting_speed', operation: 'add_multiplied_total', amount: 5 }), true);
    $('copySkill').onclick = () => {
        if (!flush() || !currentSkill()) return;
        const sourceId = selection; setMode('copy'); copyTemplate = sourceId;
    };
    $('deleteSkill').onclick = () => {
        if (!flush()) return;
        const s = currentSkill();
        if (s && (M.isUneditedSkill(currentTree(), s) || confirm('Delete this instance and its connections? Other instances stay.')))
            change(() => { M.deleteInstance(plan, currentTree(), selection); selection = null; }, true);
    };
    document.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode));
    $('connectionType').onchange = () => { pending = null; renderGraph(); };
    $('undo').onclick = () => history('undo'); $('redo').onclick = () => history('redo');
    $('zoomIn').onclick = () => zoom(1.2); $('zoomOut').onclick = () => zoom(1 / 1.2); $('fit').onclick = fit;
    $('firstSkill').onclick = () => { addAt(0, 0); setMode('select'); $('skillName').focus(); $('skillName').select(); };
    $('search').oninput = () => { renderList(); persist(); };
    function flush() {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        if (formDirty) { toast('Unfinished input is autosaved. Complete the highlighted fields before exporting or switching context.'); return false; }
        return true;
    }
    function revealField(input) {
        let section = input.closest('details');
        while (section) { section.open = true; section = section.parentElement?.closest('details'); }
    }
    function download(contents, extension, mime) {
        const name = (plan.name || 'skillplan').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-').slice(0, 80);
        const url = URL.createObjectURL(new Blob([contents], { type: mime + ';charset=utf-8' }));
        const anchor = el('a'); anchor.href = url; anchor.download = name + extension; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast('File exported to your browser download folder.');
    }
    $('savePlan').onclick = () => { if (flush()) download(JSON.stringify(M.validate(plan), null, 2), '.skillplan.json', 'application/json'); };
    $('exportPlan').onclick = () => { if (flush()) download(M.document(plan), '.skillplan.md', 'text/markdown'); };
    $('newPlan').onclick = () => {
        if (!flush() || !confirm('Start a new plan? Export a copy first if you want to keep the current plan.')) return;
        change(() => { plan = M.createPlan(); treeId = plan.trees[0].id; selection = null; pending = null; }); renderAll(); fit();
    };
    $('importPlan').onclick = () => { if (flush()) $('fileInput').click(); };
    $('fileInput').onchange = async () => {
        const file = $('fileInput').files[0]; if (!file) return;
        try {
            if (file.size > 10000000) throw new Error('File is too large (maximum 10 MB).');
            const imported = M.parse(await file.text());
            if (!confirm('Replace the current plan? You can undo this within the current session.')) return;
            change(() => { plan = imported; treeId = plan.trees[0].id; selection = null; pending = null; }); renderAll(); fit(); toast('Plan opened.');
        } catch (error) { toast('Could not open plan: ' + error.message); console.error('Skill plan import failed', error); }
        finally { $('fileInput').value = ''; }
    };
    $('checkPlan').onclick = () => {
        if (!flush()) return; const messages = M.issues(plan);
        $('reportList').replaceChildren(...(messages.length ? messages : ['No basic plan gaps found. Combined requirements and exclusions still need implementation testing.']).map(m => el('li', m)));
        $('report').showModal();
    };
    $('closeReport').onclick = () => $('report').close();
    document.addEventListener('keydown', event => {
        if (event.target === $('skillName') && event.key === 'Tab' && $('skillName').getAttribute('aria-invalid') === 'true') { event.preventDefault(); return; }
        if (event.key === 'Escape') { pending = null; setMode('select'); }
        if (event.target.closest('input,textarea,select,[contenteditable]') || $('report').open) return;
        if (event.key === 'Delete' && currentSkill()) { event.preventDefault(); $('deleteSkill').click(); }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && currentSkill()) { event.preventDefault(); $('copySkill').click(); }
        if (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === '+' || event.code === 'NumpadAdd' || event.key.toLowerCase() === 'n')) { event.preventDefault(); setMode('add'); }
        if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); history(event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo'); }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); $('savePlan').click(); }
    });
    window.addEventListener('storage', event => {
        if (event.key === STORAGE) toast('Another window changed the cached plan. Export this version before continuing; changes are not merged automatically.');
    });
    window.addEventListener('beforeunload', event => {
        if (storageFailed) { event.preventDefault(); event.returnValue = ''; }
    });
    new ResizeObserver(() => renderGraph()).observe(svg);
    try {
        const saved = cache.read(), snapshot = saved.snapshot;
        if (snapshot || saved.plan) {
            plan = snapshot?.plan || saved.plan; treeId = snapshot?.treeId || plan.trees[0].id;
            selection = snapshot?.selection || null; if (!currentTree().skills.some(skill => skill.id === selection)) selection = null;
            view = snapshot?.view || view; $('search').value = snapshot?.query || ''; lastSnapshot = JSON.stringify(plan);
            renderAll();
            if (snapshot) {
                for (const [id, raw] of Object.entries(snapshot.raw)) {
                    const input = $(id); if (!input || ![...globalFields, ...(currentSkill() ? skillFields : [])].includes(id)) continue;
                    input.value = raw.value; if (raw.invalid) { input.setAttribute('aria-invalid', 'true'); revealField(input); }
                }
                Array.from($('effects').querySelectorAll('input')).forEach((input, index) => {
                    const raw = snapshot.effects[index]; if (raw) { input.value = raw.amount; if (raw.invalid) input.setAttribute('aria-invalid', 'true'); }
                });
                formDirty = !!document.querySelector('[aria-invalid="true"]'); updateIconPreview();
                if ($('skillName').getAttribute('aria-invalid') === 'true') {
                    $('nameError').textContent = 'This name is invalid or already exists. Choose a unique name.'; $('skillName').focus();
                }
            }
            $('saveStatus').textContent = saved.recovered ? 'Recovered your plan from an alternate cached copy.' : 'Restored your autosaved plan, including unfinished input.';
            if (saved.failures.length) console.error('Draft recovery diagnostics', saved.failures);
            if (plan.migrationNotes?.length) toast('Old plan upgraded. Conflicting names were preserved as separate variants; see the implementation brief.');
            return;
        }
        if (saved.failures.length) { storageFailed = true; console.error('Draft recovery failed', saved.failures); $('saveStatus').textContent = 'Cached plan could not be read. Open a backup file or start a new plan.'; }
        else $('saveStatus').textContent = 'Ready · Autosave is always on.';
    } catch (error) {
        storageFailed = true; $('saveStatus').textContent = 'Cached plan could not be read. Open a JSON file or start a new plan.'; console.error('Local draft restoration failed', error);
    }
    renderAll();
})();
