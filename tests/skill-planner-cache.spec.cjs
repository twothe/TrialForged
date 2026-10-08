/** Draft-storage boundary tests use the production cache with a minimal Web Storage dependency fake. */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../tools/skill-planner/model.js');
const C = require('../tools/skill-planner/cache.js');
function storage() {
    const values = new Map();
    return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
function draft() {
    const plan = M.createPlan();
    return { version: 1, plan, treeId: plan.trees[0].id, selection: null, view: { x: 0, y: 0, zoom: 1 }, query: '', raw: { category: { value: 'unfinished:', invalid: true } }, effects: [] };
}
test('unfinished input roundtrips separately from validated plan data', () => {
    const store = storage(), cache = C.create(store), snapshot = draft();
    cache.write(snapshot);
    assert.deepEqual(cache.read().snapshot, snapshot);
    assert.deepEqual(M.parse(store.getItem(C.KEY)), snapshot.plan);
});
test('existing original editor cache loads without changing IDs or player text', () => {
    const store = storage(), plan = M.createPlan(); plan.name = 'Mein alter Plan';
    store.setItem(C.KEY, JSON.stringify(plan));
    assert.deepEqual(C.create(store).read().plan, plan);
});
test('corrupt primary cache falls back to legacy copy, then to last valid draft backup', () => {
    const store = storage(), cache = C.create(store), first = draft(); cache.write(first);
    const second = M.clone(first); second.plan.name = 'Second'; cache.write(second);
    store.setItem(C.KEY + '.draft', '{broken');
    assert.deepEqual(cache.read().plan, second.plan);
    store.setItem(C.KEY, '{broken');
    assert.deepEqual(cache.read().snapshot, first);
    assert.equal(cache.read().recovered, true);
});
test('failed backup write does not destroy the primary snapshot', () => {
    const store = storage(), cache = C.create(store), first = draft(); cache.write(first);
    const before = store.getItem(C.KEY + '.draft');
    store.setItem = () => { throw new Error('Quota exceeded'); };
    assert.throws(() => cache.write(first), /Quota/);
    assert.equal(store.getItem(C.KEY + '.draft'), before);
});

test('legacy drafts migrate without losing unfinished fields and retain original backups before write', () => {
    const store = storage(), cache = C.create(store), snapshot = draft(), t = snapshot.plan.trees[0];
    const node = M.addSkill(snapshot.plan, t, 0, 0); node.name = 'Accelerated';
    const legacy = { ...snapshot.plan, version: 1, trees: snapshot.plan.trees.map(tree => M.clone(M.resolveTree(snapshot.plan, tree))) }; delete legacy.definitions;
    snapshot.plan = legacy; snapshot.selection = node.id; snapshot.raw.skillName = { value: 'Accelerated', invalid: false };
    snapshot.raw.colorHex = { value: '#12', invalid: true };
    const original = JSON.stringify(snapshot); store.setItem(C.KEY + '.draft', original); store.setItem(C.KEY, JSON.stringify(legacy));
    const migrated = cache.read().snapshot;
    assert.equal(migrated.plan.version, 2); assert.equal(migrated.selection, node.id); assert.deepEqual(migrated.raw, snapshot.raw);
    assert.equal(store.getItem(C.KEY + '.draft'), original);
    cache.write(migrated); assert.equal(store.getItem(C.KEY + '.v1-backup'), original);
    assert.deepEqual(JSON.parse(store.getItem(C.KEY + '.v1-plan-backup')), legacy);
});

test('failed migration backup prevents replacing the original legacy draft', () => {
    const store = storage(), snapshot = draft(); snapshot.plan.version = 1; delete snapshot.plan.definitions;
    const original = JSON.stringify(snapshot); store.setItem(C.KEY + '.draft', original);
    const cache = C.create(store), migrated = cache.read().snapshot;
    store.setItem = () => { throw new Error('Quota exceeded'); };
    assert.throws(() => cache.write(migrated), /Quota/); assert.equal(store.getItem(C.KEY + '.draft'), original);
});

test('legacy migration backup remains a last-resort recovery source', () => {
    const store = storage(), snapshot = draft(); snapshot.plan.version = 1; delete snapshot.plan.definitions;
    store.setItem(C.KEY + '.v1-backup', JSON.stringify(snapshot));
    for (const suffix of ['', '.draft', '.backup']) store.setItem(C.KEY + suffix, '{broken');
    const recovered = C.create(store).read();
    assert.equal(recovered.recovered, true); assert.equal(recovered.snapshot.plan.version, 2);
    assert.deepEqual(recovered.snapshot.raw, snapshot.raw);
});

test('shared version-two placeholders split while selection and unfinished edits remain intact', () => {
    const store = storage(), snapshot = draft(), t = snapshot.plan.trees[0];
    const original = M.addSkill(snapshot.plan, t, 0, 0);
    t.skills.push({ id: 'old_shared_draft', name: original.name, q: 1, r: 0, root: false });
    snapshot.selection = 'old_shared_draft'; snapshot.raw.skillName = { value: 'New skill', invalid: false };
    snapshot.raw.cost = { value: '', invalid: true };
    store.setItem(C.KEY + '.draft', JSON.stringify(snapshot));
    const migrated = C.create(store).read().snapshot;
    assert.equal(migrated.selection, 'old_shared_draft'); assert.equal(migrated.plan.definitions.length, 2);
    assert.equal(migrated.raw.skillName.value, 'New skill (2)'); assert.deepEqual(migrated.raw.cost, snapshot.raw.cost);
});
