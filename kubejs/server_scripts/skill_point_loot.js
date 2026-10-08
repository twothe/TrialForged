/** One independent 1% token roll per approved dungeon table query, including the existing mob chest-loot path. */
;(() => {
  let settings = JSON.parse(String(JsonIO.readString('kubejs/config/trialforged_leveling.json')))
  let tables = settings.lootSources
  if (!Array.isArray(tables) || !tables.length || new Set(tables).size !== tables.length
    || tables.some(id => typeof id !== 'string' || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id))) {
    console.error('[Trialforged skills loot] Invalid dungeon table selection')
    throw new Error('Invalid dungeon table selection')
  }
  let selection = new RegExp('^(?:' + tables.map(id => id.replace(/\./g, '\\.')).join('|') + ')$')
  LootJS.lootTables(event => {
    for (let id of tables) {
      if (!event.hasLootTable(id)) throw new Error('Missing skill-point dungeon table: ' + id)
    }
  })
  LootJS.modifiers(event => {
    event.addTableModifier(selection).name('Trialforged dungeon skill points')
      .addLoot(LootEntry.of('kubejs:skill_point').randomChance(0.01))
    console.info('[Trialforged skills loot] Registered 1% token roll for ' + tables.length + ' dungeon tables.')
  })
})()
