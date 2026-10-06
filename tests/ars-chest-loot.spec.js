/** Native Rhino preflight: observes production registration without simulating loot generation. */
var arsTableHandler
var arsModifierHandler
var arsSelection
var arsEntries = []
var arsPoolEntries = []
var arsPoolChance
var console = { info: function() {}, error: function() {} }
var JsonIO = { readString: function() {
  return '{"genericChestTables":["minecraft:chests/simple_dungeon","sample.mod:chests/general"]}'
} }
var LootJS = {
  lootTables: function(handler) { arsTableHandler = handler },
  modifiers: function(handler) { arsModifierHandler = handler }
}
var LootEntry = { of: function(id) {
  return { id: id, randomChance: function(chance) { this.chance = chance; return this } }
} }
function runArsChestTests() {
  function check(condition, label) { if (!condition) throw new Error(label) }
  arsTableHandler({ hasLootTable: function() { return true } })
  let missingFailed = false
  try { arsTableHandler({ hasLootTable: function() { return false } }) } catch (error) { missingFailed = true }
  check(missingFailed, 'Missing configured table must fail registration')
  arsModifierHandler({ addTableModifier: function(selection) {
    arsSelection = selection
    return {
      name: function() { return this },
      addLoot: function(entry) { arsEntries.push(entry); return this },
      pool: function(handler) {
        handler({
          rolls: function(value) { check(value === 1, 'One essence pool roll'); return this },
          bonusRolls: function(value) { check(value === 0, 'No luck bonus rolls'); return this },
          when: function(conditionHandler) { conditionHandler({ randomChance: function(value) { arsPoolChance = value } }); return this },
          addEntry: function(entry) { arsPoolEntries.push(entry); return this }
        })
      }
    }
  } })
  check(arsSelection.test('minecraft:chests/simple_dungeon'), 'Generic table selected')
  check(arsSelection.test('sample.mod:chests/general'), 'Literal namespace dot selected')
  for (let id of ['sampleXmod:chests/general', 'ars_additions:chests/arcane_library',
    'twilightforest:darktower_boss', 'lootintegrations:chests/easy', 'prefixminecraft:chests/simple_dungeon']) {
    check(!arsSelection.test(id), 'Special/unlisted table excluded: ' + id)
  }
  check(arsEntries.length === 3, 'Three independent Codex entries')
  check(arsEntries[0].id === 'ars_additions:codex_entry' && arsEntries[0].chance === 0.10, '10% Codex')
  check(arsEntries[1].id === 'ars_additions:lost_codex_entry' && arsEntries[1].chance === 0.04, '4% Lost Codex')
  check(arsEntries[2].id === 'ars_additions:ancient_codex_entry' && arsEntries[2].chance === 0.01, '1% Ancient Codex')
  check(arsPoolChance === 0.20 && arsPoolEntries.length === 7, '20% pool with seven essences')
  const expected = ['ars_nouveau:air_essence', 'ars_nouveau:earth_essence', 'ars_nouveau:fire_essence',
    'ars_nouveau:water_essence', 'ars_nouveau:abjuration_essence', 'ars_nouveau:conjuration_essence',
    'ars_nouveau:manipulation_essence']
  check(JSON.stringify(arsPoolEntries.map(entry => entry.id)) === JSON.stringify(expected), 'Exact essence IDs')
  return 12
}
