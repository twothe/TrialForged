/** Contract tests exercise the same model used by the offline browser application. */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../tools/skill-planner/model.js');

test('copy rejects occupied or invalid cells without changing the graph', () => {
    const { plan, t, next } = fixture(), before = M.clone(t);
    assert.throws(() => M.copySkill(plan, t, next.name, 0, 0), /occupied/);
    assert.throws(() => M.copySkill(plan, t, next.name, 0.5, 0), /coordinates/);
    assert.throws(() => M.copySkill(plan, t, next.name, 10001, 0), /coordinates/);
    assert.deepEqual(t, before);
    const copied = M.copySkill(plan, t, next.name, 2, 0);
    copied.effects[0].amount = 10;
    assert.equal(next.effects[0].amount, 10);
    assert.deepEqual(t.connections, before.connections);
});

test('default deletion distinguishes empty placeholders from content and connected nodes', () => {
    const t = M.tree(), s = M.skill(2, 3), other = M.skill(3, 3); s.root = true; t.skills.push(s, other);
    assert.equal(M.isUneditedSkill(t, s), true);
    s.description = 'Keep this text'; assert.equal(M.isUneditedSkill(t, s), false); s.description = '';
    M.connect(t, s.id, other.id, 'normal'); assert.equal(M.isUneditedSkill(t, s), false);
});

function fixture() {
    const plan = M.createPlan(), t = plan.trees[0];
    const start = M.addSkill(plan, t, 0, 0), next = M.addSkill(plan, t, 1, 0);
    Object.assign(start, { name: 'Einstieg', root: true, description: 'Beginne dein Abenteuer.', implementation: 'Bewusst keine Wirkung.' });
    Object.assign(next, { name: 'Sprinter', description: 'Du sprintest 5 % schneller.', implementation: 'Zusätzlich nach 10 Sekunden Sprinten einen Partikeleffekt anzeigen.', acceptance: 'Nach Rücksetzen verschwinden beide Wirkungen.', effects: [{ attribute: 'puffish_attributes:sprinting_speed', operation: 'add_multiplied_total', amount: 5 }] });
    M.connect(t, start.id, next.id, 'directed');
    plan.progression = 'Ein Punkt je Level.';
    return { plan, t, start, next };
}
test('JSON and Markdown roundtrips preserve custom instructions, IDs, targets and all graph state', () => {
    const { plan } = fixture();
    plan.notes = 'Mehrzeilig\n<!-- SKILL_PLAN_JSON_START -->\n```json\n{}\n```\n<!-- SKILL_PLAN_JSON_END -->';
    assert.deepEqual(M.parse(JSON.stringify(plan)), plan);
    assert.deepEqual(M.parse(M.document(plan)), plan);
    assert.match(M.document(plan), /pending implementation/);
    assert.match(M.document(plan), /Partikeleffekt/);
});
test('5 percent sprint is exported as the native 0.05 total modifier', () => {
    const { next } = fixture();
    assert.deepEqual(M.reward(next.effects[0]), { type: 'puffish_skills:attribute', data: { attribute: 'puffish_attributes:sprinting_speed', operation: 'add_multiplied_total', value: 0.05 } });
    assert.equal(M.reward({ attribute: 'minecraft:generic.max_health', operation: 'add_value', amount: 2 }).data.value, 2);
    assert.equal(M.reward({ attribute: 'puffish_attributes:sprinting_speed', operation: 'add_multiplied_base', amount: -5 }).data.value, -0.05);
});

