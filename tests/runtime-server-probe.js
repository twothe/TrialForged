/** Isolated Minecraft integration probe. Copied only into the runtime-validation instance. */
const RuntimeWorldTier = Java.loadClass('dev.shadowsoffire.apotheosis.tiers.WorldTier')
const RuntimeInfernal = Java.loadClass('atomicstryker.infernalmobs.common.InfernalMobsCore')
const RuntimeLeveling = Java.loadClass('dev.muon.dynamic_difficulty.api.LevelingAPI')
let runtimeElsebasePassed = false
let runtimeDimensionBasesPassed = false
/** Verify native Nether/End base settings and fresh mob levels through the normal spawn path. */
function runtimeCheckDimensionBases(server) {
  const Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
  const Key = Java.loadClass('net.minecraft.resources.ResourceKey')
  const Keys = Java.loadClass('net.minecraft.core.registries.Registries')
  const Dimensions = Java.loadClass('dev.muon.dynamic_difficulty.data.DimensionLevelingSettingsStore')
  const Utils = Java.loadClass('dev.muon.dynamic_difficulty.util.LevelingUtils')
  const BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
  const mobs = []
  for (let expected of [['minecraft:the_nether', 30, 50, 0], ['minecraft:the_end', 80, 100, 5]]) {
    let level = server['getLevel(net.minecraft.resources.ResourceKey)'](Key.create(Keys.DIMENSION, Location.parse(expected[0])))
    runtimeAssert(level != null, 'dimension exists: ' + expected[0])
    let settings = Dimensions.get(level)
    runtimeAssert(settings.startingLevel() === expected[1] && settings.maxLevel() === expected[2]
      && settings.randomLevelBonus() === expected[3], 'native dimension base/cap/random settings: ' + expected[0])
    let origin = Utils.getEffectiveSpawnPos(level, settings)
    let position = new BlockPos(origin.getX(), settings.seaLevel(), origin.getZ())
    runtimeAssert(Utils.calculateBaseEntityLevel(level, position, settings, settings) === expected[1],
      'native base calculation without distance/depth bonus: ' + expected[0])
    let mob = level.createEntity('minecraft:zombie')
    mob.setPosition(position.getX(), position.getY(), position.getZ())
    mob.mergeNbt({ NoAI: true, PersistenceRequired: true, Silent: true })
    mob.spawn()
    mobs.push({ entity: mob, expected: expected })
  }
  runtimeStage(server, 5, () => {
    for (let entry of mobs) {
      runtimeAssert(RuntimeLeveling.hasLevel(entry.entity) && RuntimeLeveling.getLevel(entry.entity) >= entry.expected[1],
        'fresh dimension mob reaches configured base: ' + entry.expected[0] + '=' + RuntimeLeveling.getLevel(entry.entity))
      entry.entity.discard()
    }
    runtimeDimensionBasesPassed = true
    console.info('[Runtime validation] DIMENSION_BASES_TESTS_COMPLETE')
  })
}
/** Exercise native dimension settings and fresh mobs at distant Elsebase coordinates. */
function runtimeCheckElsebase(server) {
  const Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
  const Key = Java.loadClass('net.minecraft.resources.ResourceKey')
  const Keys = Java.loadClass('net.minecraft.core.registries.Registries')
  const Dimensions = Java.loadClass('dev.muon.dynamic_difficulty.data.DimensionLevelingSettingsStore')
  const DimensionSettings = Java.loadClass('dev.muon.dynamic_difficulty.settings.DimensionLevelingSettings')
  const Utils = Java.loadClass('dev.muon.dynamic_difficulty.util.LevelingUtils')
  const BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
  const Attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
  const elsebase = server['getLevel(net.minecraft.resources.ResourceKey)'](
    Key.create(Keys.DIMENSION, Location.parse('elsebase:backdoor')))
  runtimeAssert(elsebase != null, 'Elsebase dimension exists')
  const settings = Dimensions.get(elsebase)
  runtimeAssert(settings.maxLevel() === 1 && settings.levelsPerDistance() === 0
    && settings.attributeModifiers().isEmpty(), 'Elsebase native dimension profile loaded')
  const baseline = DimensionSettings.createDefault()
  runtimeAssert(Utils.calculateBaseEntityLevel(elsebase, new BlockPos(8192, 64, 8192), baseline, baseline) > 100,
    'previous global distance settings reproduce excessive levels at distant Elsebase coordinates')
  const mobs = ['minecraft:zombie', 'minecraft:skeleton', 'minecraft:creeper'].map((type, index) => {
    let mob = elsebase.createEntity(type)
    mob.setPosition(8192 + index * 16, 64, 8192)
    mob.mergeNbt({ NoAI: true, PersistenceRequired: true, Silent: true })
    mob.spawn()
    return mob
  })
  runtimeStage(server, 5, () => {
    for (let mob of mobs) {
      runtimeAssert(RuntimeLeveling.getLevel(mob) === 1, 'Elsebase distance leaves baseline level 1: ' + mob.type)
      for (let attribute of [Attributes.MAX_HEALTH, Attributes.ATTACK_DAMAGE]) {
        let instance = mob.getAttribute(attribute)
        if (instance == null) continue
        let modifiers = instance.getModifiers().iterator()
        while (modifiers.hasNext()) {
          let id = modifiers.next().id()
          runtimeAssert(id.getNamespace() !== 'dynamic_difficulty', 'Elsebase has no leveling attribute bonus: ' + id)
        }
      }
      mob.discard()
    }
    runtimeElsebasePassed = true
    console.info('[Runtime validation] ELSEBASE_TESTS_COMPLETE')
  })
}
function runtimeAssert(condition, label) {
  if (!condition) throw new Error('[Runtime validation] FAIL: ' + label)
  console.info('[Runtime validation] PASS: ' + label)
}
function runtimeStage(server, delay, action) {
  server.scheduleInTicks(delay, () => {
    try { action() } catch (error) {
      console.error('[Runtime validation] FAIL: ' + error)
      JsonIO.write('runtime-result.json', { status: 'failed', error: String(error) })
    }
  })
}
PlayerEvents.loggedIn(event => {
  const player = event.player
  if (String(player.username) !== 'RuntimeTester') return
  const server = player.server
  console.info('[Runtime validation] PLAYER_LOGIN')
  const expected = JsonIO.read('runtime-expected-tier.json')
  if (expected != null && expected.tier != null) {
    runtimeAssert(RuntimeWorldTier.getTier(player).ordinal() === expected.tier, 'saved tier survives client restart')
  }
  // Reset only the isolated test identity so a repeated run must award progress again.
  RuntimeWorldTier.setTier(player, RuntimeWorldTier.HAVEN)
  player.persistentData.putInt('trialforged_highest_apotheosis_tier', 0)
  player.runCommandSilent('gamemode creative')
  runtimeStage(server, 200, () => {
    runtimeCheckElsebase(server)
    runtimeCheckDimensionBases(server)
    runtimeCheckArsChestLoot(player)
    const level = player.level
    const zombie = level.createEntity('minecraft:zombie')
    zombie.setPosition(player.x + 4, player.y, player.z)
    zombie.mergeNbt({ NoAI: true, PersistenceRequired: true, Silent: true })
    zombie.spawn()
    const bosses = ['minecraft:wither', 'minecraft:ender_dragon', 'minecraft:warden'].map(type => {
      let boss = level.createEntity(type)
      boss.setPosition(player.x + 16, player.y + 12, player.z)
      boss.mergeNbt({ NoAI: true, PersistenceRequired: true, Silent: true })
      boss.spawn()
      return boss
    })
    runtimeStage(server, 5, () => {
      runtimeAssert(zombie.attack(player.damageSources().playerAttack(player), 1), 'ordinary mob damage reaches native events')
      for (let i = 0; i < bosses.length; i++) {
        let boss = bosses[i]
        runtimeAssert(boss.getMaxHealth() > 0, String(boss.type) + ' native maximum health (actual=' + boss.getMaxHealth() + ')')
        runtimeAssert(RuntimeInfernal.getMobModifiers(boss) != null, String(boss.type) + ' native always-infernal modifiers')
        runtimeAssert(!boss.persistentData.contains('trialforged_boss_profile_version'), String(boss.type) + ' no custom profile applied')
      }
      const warden = bosses[2]
      runtimeAssert(warden.attack(player.damageSources().playerAttack(player), 200), 'boss damage reaches participation handler')
      runtimeAssert(warden.persistentData.getCompound('trialforged_tier_participants').contains(String(player.getUuid())), 'real player participation recorded')
      runtimeStage(server, 25, () => {
        runtimeAssert(zombie.attack(warden.damageSources().mobAttack(warden), 2), 'native Infernal boss attack succeeds')
        RuntimeLeveling.setAndUpdateLevel(zombie, 1000)
        runtimeAssert(zombie.attack(player.damageSources().playerAttack(player), 100000), 'level-1000 mob kill invokes guaranteed bonus loot')
        warden.attack(player.damageSources().playerAttack(player), 100000)
        // Native random profiles may include 1UP; allow a second hit after revival.
        runtimeStage(server, 25, () => {
          if (warden.isAlive()) warden.attack(player.damageSources().playerAttack(player), 100000)
          runtimeStage(server, 5, () => {
            runtimeAssert(RuntimeWorldTier.getTier(player).ordinal() === 4, 'real boss kill awards Pinnacle')
            if (!zombie.isRemoved()) zombie.discard()
            bosses[0].discard()
            bosses[1].discard()
            runtimeAssert(runtimeElsebasePassed, 'Elsebase leveling validation completed')
            runtimeAssert(runtimeDimensionBasesPassed, 'Nether/End base validation completed')
            JsonIO.write('runtime-result.json', { status: 'passed', tier: 4, elsebase: 'passed', dimensionBases: 'passed' })
            console.info('[Runtime validation] SERVER_TESTS_COMPLETE')
          })
        })
      })
    })
  })
})
