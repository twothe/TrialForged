/** Contract tests exercise the same model used by the offline browser application. */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../tools/skill-planner/model.js');

test('copy rejects occupied or invalid cells without changing the graph', () => {
    const { t, next } = fixture(), before = M.clone(t);
    assert.throws(() => M.copySkill(t, next, 0, 0), /occupied/);
    assert.throws(() => M.copySkill(t, next, 0.5, 0), /coordinates/);
    assert.throws(() => M.copySkill(t, next, 10001, 0), /coordinates/);
    assert.deepEqual(t, before);
    const copied = M.copySkill(t, next, 2, 0);
    copied.effects[0].amount = 10;
    assert.equal(next.effects[0].amount, 5);
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
    const start = M.skill(0, 0), next = M.skill(1, 0);
    Object.assign(start, { name: 'Einstieg', root: true, description: 'Beginne dein Abenteuer.', implementation: 'Bewusst keine Wirkung.' });
    Object.assign(next, { name: 'Sprinter', description: 'Du sprintest 5 % schneller.', implementation: 'Zusätzlich nach 10 Sekunden Sprinten einen Partikeleffekt anzeigen.', acceptance: 'Nach Rücksetzen verschwinden beide Wirkungen.', effects: [{ attribute: 'puffish_attributes:sprinting_speed', operation: 'add_multiplied_total', amount: 5 }] });
    t.skills.push(start, next); M.connect(t, start.id, next.id, 'directed');
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
    const { t, start, next } = fixture(); start.name = 'Zulu'; next.name = 'Alpha';
    assert.deepEqual(M.listSkills(t).map(s => s.name), ['Alpha', 'Zulu']);
    assert.deepEqual(t.skills.map(s => s.name), ['Zulu', 'Alpha']);
    assert.deepEqual(M.listSkills(t, ' alpha ').map(s => s.name), ['Alpha']);
    assert.deepEqual(M.listSkills(t, 'SPRINTEST').map(s => s.name), ['Alpha']);
    assert.deepEqual(M.listSkills(t, 'no match'), []);
});
test('malformed imports fail before restoring state', () => {
    const mutations = [p => p.version = 99, p => p.trees = {}, p => p.trees[0].skills[0].q = .5,
        p => p.trees[0].skills[1].id = p.trees[0].skills[0].id,
        p => p.trees[0].skills[1].effects[0].attribute = 'unknown:attribute',
        p => p.trees[0].skills[1].effects[0].operation = '__proto__',
        p => p.trees[0].connections[0].to = 'missing', p => delete p.trees[0].skills[0].implementation,
        p => p.trees[0].skills[0].root = 'true', p => p.trees[0].skills[0].color = 'red',
        p => p.trees[0].skills[0].cost = -1, p => p.trees[0].skills[0].icon = '../book'];
    for (const mutate of mutations) { const { plan } = fixture(); mutate(plan); assert.throws(() => M.parse(JSON.stringify(plan))); }
});
