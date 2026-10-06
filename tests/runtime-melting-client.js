/** Releases mouse capture and stops the muted test client after native recipe checks. */
let meltingClient = Java.loadClass('net.minecraft.client.Minecraft').getInstance()
meltingClient.setWindowActive(false)
let meltingClientTicks = 0
ClientEvents.tick(() => {
    meltingClient.setWindowActive(false)
    if (meltingClient.mouseHandler.isMouseGrabbed()) meltingClient.mouseHandler.releaseMouse()
    meltingClientTicks++
    if (meltingClientTicks % 40 !== 0) return
    if (JsonIO.read('runtime-melting-result.json') != null || meltingClientTicks > 6000) meltingClient.stop()
})
