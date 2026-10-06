/** Real Edge/Chromium verification of the offline file workflow; outputs stay under ignored local/. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const M = require('../tools/skill-planner/model.js');

async function main() {
    const packagePath = process.env.PLAYWRIGHT_MODULE;
    if (!packagePath) throw new Error('Set PLAYWRIGHT_MODULE to an existing Playwright package; no installation is performed.');
    const { chromium } = require(packagePath);
    const out = path.resolve(__dirname, '../local/skill-planner-validation');
    await fs.mkdir(out, { recursive: true });
    const context = await chromium.launchPersistentContext(path.join(out, 'browser-profile'), { channel: 'msedge', headless: true, viewport: { width: 1500, height: 1000 }, acceptDownloads: true, args: ['--disable-gpu'] });
    try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('dialog', dialog => dialog.accept());
        const url = pathToFileURL(path.resolve(__dirname, '../tools/skill-planner/index.html')).href;
        await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
        await page.locator('#firstSkill').click();
        await page.locator('#skillName').fill('Abenteurer'); await page.locator('#description').fill('Der Beginn deiner Reise.');
        await page.locator('#implementation').fill('Bewusst keine Wirkung; Einstiegspunkt.'); await page.locator('#implementation').blur();
        assert.equal(await page.locator('#nodes > g').count(), 1);
        const rootId = await page.locator('#nodes > g').getAttribute('data-skill');
        await page.locator('[data-mode="add"]').click();
        const canvas = await page.locator('#canvas').boundingBox();
        await page.mouse.click(canvas.x + canvas.width / 2 + 90, canvas.y + canvas.height / 2);
        assert.equal(await page.locator('#nodes > g').count(), 2);
        await page.locator('#skillName').fill('Sprinter'); await page.locator('#description').fill('Du sprintest 5 % schneller.');
        await page.locator('#implementation').fill('Nach zehn Sekunden Sprinten Partikel anzeigen.'); await page.locator('#implementation').blur();
        await page.locator('#addEffect').click();
        const nextId = await page.locator('#nodes > g.selected').getAttribute('data-skill');
        await page.locator('#connectionType').selectOption('directed'); await page.locator('[data-mode="connect"]').click();
        await page.locator(`[data-skill="${rootId}"]`).click(); await page.locator(`[data-skill="${nextId}"]`).click();
        assert.equal(await page.locator('#edges > g').count(), 1);
        await page.locator('#undo').click(); assert.equal(await page.locator('#edges > g').count(), 0);
        await page.locator('#redo').click(); assert.equal(await page.locator('#edges > g').count(), 1);
        await page.locator('[data-mode="select"]').click(); await page.locator(`[data-skill="${nextId}"]`).click();
        const node = await page.locator(`[data-skill="${nextId}"]`).boundingBox();
        await page.mouse.move(node.x + node.width / 2, node.y + 30); await page.mouse.down();
        await page.mouse.move(node.x + node.width / 2 + 90, node.y + 30, { steps: 8 }); await page.mouse.up();
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('trialforged.skill-plan.v1')));
        assert.equal(saved.trees[0].skills.find(s => s.id === nextId).q, 2);
        assert.equal(saved.trees[0].skills.find(s => s.id === nextId).effects[0].amount, 5);
        const downloadPromise = page.waitForEvent('download'); await page.locator('#exportPlan').click();
        const download = await downloadPromise; const documentPath = path.join(out, 'browser-export.skillplan.md'); await download.saveAs(documentPath);
        assert.deepEqual(M.parse(await fs.readFile(documentPath, 'utf8')), saved);
        await page.reload(); assert.equal(await page.locator('#nodes > g').count(), 2);
        await page.locator('#fileInput').setInputFiles(documentPath);
        await page.waitForFunction(() => document.querySelector('#toast').textContent === 'Plan opened.');
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('trialforged.skill-plan.v1'))), saved);
        await page.locator('#skillList button').last().click();
        await page.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });
        await page.locator('#addTree').click(); assert.equal(await page.locator('#treeSelect option').count(), 2);
        await page.locator('#undo').click(); assert.equal(await page.locator('#treeSelect option').count(), 1);
        await page.locator('#checkPlan').click(); assert.ok(await page.locator('#report').isVisible()); await page.locator('#closeReport').click();
        // A malformed import must leave the current state intact.
        const before = await page.evaluate(() => localStorage.getItem('trialforged.skill-plan.v1'));
        await page.locator('#fileInput').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":99}') });
        await page.waitForFunction(() => document.querySelector('#toast').textContent.startsWith('Could not open plan'));
        assert.equal(await page.evaluate(() => localStorage.getItem('trialforged.skill-plan.v1')), before);
        // The reported selection regression: a plain click must reopen the inspector after deselection.
        await page.locator('[data-mode="select"]').click();
        const grid = await page.locator('#canvas').boundingBox();
        await page.mouse.click(grid.x + 30, grid.y + 30);
        assert.equal(await page.locator('#skillEditor').isVisible(), false);
        await page.locator(`[data-skill="${nextId}"]`).click();
        assert.equal(await page.locator('#skillEditor').isVisible(), true);
        // Reload immediately after typing, without blur: both valid and unfinished input must survive.
        await page.locator('#description').fill('Autosaved before blur');
        await page.reload(); assert.equal(await page.locator('#description').inputValue(), 'Autosaved before blur');
        await page.locator('#cost').fill('');
        await page.reload(); assert.equal(await page.locator('#cost').inputValue(), '');
        await page.locator('#cost').fill('1');
        await page.locator('#iconFilter').fill('diamond');
        await page.locator('#iconPicker').selectOption('minecraft:diamond');
        assert.equal(await page.locator('#iconPreview').isVisible(), true);
        await page.locator('#search').fill('no matching skill'); assert.equal(await page.locator('#skillList button').count(), 0);
        assert.equal(await page.locator('#skillListEmpty').textContent(), 'No skills match this filter.');
        await page.locator('#search').fill('');
        await page.setViewportSize({ width: 780, height: 1000 }); await page.screenshot({ path: path.join(out, 'narrow.png'), fullPage: true });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        await fs.writeFile(path.join(out, 'result.json'), JSON.stringify({ passed: true, browser: 'headless Microsoft Edge', source: url, checks: ['hex creation', 'descriptions and custom instructions', 'native 5% sprint', 'directed connection', 'undo/redo', 'drag snapping', 'Markdown download and reimport', 'reload persistence', 'multiple trees', 'validation dialog', 'invalid import preservation', 'narrow viewport'], errors }, null, 2));
        console.log('Browser verification passed. Evidence: ' + out);
    } finally { await context.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
