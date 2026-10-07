/** Offline skill-plan contract, hex coordinates, validation and lossless handoff export. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SkillPlan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const VERSION = 1;
    const TARGET = { minecraft: '1.21.1', loader: 'NeoForge', skills: '0.19.1', attributes: '0.8.3' };
    const nativeAttributes = [
        ['sprinting_speed', 'Sprinting Speed'], ['jump', 'Jump'], ['mining_speed', 'Mining Speed'],
        ['breaking_speed', 'Breaking Speed'], ['pickaxe_speed', 'Pickaxe Speed'], ['axe_speed', 'Axe Speed'],
        ['shovel_speed', 'Shovel Speed'], ['mount_speed', 'Mount Speed'], ['consuming_speed', 'Consuming Speed'],
        ['magic_damage', 'Magic Damage'], ['melee_damage', 'Melee Damage'], ['ranged_damage', 'Ranged Damage'],
        ['tamed_damage', 'Tamed Damage'], ['sword_damage', 'Sword Damage'], ['axe_damage', 'Axe Damage'],
        ['trident_damage', 'Trident Damage'], ['mace_damage', 'Mace Damage'], ['healing', 'Healing'],
        ['resistance', 'Resistance'], ['magic_resistance', 'Magic Resistance'], ['melee_resistance', 'Melee Resistance'],
        ['ranged_resistance', 'Ranged Resistance'], ['tamed_resistance', 'Tamed Resistance'],
        ['natural_regeneration', 'Natural Regeneration'], ['damage_reflection', 'Damage Reflection'], ['life_steal', 'Life Steal'],
        ['fall_reduction', 'Fall Reduction'], ['experience', 'Experience'], ['fortune', 'Fortune'],
        ['knockback', 'Knockback'], ['repair_cost', 'Repair Cost'], ['armor_shred', 'Armor Shred'],
        ['toughness_shred', 'Toughness Shred'], ['protection_shred', 'Protection Shred'],
        ['resistance_shred', 'Resistance Shred'], ['magic_resistance_shred', 'Magic Resistance Shred'],
        ['melee_resistance_shred', 'Melee Resistance Shred'], ['ranged_resistance_shred', 'Ranged Resistance Shred'],
        ['bow_projectile_speed', 'Bow Projectile Speed'], ['crossbow_projectile_speed', 'Crossbow Projectile Speed'],
        ['stealth', 'Stealth'], ['stamina', 'Stamina']
    ].map(([key, label]) => ({ id: 'puffish_attributes:' + key, label }));
    const attributes = [
        ...nativeAttributes,
        { id: 'minecraft:generic.max_health', label: 'Maximum health (2 points = 1 heart)' },
        { id: 'minecraft:generic.attack_damage', label: 'Attack damage' },
        { id: 'minecraft:generic.attack_speed', label: 'Attack speed' },
        { id: 'minecraft:generic.armor', label: 'Armor' },
        { id: 'minecraft:generic.armor_toughness', label: 'Armor toughness' },
        { id: 'minecraft:generic.movement_speed', label: 'Movement speed' },
        { id: 'minecraft:generic.knockback_resistance', label: 'Knockback resistance' },
        { id: 'minecraft:generic.luck', label: 'Vanilla luck' }
    ].sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id, 'en'));
    const operations = {
        add_value: 'Flat bonus', add_multiplied_base: 'Percent of base', add_multiplied_total: 'Percent of total'
    };
    const connectionTypes = { normal: 'Normal ↔', directed: 'Directed →', exclusive: 'Exclusive ×' };
    const clone = value => JSON.parse(JSON.stringify(value));
    const uid = prefix => prefix + '_' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
    function tree(name = 'New skill tree') {
        return { id: uid('tree'), name, category: 'trialforged:skills', exclusiveRoot: false, notes: '', skills: [], connections: [] };
    }
    function createPlan() {
        return { format: 'trialforged-skill-plan', version: VERSION, target: clone(TARGET), name: 'My skill plan', notes: '', progression: '', trees: [tree('Adventure')] };
    }
    function skill(q, r) {
        return { id: uid('skill'), q, r, name: 'New skill', description: '', icon: 'minecraft:book', color: '#6ac9b7',
            root: false, cost: 1, requiredSkills: 1, requiredPoints: 0, requiredSpentPoints: 0,
            effects: [], implementation: '', acceptance: '' };
    }
    /** Axial pointy-top hex coordinates; integer mod coordinates are a deliberate export convention. */
    function position(q, r, size = 52) { return { x: Math.sqrt(3) * size * (q + r / 2), y: 1.5 * size * r }; }
    function hexAt(x, y, size = 52) {
        const q = (Math.sqrt(3) / 3 * x - y / 3) / size, r = (2 / 3 * y) / size;
        let a = Math.round(q), b = Math.round(r), c = Math.round(-q - r);
        const da = Math.abs(a - q), db = Math.abs(b - r), dc = Math.abs(c + q + r);
        if (da > db && da > dc) a = -b - c;
        else if (db > dc) b = -a - c;
        return { q: a || 0, r: b || 0 };
    }
    function moveSkill(t, id, q, r) {
        if (t.skills.some(s => s.id !== id && s.q === q && s.r === r)) throw new Error('This hex cell is already occupied.');
        Object.assign(t.skills.find(s => s.id === id), { q, r });
    }
    function connect(t, from, to, type) {
        if (from === to) throw new Error('Choose two different skills.');
        if (!t.skills.some(s => s.id === from) || !t.skills.some(s => s.id === to)) throw new Error('Connection endpoints must be valid skills.');
        if (!Object.hasOwn(connectionTypes, type)) throw new Error('Unknown connection type.');
        if (t.connections.some(c => c.from === from && c.to === to || c.from === to && c.to === from))
            throw new Error('These skills are already connected. Remove the connection before changing it.');
        t.connections.push({ from, to, type });
    }
    function removeSkill(t, id) {
        t.skills = t.skills.filter(s => s.id !== id);
        t.connections = t.connections.filter(c => c.from !== id && c.to !== id);
    }
    /** Copy authored content to a free cell, with an independent identity and no root status or links. */
    function copySkill(t, source, q, r) {
        if (![q, r].every(value => Number.isSafeInteger(value) && Math.abs(value) <= 10000)) throw new Error('Invalid hex coordinates.');
        if (t.skills.some(s => s.q === q && s.r === r)) throw new Error('This hex cell is already occupied.');
        const copied = { ...clone(source), id: uid('skill'), q, r, root: false };
        t.skills.push(copied);
        return copied;
    }
    /** Placement and automatically assigned root status do not count as authored content. */
    function isUneditedSkill(t, s) {
        const defaults = skill(s.q, s.r);
        return Object.keys(defaults).filter(key => !['id', 'q', 'r', 'root'].includes(key))
            .every(key => JSON.stringify(s[key]) === JSON.stringify(defaults[key]))
            && !t.connections.some(c => c.from === s.id || c.to === s.id);
    }
    /** Filter without mutating layout order, then sort strictly by English alphabet with deterministic ties. */
    function listSkills(t, query = '') {
        const filter = query.trim().toLocaleLowerCase('en');
        const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: false });
        return t.skills.filter(s => (s.name + ' ' + s.description).toLocaleLowerCase('en').includes(filter))
            .sort((a, b) => collator.compare(a.name, b.name) || a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en'));
    }
    function reward(effect) {
        return { type: 'puffish_skills:attribute', data: { attribute: effect.attribute, value: effect.operation === 'add_value' ? effect.amount : effect.amount / 100, operation: effect.operation } };
    }
    function effectText(e) {
        return `${e.amount >= 0 ? '+' : ''}${e.amount}${e.operation === 'add_value' ? ' points' : ' %'} ${attributes.find(a => a.id === e.attribute)?.label || e.attribute} (${operations[e.operation]})`;
    }
    /** Reject malformed imports before they can replace persistent state. Empty content is allowed as a draft. */
    function validate(plan) {
        const fail = message => { throw new Error('Invalid plan: ' + message); };
        const object = (v, name) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(name); };
        const text = (v, name) => { if (typeof v !== 'string' || v.length > 100000) fail(name + ' must be text (maximum 100,000 characters).'); };
        const integer = (v, name, min = 0, max = 100000) => { if (!Number.isSafeInteger(v) || v < min || v > max) fail(name + ' is outside its valid range.'); };
        const array = (v, name, max) => { if (!Array.isArray(v) || v.length > max) fail(name + ' must be a valid list.'); };
        const bool = (v, name) => { if (typeof v !== 'boolean') fail(name + ' must be true or false.'); };
        const ids = new Set();
        const id = v => { text(v, 'ID'); if (!/^[a-zA-Z0-9_-]{1,100}$/.test(v) || ids.has(v)) fail('Missing or duplicate ID: ' + v); ids.add(v); };
        object(plan, 'Plan');
        if (plan.format !== 'trialforged-skill-plan' || plan.version !== VERSION) fail('Unsupported file format or version.');
        object(plan.target, 'Target versions'); for (const key of Object.keys(TARGET)) text(plan.target[key], key);
        for (const key of ['name', 'notes', 'progression']) text(plan[key], key);
        array(plan.trees, 'Skill trees', 50); if (!plan.trees.length) fail('At least one skill tree is required.');
        for (const t of plan.trees) {
            object(t, 'Skill tree'); id(t.id); text(t.name, 'Tree name'); text(t.notes, 'Tree notes'); text(t.category, 'Category'); bool(t.exclusiveRoot, 'Root mode');
            if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(t.category)) fail('Category needs an ID such as trialforged:adventure.');
            array(t.skills, 'Skills', 2000); array(t.connections, 'Connections', 10000);
            const cells = new Set(), localIds = new Set();
            for (const s of t.skills) {
                object(s, 'Skill'); id(s.id); localIds.add(s.id);
                for (const key of ['name', 'description', 'icon', 'implementation', 'acceptance']) text(s[key], key);
                if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(s.icon)) fail('Item icon requires a valid resource ID.');
                if (typeof s.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(s.color)) fail('Skill color');
                bool(s.root, 'Root skill'); integer(s.q, 'q', -10000, 10000); integer(s.r, 'r', -10000, 10000);
                for (const key of ['cost', 'requiredSkills', 'requiredPoints', 'requiredSpentPoints']) integer(s[key], key);
                const cell = `${s.q},${s.r}`; if (cells.has(cell)) fail('Two skills occupy the same hex cell.'); cells.add(cell);
                array(s.effects, 'Effects', 100);
                for (const e of s.effects) {
                    object(e, 'Effect');
                    if (!attributes.some(a => a.id === e.attribute)) fail('Unknown attribute: ' + e.attribute);
                    if (!Object.hasOwn(operations, e.operation)) fail('Unknown attribute operation.');
                    if (!Number.isFinite(e.amount) || Math.abs(e.amount) > 1000000) fail('Effect amount');
                }
            }
            const pairs = new Set();
            for (const c of t.connections) {
                object(c, 'Connection');
                if (!localIds.has(c.from) || !localIds.has(c.to) || c.from === c.to || !Object.hasOwn(connectionTypes, c.type)) fail('Invalid connection.');
                const pair = [c.from, c.to].sort().join('|'); if (pairs.has(pair)) fail('Duplicate connection.'); pairs.add(pair);
            }
        }
        return plan;
    }
    function issues(plan) {
        const messages = [];
        if (!plan.progression.trim()) messages.push('Point awards / progression are not specified.');
        const categories = new Set();
        for (const t of plan.trees) {
            if (categories.has(t.category)) messages.push(`${t.name}: Category ID is used more than once.`); categories.add(t.category);
            if (!t.skills.length) { messages.push(`${t.name}: no skills yet.`); continue; }
            const reached = new Set(t.skills.filter(s => s.root).map(s => s.id));
            if (!reached.size) messages.push(`${t.name}: no root skill selected.`);
            let changed = true;
            while (changed) {
                changed = false;
                for (const c of t.connections) {
                    if (c.type === 'exclusive') continue;
                    if (reached.has(c.from) && !reached.has(c.to)) { reached.add(c.to); changed = true; }
                    if (c.type === 'normal' && reached.has(c.to) && !reached.has(c.from)) { reached.add(c.from); changed = true; }
                }
            }
            for (const s of t.skills) {
                const label = `${t.name} / ${s.name || s.id}`;
                if (!s.name.trim()) messages.push(label + ': name is missing.');
                if (!s.effects.length && !s.implementation.trim()) messages.push(label + ': technical effect is missing (or explicitly specify no effect).');
                if (!reached.has(s.id)) messages.push(label + ': not reachable from a root through normal/directed connections.');
                const incoming = t.connections.filter(c => c.type === 'normal' && (c.from === s.id || c.to === s.id) || c.type === 'directed' && c.to === s.id).length;
                if (!s.root && s.requiredSkills > incoming) messages.push(label + ': requires more unlocked neighbors than there are incoming connections.');
            }
        }
        return messages;
    }
    function parse(input) {
        if (input.length > 10000000) throw new Error('File is too large (maximum 10 MB).');
        const marker = Array.from(input.matchAll(/^<!-- SKILL_PLAN_JSON_START -->\r?$/gm)).at(-1)?.index ?? -1;
        const embedded = marker < 0 ? null : input.slice(marker).match(/^<!-- SKILL_PLAN_JSON_START -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- SKILL_PLAN_JSON_END -->\s*$/);
        return clone(validate(JSON.parse(embedded ? embedded[1] : input)));
    }
    /** Human-readable handoff plus complete machine-readable source; no custom request is turned into a fake reward. */
    function document(plan) {
        validate(plan);
        const lines = ['# Skill plan: ' + plan.name, '', 'Planning draft — not an installable data pack.', '',
            `Target: Minecraft ${plan.target.minecraft}, ${plan.target.loader}, Pufferfish’s Skills ${plan.target.skills}, Attributes ${plan.target.attributes}.`, '',
            '## Overall design notes', '', plan.notes || '(unspecified)', '', '## Point awards and progression', '', plan.progression || '(unspecified)', '',
            '## Implementation contract', '',
            '- Preserve stable skill IDs. Account for personal unlocks and multiplayer persistence.',
            '- Implement native attribute bonuses through puffish_skills:attribute. Divide percentages by 100 in rewards.',
            '- Evaluate custom mechanics and native alternatives; clarify invasive mod changes before implementation.',
            '- Roots are available entry skills, not automatically unlocked free skills.',
            '- Layout: pointy-top hex grid, axial q/r, radius 52. Round mod x/y to integers.',
            '- Verify item IDs, interactions, respec, relog and multiplayer in game before release.', ''];
        for (const t of plan.trees) {
            lines.push(`## Skill tree: ${t.name}`, '', `Tree ID: ${t.id}`, `Category: ${t.category}`, `exclusive_root: ${t.exclusiveRoot}`, '', t.notes || '(no tree notes)', '', '### Connections', '');
            for (const c of t.connections) lines.push(`- ${c.from} ${c.type === 'directed' ? '→' : c.type === 'exclusive' ? '×' : '↔'} ${c.to} (${connectionTypes[c.type]})`);
            if (!t.connections.length) lines.push('(none)');
            for (const s of t.skills) {
                const p = position(s.q, s.r);
                lines.push('', `### ${s.name}`, '', `ID: ${s.id}`, `Hex: q=${s.q}, r=${s.r}; Mod position: x=${Math.round(p.x)}, y=${Math.round(p.y)}`,
                    `Item icon: ${s.icon}; Plan color: ${s.color} (editor aid)`, `Root skill: ${s.root}; Cost: ${s.cost}; required_skills: ${s.requiredSkills}; required_points: ${s.requiredPoints}; required_spent_points: ${s.requiredSpentPoints}`, '',
                    '**Player description**', '', s.description || '(unspecified)', '', '**Native effects**', '');
                for (const e of s.effects) lines.push('- ' + effectText(e));
                if (s.effects.length) lines.push('', '```json', JSON.stringify(s.effects.map(reward), null, 2), '```'); else lines.push('(none)');
                lines.push('', '**Technical implementation request (pending implementation)**', '', s.implementation || '(none)', '', '**Acceptance criteria / edge cases**', '', s.acceptance || '(unspecified)');
            }
        }
        lines.push('', '## Open checks', '', ...issues(plan).map(m => '- ' + m));
        if (!issues(plan).length) lines.push('No basic plan gaps found. Test combined requirements and exclusions during implementation.');
        lines.push('', '## Complete plan source', '', '<!-- SKILL_PLAN_JSON_START -->', '```json', JSON.stringify(plan, null, 2), '```', '<!-- SKILL_PLAN_JSON_END -->', '');
        return lines.join('\n');
    }
    return { VERSION, TARGET, attributes, operations, connectionTypes, clone, uid, tree, skill, createPlan, position, hexAt, moveSkill, connect, removeSkill, copySkill, isUneditedSkill, listSkills, reward, effectText, validate, issues, parse, document };
});
