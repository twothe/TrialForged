/** Runs production handlers and checks agreement between native filtering and cleanup. */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const scope = vm.createContext({})
for (const file of ['tests/level-loot.spec.js', 'kubejs/server_scripts/dynamic_difficulty_integration.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file })
}
const count = vm.runInContext('runLevelLootTests()', scope)
for (const change of [
  'levelLootConfig.chanceDivisor = 0',
  'levelLootConfig.chanceDivisor = Infinity',
  'levelLootConfig.bosses = []',
  "levelLootConfig.bosses = ['invalid']",
  "levelLootConfig.lootSources = ['minecraft:chests/a', 'minecraft:chests/a']",
  'levelLootConfig.lootSources = null'
]) {
  const invalid = vm.createContext({})
  vm.runInContext(fs.readFileSync(path.join(root, 'tests/level-loot.spec.js'), 'utf8'), invalid)
  vm.runInContext(change, invalid)
  assert.throws(() => vm.runInContext(fs.readFileSync(path.join(root, 'kubejs/server_scripts/dynamic_difficulty_integration.js'), 'utf8'), invalid))
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'kubejs/config/trialforged_leveling.json'), 'utf8'))
const sync = fs.readFileSync(path.join(root, 'config/dynamic_difficulty/sync.toml'), 'utf8')
const blacklist = JSON.parse(sync.match(/blacklistedMobs\s*=\s*(\[[\s\S]*?\])/)[1])
assert.deepEqual(blacklist, config.bosses)
assert.equal(config.chanceDivisor, 1000)
assert.match(sync, /^enableLevelBasedDrops = false$/m)
assert.ok(!blacklist.includes('minecraft:wither_skeleton'))
assert.equal(new Set(config.bosses).size, config.bosses.length)
assert.equal(new Set(config.lootSources).size, config.lootSources.length)
for (const id of config.lootSources) assert.ok(!/boss|reward|vault|ominous|trial|event/.test(id))
console.log(`PASS: ${count} production integration checks, 6 invalid configurations, ${config.bosses.length} matching boss exclusions, ${config.lootSources.length} curated chest sources.`)
