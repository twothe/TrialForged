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