test('player descriptions are optional in checks and handoff while missing technical effects still warn', () => {
    const { plan, start, next } = fixture();
    start.description = ''; next.description = '   '; next.name = '10% more experience';
    next.effects = [{ attribute: 'puffish_attributes:experience', operation: 'add_multiplied_total', amount: 10 }];
    assert.deepEqual(M.issues(plan), []);
    assert.doesNotMatch(M.document(plan), /description is missing/i);
    next.effects = []; next.implementation = '';
    assert.ok(M.issues(plan).some(message => message.includes('technical effect is missing')));
});
test('hex snapping preserves axial cells and mod positions remain deterministic', () => {
    for (let q = -15; q <= 15; q++) for (let r = -15; r <= 15; r++) {
        const p = M.position(q, r); assert.deepEqual(M.hexAt(p.x, p.y), { q, r });
    }
    assert.deepEqual(M.position(0, 0), { x: 0, y: 0 });
    assert.equal(Math.round(M.position(1, 0).x), 90);
});
test('duplicate cells and links are rejected and deleting a skill removes its links', () => {
    const { t, start, next } = fixture();
    assert.throws(() => M.moveSkill(t, next.id, 0, 0), /occupied/);
    assert.throws(() => M.connect(t, next.id, start.id, 'normal'), /already/);
    assert.throws(() => M.connect(t, start.id, start.id, 'normal'), /different/);
    M.removeSkill(t, start.id); assert.equal(t.connections.length, 0); assert.equal(t.skills.length, 1);
});
test('directed links and exclusions do not falsely make unreachable skills reachable', () => {
    const { plan, t, start, next } = fixture();
    assert.deepEqual(M.issues(plan), []);
    t.connections[0].from = next.id; t.connections[0].to = start.id;
    assert.ok(M.issues(plan).some(m => m.includes('not reachable')));
    t.connections[0].type = 'exclusive'; assert.ok(M.issues(plan).some(m => m.includes('not reachable')));
    t.connections[0].type = 'normal'; assert.deepEqual(M.issues(plan), []);
    next.requiredSkills = 2; assert.ok(M.issues(plan).some(m => m.includes('neighbors')));
});
test('skill list is alphabetic and filtering searches names and player descriptions', () => {
    const { plan, t, start, next } = fixture(); start.name = 'Zulu'; next.name = 'Alpha';
    assert.deepEqual(M.listSkills(M.resolveTree(plan, t)).map(s => s.name), ['Alpha', 'Zulu']);
    assert.deepEqual(t.skills.map(s => s.name), ['Zulu', 'Alpha']);
    assert.deepEqual(M.listSkills(M.resolveTree(plan, t), ' alpha ').map(s => s.name), ['Alpha']);
    assert.deepEqual(M.listSkills(M.resolveTree(plan, t), 'SPRINTEST').map(s => s.name), ['Alpha']);
    assert.deepEqual(M.listSkills(M.resolveTree(plan, t), 'no match'), []);
});
test('malformed imports fail before restoring state', () => {
    const mutations = [p => p.version = 99, p => p.trees = {}, p => p.trees[0].skills[0].q = .5,
        p => p.trees[0].skills[1].id = p.trees[0].skills[0].id,
        p => p.definitions[1].effects[0].attribute = 'unknown:attribute',
        p => p.definitions[1].effects[0].operation = '__proto__',
        p => p.trees[0].connections[0].to = 'missing', p => delete p.definitions[0].implementation,
        p => p.trees[0].skills[0].root = 'true', p => p.definitions[0].color = 'red',
        p => p.definitions[0].cost = -1, p => p.definitions[0].icon = '../book',
        p => p.definitions[1].name = p.definitions[0].name, p => p.trees[0].skills[0].name = 'Missing'];
    for (const mutate of mutations) { const { plan } = fixture(); mutate(plan); assert.throws(() => M.parse(JSON.stringify(plan))); }
});

test('shared content and names propagate across trees while placement, IDs and links remain independent', () => {
    const { plan, t, next } = fixture(), other = M.tree('Second'); other.category = 'trialforged:second'; plan.trees.push(other);
    const copy = M.copySkill(plan, other, next.name, -2, 3), originalId = next.id;
    copy.description = 'Shared text'; copy.cost = 3; copy.color = '#aabbcc'; copy.requiredPoints = 2;
    copy.effects[0].amount = 12; copy.icon = 'minecraft:feather'; copy.name = 'Accelerated';
    assert.equal(next.name, 'Accelerated'); assert.equal(next.effects[0].amount, 12); assert.equal(next.cost, 3);
    assert.equal(next.description, 'Shared text'); assert.equal(next.color, '#aabbcc'); assert.equal(next.requiredPoints, 2);
    assert.equal(next.icon, 'minecraft:feather'); assert.equal(next.id, originalId);
    assert.equal(copy.root, false); assert.equal(copy.q, -2); assert.equal(next.q, 1);
    assert.equal(t.connections[0].to, originalId); assert.equal(other.connections.length, 0);
    assert.equal(M.instances(plan, 'Accelerated').length, 2); M.validate(plan);
});

test('duplicate names cannot merge definitions and generated placeholders remain independent', () => {
    const { plan, start, next } = fixture(), before = M.clone(plan);
    assert.throws(() => { next.name = ' ' + start.name + ' '; }, /already exists/); assert.deepEqual(plan, before);
    assert.throws(() => { next.name = ''; }, /Enter a skill name/);
    const first = M.addSkill(plan, plan.trees[0], 2, 0), second = M.addSkill(plan, plan.trees[0], 3, 0);
    assert.equal(first.name, 'New skill'); assert.equal(second.name, 'New skill (2)');
    first.description = 'Independent'; assert.equal(second.description, '');
});

