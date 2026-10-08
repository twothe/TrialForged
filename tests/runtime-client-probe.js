/** Isolated client probe: confirms the loading screen ends, then closes the test client normally. */
const RuntimeMinecraft = Java.loadClass('net.minecraft.client.Minecraft')
RuntimeMinecraft.getInstance().setWindowActive(false)
let runtimeVisibleTicks = 0
let runtimeClientTicks = 0
let runtimeSkillsOpened = false
let runtimeSkillsVisibleTicks = 0
let runtimeFoodUseStarted = false
ClientEvents.tick(() => {
  const client = RuntimeMinecraft.getInstance()
  // The autonomous validation client must never keep the user's cursor captured.
  client.setWindowActive(false)
  if (client.mouseHandler.isMouseGrabbed()) client.mouseHandler.releaseMouse()
  if (client.level == null) {
    if (runtimeClientTicks > 0 && String(client.screen).indexOf('DisconnectedScreen') >= 0) {
      JsonIO.write('runtime-skills-client-result.json', { status: 'failed', error: 'Test client disconnected' })
      console.error('[Runtime validation] CLIENT_TEST_COMPLETE: disconnected')
      client.stop()
    }
    return
  }
  runtimeClientTicks++
  let foodUse = JsonIO.read('runtime-skill-food-use.json')
  if (foodUse != null && foodUse.pending) {
    if (!runtimeFoodUseStarted && String(client.player.getMainHandItem().id) === 'minecraft:spider_eye'
      && client.player.getFoodData().getFoodLevel() < 20) {
      client.setScreen(null)
      client.options.keyUse.setDown(true)
      client.gameMode.useItem(client.player, Java.loadClass('net.minecraft.world.InteractionHand').MAIN_HAND)
      runtimeFoodUseStarted = true
      console.info('[Runtime skills UI] Started synchronized native food use')
    }
  } else if (runtimeFoodUseStarted) client.options.keyUse.setDown(false)
  if (runtimeSkillsOpened && String(client.screen).indexOf('net.puffish.skillsmod.client.gui.SkillsScreen@') === 0) {
    runtimeSkillsVisibleTicks++
  }
  // A new NeoOrigins player reaches its normal origin-selection screen after terrain loads.
  if (client.screen == null || String(client.screen).indexOf('com.cyberday1.neoorigins.screen.OriginSelectionScreen@') === 0) {
    runtimeVisibleTicks++
    if (runtimeVisibleTicks === 20) console.info('[Runtime validation] CLIENT_JOIN_READY screen=' + client.screen)
  }
  if (runtimeClientTicks % 200 === 0) {
    console.info('[Runtime validation] client ticks=' + runtimeClientTicks + ', visible ticks=' + runtimeVisibleTicks
      + ', screen=' + client.screen)
    let result = JsonIO.read('runtime-result.json')
    if (result != null && result.status === 'failed') {
      console.error('[Runtime validation] CLIENT_TEST_COMPLETE: failed')
      client.stop()
    }
    let skills = JsonIO.read('runtime-skills-result.json')
    if (skills != null && skills.status === 'failed') {
      console.error('[Runtime validation] CLIENT_TEST_COMPLETE: skills failed')
      client.stop()
    }
    if (result != null && result.status === 'passed' && skills != null && skills.status === 'passed' && runtimeVisibleTicks >= 200) {
      if (!runtimeSkillsOpened) {
        Java.loadClass('net.puffish.skillsmod.client.SkillsClientMod').getInstance().openScreen(
          Java.loadClass('java.util.Optional').of(Java.loadClass('net.minecraft.resources.ResourceLocation').parse('trialforged:skills')))
        runtimeSkillsOpened = true
        return
      }
      if (runtimeSkillsVisibleTicks < 40) return
      JsonIO.write('runtime-skills-client-result.json', { status: 'passed', visibleTicks: runtimeSkillsVisibleTicks })
      console.info('[Runtime skills UI] SKILLS_CLIENT_TESTS_COMPLETE visibleTicks=' + runtimeSkillsVisibleTicks)
      console.info('[Runtime validation] CLIENT_TEST_COMPLETE: ' + result.status)
      client.stop()
    }
  }
  if (runtimeClientTicks === 2400) {
    console.error('[Runtime validation] FAIL: client probe timed out')
    client.stop()
  }
})
