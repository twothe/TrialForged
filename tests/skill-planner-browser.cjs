/** Real browser acceptance checks; run locally with an existing Playwright package, never a renderer substitute. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const M = require('../tools/skill-planner/model.js');

async function main() {
    if (!process.env.PLAYWRIGHT_MODULE) throw new Error('Set PLAYWRIGHT_MODULE to an existing Playwright package.');
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
    const out = path.resolve(__dirname, '../local/skill-planner-validation');
    await fs.mkdir(out, { recursive: true });
    const context = await chromium.launchPersistentContext(path.join(out, 'browser-profile'), {
        channel: 'msedge', headless: true, viewport: { width: 1366, height: 768 }, acceptDownloads: true, args: ['--disable-gpu']
    });
    try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
        const url = pathToFileURL(path.resolve(__dirname, '../tools/skill-planner/index.html')).href;
        const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('trialforged.skill-plan.v1')));
        const fill = async (id, value) => {
            await page.locator('#' + id).evaluate(element => {
                for (let parent = element.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
            });
            await page.locator('#' + id).fill(value);
        };
        const clickCell = async (q, r) => {
            const canvas = await page.locator('#canvas').boundingBox(), p = M.position(q, r);
            await page.mouse.click(canvas.x + canvas.width / 2 + p.x, canvas.y + canvas.height / 2 + p.y);
        };
        await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload();
        await page.locator('#firstSkill').click(); await fill('skillName', 'Accelerated'); await page.locator('#addEffect').click();
        await page.locator('#copySkill').click(); for (let q = 1; q <= 3; q++) await clickCell(q, 0);
        assert.equal(await page.locator('#nodes > g').count(), 4); assert.equal(await page.locator('#skillList button').count(), 1);
        await page.locator('#effects input').fill('10');
        let saved = await state(); assert.equal(saved.definitions.length, 1); assert.equal(saved.definitions[0].effects[0].amount, 10);
        assert.equal(M.instances(saved, 'Accelerated').length, 4);
        await page.locator('[data-mode="add"]').click(); await clickCell(0, 1); await fill('skillName', 'Precision');
        await fill('skillName', 'Accelerated');
        assert.equal(await page.locator('#skillName').getAttribute('aria-invalid'), 'true');
        await page.locator('#skillName').press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'skillName');
        await page.locator('#skillName').evaluate(element => element.blur());
        await page.waitForFunction(() => document.activeElement.id === 'skillName');
        await page.reload(); assert.equal(await page.locator('#skillName').inputValue(), 'Accelerated');
        assert.equal(await page.locator('#skillName').getAttribute('aria-invalid'), 'true');
        await fill('skillName', 'Precision');
        await page.locator('#iconFilter').fill('SWor');
        await page.locator('#iconPicker [data-icon="minecraft:iron_sword"]').click();
        assert.equal((await state()).definitions.find(d => d.name === 'Precision').icon, 'minecraft:iron_sword');
        assert.equal(await page.locator('#iconPopup').isVisible(), false);
        await fill('colorHex', '#AABBCC'); assert.equal(await page.locator('#color').inputValue(), '#aabbcc');
        await fill('description', 'Optional text'); await page.reload();
        assert.equal(await page.locator('#description').inputValue(), 'Optional text');
        await fill('cost', ''); await page.reload(); assert.equal(await page.locator('#cost').isVisible(), true);
        assert.equal(await page.locator('#cost').inputValue(), ''); await fill('cost', '1');
        await page.locator('[data-mode="select"]').click();
        const nodeId = (await state()).trees[0].skills[0].id;
        await page.locator('[data-skill="' + nodeId + '"]').click();
        await fill('skillName', 'Fleet'); assert.equal(M.instances(await state(), 'Fleet').length, 4);
        await page.locator('#undo').click(); assert.equal(M.instances(await state(), 'Accelerated').length, 4);
        await page.locator('#redo').click(); assert.equal(M.instances(await state(), 'Fleet').length, 4);
        saved = await state();
        const downloadPromise = page.waitForEvent('download'); await page.locator('#exportPlan').click();
        const file = path.join(out, 'browser-export.skillplan.md'); await (await downloadPromise).saveAs(file);
        assert.deepEqual(M.parse(await fs.readFile(file, 'utf8')), saved);
        const library = await page.locator('#skillList').boundingBox(); assert.ok(library.height >= 180, 'Desktop library must show several compact rows.');
        await page.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });
        await page.setViewportSize({ width: 780, height: 1000 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(out, 'narrow.png'), fullPage: true });
        assert.deepEqual(errors, []);
        await fs.writeFile(path.join(out, 'result.json'), JSON.stringify({ passed: true, source: url,
            checks: ['shared instances', 'duplicate-name focus lock', 'unfinished draft recovery', 'icon combo', 'shared rename undo', 'handoff export', 'library height', 'responsive overflow'], errors }, null, 2));
        console.log('Browser verification passed: ' + out);
    } finally { await context.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
