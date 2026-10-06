/** Diagnoses installed Majrusz loot hooks through native loot generation and native RCH harvesting. */
let accessoryLootEvents = []
let accessoryChanceEvents = []
let accessoryForceDrop = false
let accessoryPhase = 'idle'
let AccessoryLootEvent = Java.loadClass('com.majruszsaccessories.lib.events.OnLootGenerated')
let AccessoryChanceEvent = Java.loadClass('com.majruszsaccessories.events.OnAccessoryDropChanceGet')
AccessoryLootEvent.listen(data => {
  if (accessoryPhase === 'idle') return
  let generated = []
  for (let stack of data.generatedLoot) generated.push(String(stack))
  accessoryLootEvents.push({ phase: accessoryPhase, table: String(data.lootId),
    block: String(data.blockState), entity: String(data.entity), loot: generated })
})
AccessoryChanceEvent.listen(data => {
  if (accessoryPhase === 'idle') return
  accessoryChanceEvents.push({ phase: accessoryPhase, original: data.original, chance: data.chance })
  if (accessoryForceDrop) data.chance = 1
})
PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(80, () => {
    let result = { status: 'running', lootEvents: accessoryLootEvents, chanceEvents: accessoryChanceEvents }
    try {
      let player = event.player
      let level = player.level
      let Block = Java.loadClass('net.minecraft.world.level.block.Block')
      let Blocks = Java.loadClass('net.minecraft.world.level.block.Blocks')
      let Position = Java.loadClass('net.minecraft.core.BlockPos')
      let Vector = Java.loadClass('net.minecraft.world.phys.Vec3')
      let Direction = Java.loadClass('net.minecraft.core.Direction')
      let Hand = Java.loadClass('net.minecraft.world.InteractionHand')
      let Hit = Java.loadClass('net.minecraft.world.phys.BlockHitResult')
      let Harvest = Java.loadClass('io.github.jamalam360.rightclickharvest.RightClickHarvest')
      let position = new Position(0, 200, 0)
      let previous = level.getBlockState(position)
      let below = position.below()
      let previousBelow = level.getBlockState(below)
      level.setBlock(below, Blocks.FARMLAND.defaultBlockState(), 3)
      event.server.runCommandSilent('setblock 0 200 0 minecraft:potatoes[age=7]')
      let mature = level.getBlockState(position)
      player.setItemInHand(Hand.MAIN_HAND, Item.of('minecraft:air'))
      accessoryForceDrop = true
      accessoryPhase = 'native-get-drops'
      let loot = Block.getDrops(mature, level, position, null, player, player.mainHandItem)
      result.directLoot = []
      for (let stack of loot) result.directLoot.push(String(stack))
      accessoryPhase = 'right-click-harvest'
      level.setBlock(position, mature, 3)
      result.harvestResult = String(Harvest.onBlockUse(player, level, Hand.MAIN_HAND,
        new Hit(new Vector(0.5, 200.5, 0.5), Direction.UP, position, false), true))
      result.afterHarvest = String(level.getBlockState(position))
      accessoryPhase = 'server-right-click-interaction'
      level.setBlock(position, mature, 3)
      let gameMode = player.gameMode
      result.interactionResult = String(gameMode.useItemOn(player, level, player.mainHandItem, Hand.MAIN_HAND,
        new Hit(new Vector(0.5, 200.5, 0.5), Direction.UP, position, false)))
      result.afterInteraction = String(level.getBlockState(position))
      level.setBlock(position, previous, 3)
      level.setBlock(below, previousBelow, 3)
      for (let phase of ['native-get-drops', 'right-click-harvest', 'server-right-click-interaction']) {
        let found = accessoryLootEvents.some(entry => entry.phase === phase &&
          entry.loot.some(stack => stack.indexOf('majruszsaccessories:tamed_potato_beetle') !== -1))
        if (!found) throw new Error('Missing guaranteed beetle in ' + phase)
      }
      // Sample the original probability without overriding chance or spawning item entities.
      accessoryForceDrop = false
      accessoryPhase = 'idle'
      result.naturalTrials = 2000
      result.naturalBeetles = 0
      for (let trial = 0; trial < result.naturalTrials; trial++) {
        let naturalLoot = Block.getDrops(mature, level, position, null, player, player.mainHandItem)
        for (let stack of naturalLoot) {
          if (String(stack).indexOf('majruszsaccessories:tamed_potato_beetle') !== -1) result.naturalBeetles++
        }
      }
      result.status = 'passed'
    } catch (error) {
      result.status = 'failed'
      result.error = String(error)
      console.error('[Accessories diagnostic] ' + error)
    }
    accessoryPhase = 'idle'
    JsonIO.write('runtime-accessories-result.json', result)
    console.info('[Accessories diagnostic] COMPLETE ' + JSON.stringify(result))
  })
})
