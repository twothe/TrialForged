/** Recoverable browser draft storage; keeps valid plan data and unfinished form input separately. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
    else root.SkillDraftCache = factory(root.SkillPlan);
})(globalThis, function (model) {
    'use strict';
    const KEY = 'trialforged.skill-plan.v1';
    function validate(snapshot) {
        model.validate(snapshot.plan);
        if (snapshot.version !== 1 || !snapshot.raw || typeof snapshot.raw !== 'object' || Array.isArray(snapshot.raw)) throw new Error('Invalid draft snapshot.');
        for (const value of Object.values(snapshot.raw)) {
            if (!value || typeof value.value !== 'string' || value.value.length > 100000 || typeof value.invalid !== 'boolean') throw new Error('Invalid draft field.');
        }
        if (!Array.isArray(snapshot.effects) || snapshot.effects.length > 100) throw new Error('Invalid draft effects.');
        for (const effect of snapshot.effects) {
            if (typeof effect.amount !== 'string' || effect.amount.length > 100 || typeof effect.invalid !== 'boolean') throw new Error('Invalid draft effect amount.');
        }
        if (typeof snapshot.query !== 'string' || snapshot.query.length > 100000) throw new Error('Invalid search query.');
        if (!snapshot.view || !['x', 'y', 'zoom'].every(key => Number.isFinite(snapshot.view[key])) || Math.abs(snapshot.view.x) > 100000000 || Math.abs(snapshot.view.y) > 100000000 || snapshot.view.zoom < .35 || snapshot.view.zoom > 2.5) throw new Error('Invalid draft view.');
        if (!snapshot.plan.trees.some(tree => tree.id === snapshot.treeId)) throw new Error('Invalid selected tree.');
        return snapshot;
    }
    function create(storage) {
        function write(snapshot) {
            validate(snapshot);
            const current = storage.getItem(KEY + '.draft');
            if (current) {
                try { validate(JSON.parse(current)); storage.setItem(KEY + '.backup', current); }
                catch (error) { if (!(error instanceof SyntaxError) && !error.message.startsWith('Invalid')) throw error; }
            }
            storage.setItem(KEY + '.draft', JSON.stringify(snapshot));
            // Keep the original storage key readable by earlier editor versions.
            storage.setItem(KEY, JSON.stringify(snapshot.plan));
        }
        function read() {
            const failures = [];
            for (const key of [KEY + '.draft', KEY, KEY + '.backup']) {
                try {
                    const saved = storage.getItem(key); if (!saved) continue;
                    if (key === KEY) return { plan: model.parse(saved), recovered: failures.length > 0, failures };
                    return { snapshot: model.clone(validate(JSON.parse(saved))), recovered: failures.length > 0, failures };
                } catch (error) { failures.push({ key, message: error.message }); }
            }
            return { failures };
        }
        return { write, read };
    }
    return { KEY, create, validate };
});
