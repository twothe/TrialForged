/** Isolated client probe: confirms the loading screen ends, then closes the test client normally. */
const RuntimeMinecraft = Java.loadClass('net.minecraft.client.Minecraft')
let runtimeVisibleTicks = 0
let runtimeClientTicks = 0
ClientEvents.tick(() => {
  const client = RuntimeMinecraft.getInstance()
  if (client.level == null) return
  runtimeClientTicks++
  // A new NeoOrigins player reaches its normal origin-selection screen after terrain loads.
  if (client.screen == null || String(client.screen).indexOf('com.cyberday1.neoorigins.screen.OriginSelectionScreen@') === 0) {
    runtimeVisibleTicks++
    if (runtimeVisibleTicks === 20) console.info('[Runtime validation] CLIENT_JOIN_READY screen=' + client.screen)
  }
  if (runtimeClientTicks % 200 === 0) {
    console.info('[Runtime validation] client ticks=' + runtimeClientTicks + ', visible ticks=' + runtimeVisibleTicks
      + ', screen=' + client.screen)
    let result = JsonIO.read('runtime-result.json')
    if (result != null && result.status === 'passed' && runtimeVisibleTicks >= 200) {
      console.info('[Runtime validation] CLIENT_TEST_COMPLETE: ' + result.status)
      client.stop()
    }
  }
  if (runtimeClientTicks === 2400) {
    console.error('[Runtime validation] FAIL: client probe timed out')
    client.stop()
  }
})
