/** Keeps the diagnostic client muted and releases mouse capture until the native probe completes. */
let accessoryClient = Java.loadClass('net.minecraft.client.Minecraft').getInstance()
accessoryClient.setWindowActive(false)
let accessoryClientTicks = 0
ClientEvents.tick(() => {
  accessoryClient.setWindowActive(false)
  if (accessoryClient.mouseHandler.isMouseGrabbed()) accessoryClient.mouseHandler.releaseMouse()
  accessoryClientTicks++
  if (accessoryClientTicks % 40 !== 0) return
  let result = JsonIO.read('runtime-accessories-result.json')
  if (result != null || accessoryClientTicks > 6000) accessoryClient.stop()
})