test('future instances use latest content and deleting one leaves the remaining shared definition', () => {
    const { plan, t, next } = fixture(); const copy = M.copySkill(plan, t, next.name, 2, 0);
    copy.effects[0].amount = 25; const newest = M.copySkill(plan, t, next.name, 3, 0);
    assert.equal(newest.effects[0].amount, 25);
    M.deleteInstance(plan, t, next.id); assert.equal(copy.effects[0].amount, 25); assert.equal(t.connections.length, 0);
    M.deleteInstance(plan, t, copy.id); assert.equal(M.instances(plan, newest.name).length, 1);
    M.deleteInstance(plan, t, newest.id); assert.equal(plan.definitions.length, 1); M.validate(plan);
});

test('legacy migration joins identical names and preserves conflicting content, IDs, coordinates and raw source', () => {
    const { plan } = fixture(), legacy = { ...M.clone(plan), version: 1, trees: plan.trees.map(t => M.clone(M.resolveTree(plan, t))) }; delete legacy.definitions;
    const original = legacy.trees[0].skills[1];
    legacy.trees[0].skills.push({ ...M.clone(original), id: 'copy_1', q: 2, root: true });
    const conflict = { ...M.clone(original), id: 'variant_1', q: 3 }; conflict.effects[0].amount = 20; legacy.trees[0].skills.push(conflict);
    const before = M.clone(legacy), upgraded = M.parse(JSON.stringify(legacy));
    assert.deepEqual(legacy, before); assert.equal(upgraded.version, 2); assert.equal(upgraded.definitions.length, 3);
    assert.equal(upgraded.trees[0].skills[2].name, original.name); assert.equal(upgraded.trees[0].skills[3].name, 'Sprinter (2)');
    assert.equal(M.definition(upgraded, 'Sprinter (2)').effects[0].amount, 20);
    assert.equal(upgraded.trees[0].skills[2].root, true); assert.equal(upgraded.trees[0].skills[3].q, 3);
    assert.deepEqual(upgraded.trees[0].connections, legacy.trees[0].connections);
    assert.ok(upgraded.migrationNotes.length); assert.deepEqual(M.parse(M.document(upgraded)), upgraded);
});

test('shared content warnings appear once while instance graph warnings identify their node', () => {
    const { plan, t, next } = fixture(); next.effects = []; next.implementation = '';
    const copy = M.copySkill(plan, t, next.name, 2, 0), messages = M.issues(plan);
    assert.equal(messages.filter(message => message.includes('technical effect is missing')).length, 1);
    assert.ok(messages.some(message => message.includes(copy.id) && message.includes('not reachable')));
});

test('placeholder copies stay independent until renamed, while meaningful names continue sharing', () => {
    const plan = M.createPlan(), t = plan.trees[0], original = M.addSkill(plan, t, 0, 0);
    original.effects.push({ attribute: 'puffish_attributes:sprinting_speed', operation: 'add_multiplied_total', amount: 5 });
    const copied = M.copySkill(plan, t, original.name, 1, 0);
    assert.equal(copied.name, 'New skill (2)'); copied.effects[0].amount = 10;
    assert.equal(original.effects[0].amount, 5); copied.name = 'Accelerated';
    const shared = M.copySkill(plan, t, copied.name, 2, 0); shared.effects[0].amount = 15;
    assert.equal(copied.effects[0].amount, 15); assert.equal(original.effects[0].amount, 5);
    assert.deepEqual(M.parse(M.document(plan)), plan);
});

test('entering a reserved placeholder name is allowed and detaches only the selected named instance', () => {
    const { plan, t, next } = fixture(), copy = M.copySkill(plan, t, next.name, 2, 0);
    const draft = M.addSkill(plan, t, 3, 0), before = next.id;
    copy.name = 'New Skill'; assert.equal(copy.name, 'New skill (2)'); assert.equal(next.name, 'Sprinter');
    copy.effects[0].amount = 20; assert.equal(next.effects[0].amount, 5); assert.equal(next.id, before);
    assert.equal(draft.name, 'New skill'); M.validate(plan);
});

test('old shared placeholders separate on import without changing IDs, content, roots or connections', () => {
    const plan = M.createPlan(), t = plan.trees[0], original = M.addSkill(plan, t, 0, 0);
    t.skills.push({ id: 'old_draft_copy', name: original.name, q: 1, r: 0, root: false });
    M.connect(t, original.id, 'old_draft_copy', 'normal');
    assert.throws(() => M.validate(plan), /independent/);
    const upgraded = M.parse(JSON.stringify(plan)); assert.equal(upgraded.definitions.length, 2);
    assert.equal(upgraded.trees[0].skills[1].id, 'old_draft_copy');
    assert.deepEqual(upgraded.trees[0].connections, t.connections);
    const legacy = { ...plan, version: 1, trees: [M.clone(M.resolveTree(plan, t))] }; delete legacy.definitions;
    assert.equal(M.parse(JSON.stringify(legacy)).definitions.length, 2);
    assert.ok(M.isPlaceholderName(' New Skill ')); assert.ok(M.isPlaceholderName('New skill (2)'));
});
