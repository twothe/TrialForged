/**
 * Adds independent Ars progression bonuses to explicitly approved generic chests.
 * Global modifiers run for the queried table, not each referenced pool. Loot
 * Integrations may sample an approved table and redistribute or trim its loot;
 * configured roll chances are deliberately not final chest-frequency guarantees.
 * Special tables are excluded; existing contents and native modifiers stay intact.
 */
;(() => {
  let tables
  try {
    let settings = JSON.parse(String(JsonIO.readString('kubejs/config/ars_chest_loot.json')))
    tables = settings.genericChestTables
    if (!Array.isArray(tables) || tables.length === 0) {
      throw new Error('genericChestTables must be a nonempty array')
    }
    let seen = {}
    for (let id of tables) {
      if (typeof id !== 'string' || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id) || seen[id]) {
        throw new Error('Invalid or duplicate chest table ID: ' + id)
      }
      seen[id] = true
    }
  } catch (error) {
    console.error('[Trialforged Ars loot] Configuration failed: ' + error)
    throw error
  }
  // IDs are validated above; dot is the only allowed regular-expression metacharacter.
  const selection = new RegExp('^(?:' + tables.map(id => id.replace(/\./g, '\\.')).join('|') + ')$')
  LootJS.lootTables(event => {
    for (let id of tables) {
      if (!event.hasLootTable(id)) {
        console.error('[Trialforged Ars loot] Missing configured chest table: ' + id)
        throw new Error('Missing configured chest table: ' + id)
      }
    }
  })
  LootJS.modifiers(event => {
    const modifier = event.addTableModifier(selection).name('Trialforged generic chest Ars bonuses')
    modifier.addLoot(LootEntry.of('ars_additions:codex_entry').randomChance(0.10))
    modifier.addLoot(LootEntry.of('ars_additions:lost_codex_entry').randomChance(0.04))
    modifier.addLoot(LootEntry.of('ars_additions:ancient_codex_entry').randomChance(0.01))
    modifier.pool(pool => {
      pool.rolls(1).bonusRolls(0).when(conditions => conditions.randomChance(0.20))
      for (let essence of ['air', 'earth', 'fire', 'water', 'abjuration', 'conjuration', 'manipulation']) {
        pool.addEntry(LootEntry.of('ars_nouveau:' + essence + '_essence'))
      }
    })
    console.info('[Trialforged Ars loot] Registered ' + tables.length + ' generic chest tables.')
  })
})()
