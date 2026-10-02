/** Checks the production boss script and the three scoped mod exclusions. */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const scope = vm.createContext({})
for (const file of ['tests/vanilla-boss-profiles.spec.js', 'kubejs/server_scripts/vanilla_boss_profiles.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file })
}
const passed = vm.runInContext('runBossProfileTests()', scope)
const infernal = JSON.parse(fs.readFileSync(path.join(root, 'config/infernalmobs.cfg'), 'utf8'))
for (const name of ['WitherBoss', 'EnderDragon', 'Warden']) {
  assert.equal(infernal.permittedentities[name], false)
  assert.equal(infernal.entitiesalwaysinfernal[name], false)
}
for (const name of ['MM_Bulwark', 'MM_Fiery', 'MM_Gravity']) assert.equal(infernal.modsEnabled[name], true)
const leveling = fs.readFileSync(path.join(root, 'config/dynamic_difficulty/sync.toml'), 'utf8')
const blacklist = JSON.parse(leveling.match(/blacklistedMobs\s*=\s*(\[[\s\S]*?\])/)[1])
for (const id of ['minecraft:wither', 'minecraft:ender_dragon', 'minecraft:warden']) {
  assert.ok(blacklist.includes(id))
}
assert.ok(!blacklist.includes('minecraft:wither_skeleton'))
console.log(`PASS: ${passed} production boss scenarios, scoped Infernal and Dynamic Difficulty exclusions.`)
