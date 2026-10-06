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
  'levelLootConfig.lootSources = null',
  "levelLootConfig.excludedDimensions = ['elsebase:backdoor', 'elsebase:backdoor']"
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
assert.deepEqual(config.excludedDimensions, ['elsebase:backdoor'])
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'kubejs/data/minecraft/leveling_settings/dimensions/the_nether.json'), 'utf8')),
  { starting_level: 30, max_level: 50 })
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'kubejs/data/minecraft/leveling_settings/dimensions/the_end.json'), 'utf8')),
  { starting_level: 80, max_level: 100, random_level_bonus: 5 })
const elsebase = JSON.parse(fs.readFileSync(path.join(root, 'kubejs/data/elsebase/leveling_settings/dimensions/backdoor.json'), 'utf8'))
assert.equal(elsebase.starting_level, 1)
assert.equal(elsebase.max_level, 1)
assert.deepEqual(elsebase.attribute_modifiers, [])
assert.deepEqual(elsebase.apply_level_bonuses, { biome: false, structure: false, player: false })
for (const field of ['levels_per_distance', 'levels_per_deepness', 'levels_per_height', 'levels_per_day',
  'levels_per_local_difficulty', 'random_level_bonus', 'player_level_multiplier']) assert.equal(elsebase[field], 0)
assert.match(sync, /^enableLevelBasedDrops = false$/m)
assert.ok(!blacklist.includes('minecraft:wither_skeleton'))
assert.equal(new Set(config.bosses).size, config.bosses.length)
assert.equal(new Set(config.lootSources).size, config.lootSources.length)
for (const id of config.lootSources) assert.ok(!/boss|reward|vault|ominous|trial|event/.test(id))
console.log(`PASS: ${count} production integration checks, 7 invalid configurations, ${config.bosses.length} matching boss exclusions, Elsebase native profile, ${config.lootSources.length} curated chest sources.`)
