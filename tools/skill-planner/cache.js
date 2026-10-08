/** Recoverable browser draft storage; keeps valid plan data and unfinished form input separately. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
    else root.SkillDraftCache = factory(root.SkillPlan);
})(globalThis, function (model) {
    'use strict';
    const KEY = 'trialforged.skill-plan.v1';
    /** Migrate the valid model without replacing raw unfinished edits or selection IDs. */
    function upgradeSnapshot(input) {
        const snapshot = model.clone(input), previous = snapshot.plan;
        snapshot.plan = model.upgrade(previous);
        if (snapshot.selection && snapshot.raw?.skillName && !snapshot.raw.skillName.invalid) {
            const oldNode = previous.trees.flatMap(t => t.skills).find(s => s.id === snapshot.selection);
            const node = snapshot.plan.trees.flatMap(t => t.skills).find(s => s.id === snapshot.selection);
            if (oldNode && node && snapshot.raw.skillName.value.trim() === oldNode.name.trim()) snapshot.raw.skillName.value = node.name;
        }
        return validate(snapshot);
    }
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
                try {
                    const previous = JSON.parse(current); upgradeSnapshot(previous);
                    if (previous.plan.version === 1) storage.setItem(KEY + '.v1-backup', current);
                    storage.setItem(KEY + '.backup', current);
                }
                catch (error) { if (!(error instanceof SyntaxError) && !error.message.startsWith('Invalid')) throw error; }
            }
            storage.setItem(KEY + '.draft', JSON.stringify(snapshot));
            const legacy = storage.getItem(KEY);
            let legacyPlan;
            if (legacy) { try { legacyPlan = JSON.parse(legacy); } catch (error) { console.error('Legacy plan backup unavailable', error); } }
            if (legacyPlan?.version === 1) storage.setItem(KEY + '.v1-plan-backup', legacy);
            // Keep the established key so current users retain their browser draft.
            storage.setItem(KEY, JSON.stringify(snapshot.plan));
        }
        function read() {
            const failures = [];
            for (const key of [KEY + '.draft', KEY, KEY + '.backup', KEY + '.v1-backup', KEY + '.v1-plan-backup']) {
                try {
                    const saved = storage.getItem(key); if (!saved) continue;
                    if (key === KEY || key === KEY + '.v1-plan-backup') return { plan: model.parse(saved), recovered: failures.length > 0, failures };
                    return { snapshot: upgradeSnapshot(JSON.parse(saved)), recovered: failures.length > 0, failures };
                } catch (error) { failures.push({ key, message: error.message }); }
            }
            return { failures };
        }
        return { write, read };
    }
    return { KEY, create, validate };
});
