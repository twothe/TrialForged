/** Tests the production Ars modifier with native LootJS, then real modded loot tables. Test instance only. */
let runtimeArsCapture = false
let runtimeArsCapturedLoot = null
// Java collection arguments can be copied during KubeJS conversion. Observe the
// actual native bucket after production modifiers instead of the caller's list.
LootJS.modifiers(event => {
  event.addTableModifier(/.*/).customAction((context, bucket) => {
    if (!runtimeArsCapture) return
    let counts = {}
    for (let index = 0; index < bucket.size(); index++) {
      let stack = bucket.get(index)
      let id = String(stack.id)
      counts[id] = (counts[id] || 0) + stack.getCount()
    }
    runtimeArsCapturedLoot = counts
  })
})
function runtimeCheckArsChestLoot(player) {
  const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  const ResourceKey = Java.loadClass('net.minecraft.resources.ResourceKey')
  const RegistryKeys = Java.loadClass('net.minecraft.core.registries.Registries')
  const ParamsBuilder = Java.loadClass('net.minecraft.world.level.storage.loot.LootParams$Builder')
  const ContextBuilder = Java.loadClass('net.minecraft.world.level.storage.loot.LootContext$Builder')
  const Params = Java.loadClass('net.minecraft.world.level.storage.loot.parameters.LootContextParams')
  const ParamSets = Java.loadClass('net.minecraft.world.level.storage.loot.parameters.LootContextParamSets')
  const RandomSource = Java.loadClass('net.minecraft.util.RandomSource')
  const Optional = Java.loadClass('java.util.Optional')
  const ArrayList = Java.loadClass('java.util.ArrayList')
  const Modifications = Java.loadClass('com.almostreliable.lootjs.LootModificationsAPI')
  const targets = ['ars_additions:codex_entry', 'ars_additions:lost_codex_entry', 'ars_additions:ancient_codex_entry']
  const essences = ['air', 'earth', 'fire', 'water', 'abjuration', 'conjuration', 'manipulation']
    .map(name => 'ars_nouveau:' + name + '_essence')
  const settings = JSON.parse(String(JsonIO.readString('kubejs/config/ars_chest_loot.json')))
  const holder = player.server.reloadableRegistries()
  const registry = holder.get().registry(RegistryKeys.LOOT_TABLE).get()
  for (let id of settings.genericChestTables) {
    runtimeAssert(registry.containsKey(ResourceLocation.parse(id)), 'generic Ars chest table exists: ' + id)
  }
  function params(luck) {
    return new ParamsBuilder(player.level).withParameter(Params.ORIGIN, player.position())
      .withOptionalParameter(Params.THIS_ENTITY, player).withLuck(luck).create(ParamSets.CHEST)
  }
  const random = RandomSource.create(746291)
  function context(id, luck) {
    return new ContextBuilder(params(luck)).withOptionalRandomSource(random)
      .withQueriedLootTableId(ResourceLocation.parse(id)).create(Optional.empty())
  }
  function count(items) {
    let result = {}
    for (let index = 0; index < items.size(); index++) {
      let stack = items.get(index)
      let id = String(stack.id)
      result[id] = (result[id] || 0) + stack.getCount()
    }
    return result
  }
  const iterations = 20000
  const totals = [0, 0, 0, 0]
  const essenceTotals = {}
  runtimeArsCapture = true
  for (let iteration = 0; iteration < iterations; iteration++) {
    let items = new ArrayList()
    items.add(Item.of('minecraft:diamond', 3))
    // Invoke the actual native production modifier, without Loot Integrations sampling/trimming.
    runtimeArsCapturedLoot = null
    Modifications.invokeActions(items, context('minecraft:chests/simple_dungeon', iteration % 2 === 0 ? 0 : 100))
    let counts = runtimeArsCapturedLoot
    if (counts == null) throw new Error('Native LootJS bucket observer did not run')
    if (counts['minecraft:diamond'] !== 3) throw new Error('Ars modifier changed existing loot')
    for (let index = 0; index < targets.length; index++) {
      let amount = counts[targets[index]] || 0
      if (amount > 1) throw new Error('Codex bonus exceeds one base item')
      totals[index] += amount
    }
    let essenceCount = 0
    for (let essence of essences) {
      let amount = counts[essence] || 0
      essenceCount += amount
      essenceTotals[essence] = (essenceTotals[essence] || 0) + amount
    }
    if (essenceCount > 1) throw new Error('Essence bonus exceeds one base item')
    totals[3] += essenceCount
  }
  runtimeArsCapture = false
  const chances = [0.10, 0.04, 0.01, 0.20]
  for (let index = 0; index < chances.length; index++) {
    let expected = iterations * chances[index]
    let tolerance = 6 * Math.sqrt(expected * (1 - chances[index]))
    runtimeAssert(Math.abs(totals[index] - expected) < tolerance,
      'native Ars chance ' + chances[index] + ': ' + totals[index] + '/' + iterations)
  }
  for (let essence of essences) {
    runtimeAssert(Math.abs(essenceTotals[essence] - totals[3] / 7) < 6 * Math.sqrt(totals[3] * 6 / 49),
      'uniform native essence selection: ' + essence + '=' + essenceTotals[essence])
  }
  for (let id of ['ars_additions:chests/arcane_library', 'ars_additions:chests/nexus_tower',
    'ars_additions:chests/ruined_portal', 'twilightforest:darktower_boss',
    'twilightforest:labyrinth_vault_jackpot', 'lootintegrations:chests/easy',
    'minecraft:chests/trial_chambers/reward', 'minecraft:entities/zombie']) {
    let items = new ArrayList()
    runtimeArsCapture = true
    runtimeArsCapturedLoot = null
    Modifications.invokeActions(items, context(id, 0))
    runtimeArsCapture = false
    runtimeAssert(Object.keys(runtimeArsCapturedLoot).length === 0, 'no direct Ars bonus in special/helper table: ' + id)
  }
  const generatedResults = {}
  for (let id of ['minecraft:chests/simple_dungeon', 'dungeoncrawl:chests/stage_1',
    'nova_structures:chests/dungeon_2', 'dungeons_arise:chests/bandit_towers/bandit_towers_normal',
    'twilightforest:hill_1', 'kaisyn:village/village_badlands_house']) {
    let key = ResourceKey.create(RegistryKeys.LOOT_TABLE, ResourceLocation.parse(id))
    let table = holder.getLootTable(key)
    let hits = 0
    for (let iteration = 0; iteration < 300; iteration++) {
      let counts = count(table.getRandomItems(params(0), random))
      if (targets.some(target => (counts[target] || 0) > 0)) hits++
    }
    runtimeAssert(hits > 0, 'real chest generation including integrations produces Codex: ' + id + '=' + hits + '/300')
    generatedResults[id] = hits
  }
  // Check the original special-table pools before existing global mods/integrations.
  for (let id of ['ars_additions:chests/arcane_library', 'ars_additions:chests/nexus_tower']) {
    let table = holder.getLootTable(ResourceKey.create(RegistryKeys.LOOT_TABLE, ResourceLocation.parse(id)))
    for (let iteration = 0; iteration < 20; iteration++) {
      let codexCount = 0
      table.getRandomItemsRaw(context(id, 0), stack => {
        if (String(stack.id) === targets[0]) codexCount += stack.getCount()
      })
      if (codexCount < 1 || codexCount > 4) throw new Error('Native Ars special chest changed: ' + id + '=' + codexCount)
    }
    runtimeAssert(true, 'native Ars special chest retains guaranteed 1-4 Codex Entries: ' + id)
    console.info('[Runtime validation] Special chest after existing integrations: ' + id + '=' + JSON.stringify(count(table.getRandomItems(params(0), random))))
  }
  const LootrAPI = Java.loadClass('noobanidus.mods.lootr.common.api.LootrAPI')
  const LootrChest = Java.loadClass('noobanidus.mods.lootr.common.block.entity.LootrChestBlockEntity')
  const Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
  const FakePlayers = Java.loadClass('net.neoforged.neoforge.common.util.FakePlayerFactory')
  const GameProfile = Java.loadClass('com.mojang.authlib.GameProfile')
  const UUID = Java.loadClass('java.util.UUID')
  const otherPlayer = FakePlayers.get(player.level, new GameProfile(
    UUID.fromString('00000000-0000-0000-0000-000000000002'), 'LootRuntimePeer'))
  const chestState = Registries.BLOCK.get(ResourceLocation.parse('lootr:lootr_chest')).defaultBlockState()
  const chestKey = ResourceKey.create(RegistryKeys.LOOT_TABLE, ResourceLocation.parse('minecraft:chests/simple_dungeon'))
  let lootrCodexHits = 0
  // Native Lootr containers and two server-side identities; no original-world blocks are placed.
  for (let iteration = 0; iteration < 50; iteration++) {
    let chest = new LootrChest(player.blockPosition(), chestState)
    chest.setLevel(player.level)
    chest.setLootTable(chestKey, iteration + 1)
    let first = LootrAPI['getInventory(noobanidus.mods.lootr.common.api.data.ILootrInfoProvider,net.minecraft.server.level.ServerPlayer)'](chest, player)
    let second = LootrAPI['getInventory(noobanidus.mods.lootr.common.api.data.ILootrInfoProvider,net.minecraft.server.level.ServerPlayer)'](chest, otherPlayer)
    if (first == null || second == null) throw new Error('Lootr did not create personal inventories')
    for (let inventory of [first, second]) {
      for (let slot = 0; slot < inventory.getContainerSize(); slot++) {
        if (targets.indexOf(String(inventory.getItem(slot).id)) >= 0) lootrCodexHits++
      }
    }
    first.setItem(0, Item.of('minecraft:diamond', 23))
    let reopened = LootrAPI['getInventory(noobanidus.mods.lootr.common.api.data.ILootrInfoProvider,net.minecraft.server.level.ServerPlayer)'](chest, player)
    if (String(reopened.getItem(0).id) !== 'minecraft:diamond' || reopened.getItem(0).getCount() !== 23) {
      throw new Error('Lootr rerolled an existing personal inventory')
    }
    if (String(second.getItem(0).id) === 'minecraft:diamond' && second.getItem(0).getCount() === 23) {
      throw new Error('Lootr shared personal inventory state between players')
    }
  }
  runtimeAssert(lootrCodexHits > 0, 'native Lootr personal inventory generation includes Ars Codex bonuses: ' + lootrCodexHits)
  runtimeAssert(true, 'native Lootr keeps two player inventories separate and retains loot on reopening')
  JsonIO.write('runtime-ars-chest-result.json', {
    status: 'passed', tables: settings.genericChestTables.length, iterations: iterations,
    totals: totals, essences: essenceTotals, realChestCodexHits: generatedResults, lootrCodexHits: lootrCodexHits
  })
  console.info('[Runtime validation] ARS_CHEST_TESTS_COMPLETE')
}
