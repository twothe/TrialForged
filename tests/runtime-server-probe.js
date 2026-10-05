/** Isolated Minecraft integration probe. Copied only into the runtime-validation instance. */
const RuntimeWorldTier = Java.loadClass('dev.shadowsoffire.apotheosis.tiers.WorldTier')
const RuntimeInfernal = Java.loadClass('atomicstryker.infernalmobs.common.InfernalMobsCore')
const RuntimeLeveling = Java.loadClass('dev.muon.dynamic_difficulty.api.LevelingAPI')
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
            JsonIO.write('runtime-result.json', { status: 'passed', tier: 4 })
            console.info('[Runtime validation] SERVER_TESTS_COMPLETE')
          })
        })
      })
    })
  })
})
