/** Controller regression tests run production scripts against DOM/storage dependencies, not a browser renderer. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const M = require('../tools/skill-planner/model.js');

class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.listeners = {}; this.value = ''; this.hidden = false; this.style = {}; this.captured = false; this.textContent = ''; }
    setAttribute(key, value) { this.attributes[key] = String(value); if (key.startsWith('data-')) this.dataset[key.slice(5)] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; }
    get className() { return this.attributes.class || ''; } set className(value) { this.attributes.class = String(value); }
    get value() { return this.inputValue || ''; } set value(value) { this.inputValue = String(value); }
    get classList() { return { toggle: (name, enabled) => { const names = new Set((this.attributes.class || '').split(' ').filter(Boolean)); if (enabled) names.add(name); else names.delete(name); this.attributes.class = [...names].join(' '); } }; }
    append(...elements) { for (const child of elements) { child.remove(); child.parent = this; this.children.push(child); } }
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
    replaceChildren(...elements) { for (const child of [...this.children]) child.remove(); this.append(...elements); }
    insertBefore(child, before) { child.remove(); child.parent = this; if (before) this.children.splice(this.children.indexOf(before), 0, child); else this.children.push(child); }
    matches(selector) {
        return selector.split(',').some(part => {
            if (part.startsWith('.')) return (this.attributes.class || '').split(' ').includes(part.slice(1));
            const attr = part.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
            if (attr) return this.getAttribute(attr[1]) !== null && (attr[2] === undefined || this.getAttribute(attr[1]) === attr[2]);
            return this.tagName === part;
        });
    }
    closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
    fire(type, data = {}) { const event = { target: this, button: 0, pointerId: 1, clientX: 400, clientY: 300, preventDefault() {}, ...data }; this['on' + type]?.(event); for (const listener of this.listeners[type] || []) listener(event); }
    click() { this.fire('click'); }
    focus() { this.focused = true; } select() {} blur() {}
    checkValidity() { return this.type !== 'number' || this.value !== '' && Number.isFinite(Number(this.value)); }
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, width: 800, height: 600 }; }
    setPointerCapture() { this.captured = true; } hasPointerCapture() { return this.captured; } releasePointerCapture() { this.captured = false; }
    get options() { return this.children; }
    showModal() { this.open = true; } close() { this.open = false; }
}
function setup(savedValues = new Map()) {
    const directory = path.resolve(__dirname, '../tools/skill-planner');
    const body = new Element('body'), elements = new Map(), document = new Element('document'); document.append(body); document.body = body;
    const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    for (const match of html.matchAll(/<([a-z0-9]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
        const element = new Element(match[1]); element.id = match[3];
        for (const attr of match[2].matchAll(/([a-z-]+)="([^"]*)"/g)) element.setAttribute(attr[1], attr[2]);
        element.type = element.getAttribute('type') || ''; element.hidden = /\shidden\b/.test(match[2]); elements.set(element.id, element); body.append(element);
    }
    for (const mode of ['select', 'add', 'connect']) { const button = new Element('button'); button.setAttribute('data-mode', mode); body.append(button); }
    elements.get('connectionType').value = 'normal';
    document.getElementById = id => elements.get(id); document.createElement = tag => new Element(tag); document.createElementNS = (_, tag) => new Element(tag);
    const localStorage = { getItem: key => savedValues.get(key) ?? null, setItem: (key, value) => savedValues.set(key, value) };
    const window = new Element('window'), confirmations = [];
    const context = vm.createContext({ document, window, localStorage, console, HTMLElement: Element, ResizeObserver: class { observe() {} }, setTimeout: () => 1, clearTimeout() {}, queueMicrotask, confirm: message => { confirmations.push(message); return true; }, Blob, URL, Date });
    for (const script of ['model.js', 'cache.js', 'icons.js', 'app.js']) vm.runInContext(fs.readFileSync(path.join(directory, script), 'utf8'), context, { filename: script });
    const input = (id, value) => { elements.get(id).value = value; elements.get(id).fire('input'); };
    const storedPlan = () => JSON.parse(savedValues.get('trialforged.skill-plan.v1'));
    const plan = () => { const p = storedPlan(); return { ...p, trees: p.trees.map(t => M.resolveTree(p, t)) }; };
    return { elements, document, input, plan, storedPlan, savedValues, body, confirmations };
}
test('simple node clicks reopen the editor after background deselection without moving the skill', () => {
    const ui = setup(), canvas = ui.elements.get('canvas'); ui.elements.get('firstSkill').click();
    const node = ui.elements.get('nodes').children[0], polygon = node.querySelector('polygon');
    canvas.fire('click'); assert.equal(ui.elements.get('skillEditor').hidden, true);
    canvas.fire('pointerdown', { target: polygon }); assert.equal(canvas.captured, false);
    canvas.fire('pointerup', { target: polygon }); canvas.fire('click', { target: polygon });
    assert.equal(ui.elements.get('skillEditor').hidden, false);
    assert.equal(ui.plan().trees[0].skills[0].q, 0);
});
test('a drag gesture captures only after the movement threshold', () => {
    const ui = setup(), canvas = ui.elements.get('canvas'); ui.elements.get('firstSkill').click();
    canvas.fire('pointerdown', { target: ui.elements.get('nodes').children[0].querySelector('polygon') });
    canvas.fire('pointermove', { clientX: 402 }); assert.equal(canvas.captured, false);
    canvas.fire('pointermove', { clientX: 490 }); assert.equal(canvas.captured, true);
    canvas.fire('pointerup', { clientX: 490 }); assert.equal(canvas.captured, false);
    assert.equal(ui.plan().trees[0].skills[0].q, 1);
});
test('input is autosaved before blur and reopening restores unfinished numeric input', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.input('description', 'Saved while still typing');
    assert.equal(ui.plan().trees[0].skills[0].description, 'Saved while still typing');
    ui.input('cost', '');
    const reopened = setup(ui.savedValues);
    assert.equal(reopened.elements.get('description').value, 'Saved while still typing');
    assert.equal(reopened.elements.get('cost').value, '');
    assert.equal(reopened.elements.get('cost').getAttribute('aria-invalid'), 'true');
    reopened.input('cost', '3'); assert.equal(reopened.plan().trees[0].skills[0].cost, 3);
});
test('keyboard add/delete and item picker update production state', () => {
    const ui = setup(); ui.document.fire('keydown', { target: ui.body, key: '+', code: 'Equal' });
    ui.elements.get('canvas').fire('click'); assert.equal(ui.plan().trees[0].skills.length, 1);
    ui.input('iconFilter', 'diamond'); ui.elements.get('iconPicker').children.find(option => option.dataset.icon === 'minecraft:diamond').click();
    assert.equal(ui.plan().trees[0].skills[0].icon, 'minecraft:diamond');
    assert.equal(ui.elements.get('iconPreview').hidden, false);
    ui.document.fire('keydown', { target: ui.elements.get('skillName'), key: 'Delete' }); assert.equal(ui.plan().trees[0].skills.length, 1);
    ui.document.fire('keydown', { target: ui.body, key: 'Delete' }); assert.equal(ui.plan().trees[0].skills.length, 0);
});
test('the displayed skill list is alphabetic and shows an explicit no-results state', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.input('skillName', 'Zulu');
    ui.document.fire('keydown', { target: ui.body, key: '+', code: 'Equal' });
    ui.elements.get('canvas').fire('click', { clientX: 490 }); ui.input('skillName', 'Alpha');
    assert.deepEqual(ui.elements.get('skillList').children.map(button => button.querySelector('.skill-title').textContent), ['Alpha', 'Zulu']);
    ui.input('search', 'alpha'); assert.equal(ui.elements.get('skillList').children.length, 1);
    ui.input('search', 'missing'); assert.equal(ui.elements.get('skillList').children.length, 0);
    assert.equal(ui.elements.get('skillListEmpty').hidden, false);
    assert.equal(ui.elements.get('skillListEmpty').textContent, 'No skills match this filter.');
});
test('an incomplete input cannot be erased by selecting the same node or starting another tree', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.input('cost', '');
    ui.elements.get('canvas').fire('click', { target: ui.elements.get('nodes').children[0].querySelector('polygon') });
    ui.elements.get('addTree').click();
    assert.equal(ui.elements.get('cost').value, ''); assert.equal(ui.plan().trees.length, 1);
});

test('copies share content and effects, autosave and undo, and leave copy mode on tree changes', () => {
    const ui = setup(); ui.elements.get('firstSkill').click();
    ui.input('skillName', 'Bow training'); ui.input('description', 'Five percent more ranged damage');
    ui.input('implementation', 'Apply only to bows'); ui.input('icon', 'minecraft:bow'); ui.elements.get('addEffect').click();
    const source = ui.plan().trees[0].skills[0];
    ui.document.fire('keydown', { target: ui.body, key: 'd', ctrlKey: true });
    ui.elements.get('canvas').fire('click', { clientX: 490 });
    ui.elements.get('canvas').fire('click', { clientX: 580 });
    const skills = ui.plan().trees[0].skills;
    assert.equal(skills.length, 3); assert.equal(new Set(skills.map(s => s.id)).size, 3);
    for (const copy of skills.slice(1)) {
        assert.equal(copy.root, false);
        for (const field of ['name', 'description', 'implementation', 'icon', 'effects']) assert.deepEqual(copy[field], source[field]);
    }
    assert.equal(ui.plan().trees[0].connections.length, 0);
    const amount = ui.elements.get('effects').querySelector('input'); amount.value = '10'; amount.fire('input');
    assert.equal(ui.plan().trees[0].skills[0].effects[0].amount, 10);
    assert.equal(ui.storedPlan().definitions.length, 1);
    assert.equal(ui.elements.get('skillList').children.length, 1);
    assert.equal(setup(ui.savedValues).plan().trees[0].skills.length, 3);
    ui.elements.get('undo').click(); assert.equal(ui.plan().trees[0].skills[2].effects[0].amount, 5);
    ui.elements.get('undo').click(); assert.equal(ui.plan().trees[0].skills.length, 2);
    ui.elements.get('copySkill').click(); ui.elements.get('addTree').click();
    ui.elements.get('canvas').fire('click'); assert.equal(ui.plan().trees[1].skills.length, 0);
});

test('only untouched disconnected placeholders bypass delete confirmation', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.elements.get('deleteSkill').click();
    assert.equal(ui.confirmations.length, 0); assert.equal(ui.plan().trees[0].skills.length, 0);
    ui.elements.get('undo').click(); assert.equal(ui.plan().trees[0].skills.length, 1);
    const node = ui.elements.get('nodes').children[0]; ui.elements.get('canvas').fire('click', { target: node });
    ui.elements.get('addEffect').click(); ui.elements.get('deleteSkill').click();
    assert.equal(ui.confirmations.length, 1);
});

test('native attribute choices form one strictly alphabetic list', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.elements.get('addEffect').click();
    const labels = ui.elements.get('effects').querySelector('select').options.map(option => option.textContent);
    assert.equal(labels[0], 'Armor');
    assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
});

test('icon filtering matches mixed-case substrings and grid images follow the selected icon', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.input('iconFilter', 'SWor');
    const choices = ui.elements.get('iconPicker').options.filter(option => !option.disabled);
    assert.ok(choices.length >= 6);
    for (const name of ['Iron Sword', 'Golden Sword', 'Diamond Sword']) assert.ok(choices.some(option => option.querySelector('span').textContent.includes(name)));
    assert.ok(choices.every(option => option.querySelector('span').textContent.toLowerCase().includes('swor')));
    assert.equal(ui.plan().trees[0].skills[0].icon, 'minecraft:book');
    ui.elements.get('iconPicker').children.find(option => option.dataset.icon === 'minecraft:iron_sword').click();
    const node = ui.elements.get('nodes').children[0], image = node.querySelector('.node-icon');
    assert.equal(image.getAttribute('href'), ui.elements.get('iconPreview').src);
    assert.equal(image.getAttribute('display'), 'inline'); assert.equal(node.querySelector('.node-symbol').getAttribute('display'), 'none');
    ui.input('iconFilter', 'not-an-item'); assert.equal(ui.elements.get('iconPicker').options.filter(option => !option.disabled).length, 0);
    assert.equal(ui.plan().trees[0].skills[0].icon, 'minecraft:iron_sword');
    ui.input('icon', 'custom:missing_preview'); assert.equal(image.getAttribute('display'), 'none');
    assert.equal(node.querySelector('.node-symbol').getAttribute('display'), 'inline');
});

test('hex colors accept pasted codes and synchronize picker, graph, persistence and undo', () => {
    const ui = setup(); ui.elements.get('firstSkill').click();
    assert.equal(ui.elements.get('colorHex').value, '#6ac9b7');
    ui.input('colorHex', 'AABBCC');
    assert.equal(ui.plan().trees[0].skills[0].color, '#aabbcc');
    assert.equal(ui.elements.get('color').value, '#aabbcc');
    assert.equal(ui.elements.get('colorHex').value, '#aabbcc');
    assert.equal(ui.elements.get('nodes').children[0].querySelector('polygon').getAttribute('stroke'), '#aabbcc');
    const reopened = setup(ui.savedValues); assert.equal(reopened.elements.get('colorHex').value, '#aabbcc');
    ui.input('color', '#123456'); assert.equal(ui.elements.get('colorHex').value, '#123456');
    ui.elements.get('undo').click(); assert.equal(ui.elements.get('colorHex').value, '#aabbcc');
});

test('unfinished or invalid hex input survives reopening and either control can repair it', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.input('colorHex', '#12');
    assert.equal(ui.plan().trees[0].skills[0].color, '#6ac9b7');
    const reopened = setup(ui.savedValues);
    assert.equal(reopened.elements.get('colorHex').value, '#12');
    assert.equal(reopened.elements.get('colorHex').getAttribute('aria-invalid'), 'true');
    reopened.input('colorHex', '#gg1234'); assert.equal(reopened.plan().trees[0].skills[0].color, '#6ac9b7');
    reopened.elements.get('copySkill').click(); reopened.elements.get('canvas').fire('click', { clientX: 490 });
    assert.equal(reopened.plan().trees[0].skills.length, 1);
    reopened.input('color', '#fedcba');
    assert.equal(reopened.elements.get('colorHex').value, '#fedcba');
    assert.equal(reopened.elements.get('colorHex').getAttribute('aria-invalid'), null);
    reopened.input('colorHex', ' #ABCDEF '); assert.equal(reopened.plan().trees[0].skills[0].color, '#abcdef');
});

test('duplicate names stay red, block leaving and exporting, and survive reopening until corrected', async () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.input('skillName', 'Accelerated');
    ui.document.fire('keydown', { target: ui.body, key: '+' }); ui.elements.get('canvas').fire('click', { clientX: 490 });
    ui.input('skillName', 'Accelerated');
    const name = ui.elements.get('skillName'); assert.equal(name.getAttribute('aria-invalid'), 'true');
    assert.match(ui.elements.get('nameError').textContent, /already exists/);
    assert.equal(ui.storedPlan().definitions.length, 2);
    assert.equal(ui.plan().trees[0].skills[1].name, 'New skill');
    let prevented = false;
    ui.document.fire('keydown', { target: name, key: 'Tab', preventDefault() { prevented = true; } }); assert.equal(prevented, true);
    name.fire('blur'); await Promise.resolve(); assert.equal(name.focused, true);
    ui.elements.get('savePlan').click(); assert.match(ui.elements.get('toast').textContent, /Unfinished input/);
    const reopened = setup(ui.savedValues); assert.equal(reopened.elements.get('skillName').value, 'Accelerated');
    assert.equal(reopened.elements.get('skillName').getAttribute('aria-invalid'), 'true');
    reopened.input('skillName', 'Precision'); assert.equal(reopened.elements.get('skillName').getAttribute('aria-invalid'), null);
    assert.equal(reopened.plan().trees[0].skills[1].name, 'Precision');
});

test('renaming shared content updates all nodes and the library survives undo and cycles instances', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.input('skillName', 'Accelerated'); ui.elements.get('addEffect').click();
    ui.elements.get('copySkill').click(); ui.elements.get('canvas').fire('click', { clientX: 490 });
    ui.input('skillName', 'Fleet'); assert.deepEqual(ui.plan().trees[0].skills.map(s => s.name), ['Fleet', 'Fleet']);
    ui.input('icon', 'minecraft:feather'); ui.input('colorHex', '#aabbcc');
    assert.ok(ui.plan().trees[0].skills.every(s => s.icon === 'minecraft:feather' && s.color === '#aabbcc'));
    assert.match(ui.elements.get('skillList').children[0].querySelector('.skill-meta').textContent, /2 instances/);
    ui.elements.get('undo').click(); ui.elements.get('undo').click(); ui.elements.get('undo').click();
    assert.equal(ui.elements.get('skillList').children[0].querySelector('.skill-title').textContent, 'Accelerated');
    const button = ui.elements.get('skillList').children[0]; button.click();
    const first = ui.elements.get('skillId').textContent; button.click(); assert.notEqual(ui.elements.get('skillId').textContent, first);
});

test('icon combo supports integrated typing, keyboard choice and closing without altering the selected item', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); const search = ui.elements.get('iconFilter');
    search.fire('focus'); assert.equal(search.getAttribute('aria-expanded'), 'true');
    ui.input('iconFilter', 'SWOR'); search.fire('keydown', { key: 'ArrowDown' });
    const expected = ui.elements.get('iconPicker').children[0].dataset.icon;
    search.fire('keydown', { key: 'Enter' }); assert.equal(ui.plan().trees[0].skills[0].icon, expected);
    assert.equal(ui.elements.get('iconPopup').hidden, true); assert.equal(search.getAttribute('aria-expanded'), 'false');
    search.fire('focus'); ui.input('iconFilter', 'missing item'); search.fire('keydown', { key: 'Escape' });
    assert.equal(ui.plan().trees[0].skills[0].icon, expected); assert.equal(ui.elements.get('iconPopup').hidden, true);
    search.fire('focus'); ui.input('iconFilter', 'SWOR'); search.fire('keydown', { key: 'ArrowUp' });
    const last = ui.elements.get('iconPicker').children.at(-1).dataset.icon;
    search.fire('keydown', { key: 'Enter' }); assert.equal(ui.plan().trees[0].skills[0].icon, last);
});

test('new and copied drafts edit independently and a reserved name never triggers duplicate-name blocking', () => {
    const ui = setup(); ui.elements.get('firstSkill').click(); ui.elements.get('addEffect').click();
    ui.elements.get('copySkill').click(); ui.elements.get('canvas').fire('click', { clientX: 490 });
    const amount = ui.elements.get('effects').querySelector('input'); amount.value = '10'; amount.fire('input');
    assert.equal(ui.plan().trees[0].skills[0].effects[0].amount, 5);
    assert.equal(ui.plan().trees[0].skills[1].effects[0].amount, 10);
    assert.equal(ui.elements.get('skillList').children.length, 2);
    ui.input('skillName', 'New Skill'); assert.equal(ui.elements.get('skillName').getAttribute('aria-invalid'), null);
    assert.match(ui.elements.get('instanceStatus').textContent, /Independent draft/);
    const reopened = setup(ui.savedValues); assert.equal(reopened.plan().trees[0].skills[0].effects[0].amount, 5);
    assert.equal(reopened.plan().trees[0].skills[1].effects[0].amount, 10);
});
