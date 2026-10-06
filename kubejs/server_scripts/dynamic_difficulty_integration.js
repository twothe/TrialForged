/**
 * Trialforged's Dynamic Difficulty contract: unscaled named bosses and one
 * dungeon item per successful level/1000 roll, before external loot modifiers.
 * Runs inside entity loot tables so Scavenger's native reroll includes the bonus.
 * Chest sources use their own context and modifiers; generated components survive.
 */
;(() => {
  const Leveling = Java.loadClass('dev.muon.dynamic_difficulty.api.LevelingAPI')
  const LevelAttachment = Java.loadClass('dev.muon.dynamic_difficulty.EntityLevelAttachmentNeoForge')
  const Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
  const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  const ResourceKey = Java.loadClass('net.minecraft.resources.ResourceKey')
  const RegistryKeys = Java.loadClass('net.minecraft.core.registries.Registries')
  const LootParamsBuilder = Java.loadClass('net.minecraft.world.level.storage.loot.LootParams$Builder')
  const Params = Java.loadClass('net.minecraft.world.level.storage.loot.parameters.LootContextParams')
  const ParamSets = Java.loadClass('net.minecraft.world.level.storage.loot.parameters.LootContextParamSets')
  const LootType = Java.loadClass('com.almostreliable.lootjs.core.LootType')
  const Priority = Java.loadClass('net.neoforged.bus.api.EventPriority')
  const JoinEvent = Java.loadClass('net.neoforged.neoforge.event.entity.EntityJoinLevelEvent')
  const LivingEntity = Java.loadClass('net.minecraft.world.entity.LivingEntity')
  const legacyModifier = ResourceLocation.parse('autoleveling:level')
  // Parse text into native JS arrays; JsonIO.read returns wrapped Java collections.
  const config = guard('configuration read', () =>
    JSON.parse(String(JsonIO.readString('kubejs/config/trialforged_leveling.json'))))

  function guard(operation, action, preserveOriginalLoot) {
    try {
      return action()
    } catch (error) {
      console.error('[Trialforged leveling] ' + operation + ': ' + error)
      if (!preserveOriginalLoot) throw error
    }
  }

  function validateIds(values, label) {
    if (!Array.isArray(values) || values.length === 0) throw new Error(label + ' must be a nonempty array')
    const seen = {}
    return values.map(value => {
      let id = String(value)
      if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id) || seen[id]) {
        throw new Error('Invalid or duplicate ' + label + ' ID: ' + id)
      }
      seen[id] = true
      return id
    })
  }

  const settings = guard('configuration', () => {
    if (config == null || !Number.isFinite(config.chanceDivisor) || config.chanceDivisor <= 0) {
      throw new Error('chanceDivisor must be a finite positive number')
    }
    return {
      chanceDivisor: config.chanceDivisor,
      excludedDimensions: validateIds(config.excludedDimensions, 'excluded dimension'),
      bosses: validateIds(config.bosses, 'boss'),
      sources: validateIds(config.lootSources, 'loot source')
    }
  })

  /** Remove persisted leveling bonuses on joins without healing damaged bosses. */
  function clearBossScaling(entity) {
    if (entity.isRemoved() || !entity.isAlive()) return
    let previousMaximum = entity.getMaxHealth()
    if (previousMaximum <= 0) throw new Error('Invalid maximum health for ' + entity.type)
    let fraction = Math.min(1, entity.getHealth() / previousMaximum)
    let changed = false
    let attributes = Registries.ATTRIBUTE.iterator()
    while (attributes.hasNext()) {
      let attribute = attributes.next()
      let instance = entity.getAttribute(Registries.ATTRIBUTE.wrapAsHolder(attribute))
      if (instance == null) continue
      let removals = []
      let modifiers = instance.getModifiers().iterator()
      while (modifiers.hasNext()) {
        let id = modifiers.next().id()
        if (id.getNamespace() === 'dynamic_difficulty' || id.equals(legacyModifier)) removals.push(id)
      }
      for (let index = 0; index < removals.length; index++) {
        instance['removeModifier(net.minecraft.resources.ResourceLocation)'](removals[index])
        changed = true
      }
    }
    entity.removeData(LevelAttachment.LEVEL)
    // Legacy mod state belongs to native NeoForge data, not the KubeJS subtag.
    entity.getForgePersistentData().remove('LEVEL')
    if (changed) entity.setHealth(fraction * entity.getMaxHealth())
  }

  NativeEvents.onEvent(Priority.LOWEST, JoinEvent, event => {
    if (event.getLevel().isClientSide()) return
    let entity = event.getEntity()
    if (!(entity instanceof LivingEntity) || settings.bosses.indexOf(String(entity.type)) < 0) return
    entity.server.scheduleInTicks(1, () => guard('boss cleanup ' + entity.type, () => clearBossScaling(entity)))
  })

  LootJS.lootTables(event => guard('loot table registration', () => {
    const sourceKeys = settings.sources.map(id => {
      let location = ResourceLocation.parse(id)
      if (!event.hasLootTable(location)) throw new Error('Missing loot source: ' + id)
      if (!event.getLootTable(location).getLootType().equals(LootType.CHEST)) {
        throw new Error('Loot source is not a chest table: ' + id)
      }
      return ResourceKey.create(RegistryKeys.LOOT_TABLE, location)
    })

    // Enumerate existing tables; many entity types have no default loot table.
    event.modifyLootTables(LootType.ENTITY).getTables().forEach(entityTable => {
      let tableId = String(entityTable.getLocation())
      // Runtime bonus failures must never discard the already generated normal loot.
      entityTable.onDrop((context, bucket) => guard('bonus loot in ' + tableId, () => {
        let entity = context.getParamOrNull(Params.THIS_ENTITY)
        if (!(entity instanceof LivingEntity) || !Leveling.canHaveLevel(entity) || !Leveling.hasLevel(entity)) return
        if (String(entity.getLootTable().location()) !== tableId) return
        if (settings.bosses.indexOf(String(entity.type)) >= 0
          || settings.excludedDimensions.indexOf(String(entity.level.dimension)) >= 0) return
        let level = Leveling.getLevel(entity)
        if (!Number.isInteger(level) || level < 1) throw new Error('Invalid mob level: ' + level)
        let random = context.getRandom()
        if (random.nextFloat() >= Math.min(1, level / settings.chanceDivisor)) return

        let source = sourceKeys[random.nextInt(sourceKeys.length)]
        let params = new LootParamsBuilder(context.getLevel())
          .withParameter(Params.ORIGIN, entity.position())
          .withOptionalParameter(Params.THIS_ENTITY, context.getParamOrNull(Params.LAST_DAMAGE_PLAYER))
          .withLuck(context.getLuck()).create(ParamSets.CHEST)
        let table = context.getLevel().getServer().reloadableRegistries().getLootTable(source)
        let generated = table.getRandomItems(params, random)
        let candidates = []
        for (let index = 0; index < generated.size(); index++) {
          let stack = generated.get(index)
          if (!stack.isEmpty()) candidates.push(stack)
        }
        if (candidates.length === 0) throw new Error('Loot source produced no item: ' + source.location())
        let selected = candidates[random.nextInt(candidates.length)].copy()
        selected.setCount(1)
        bucket.addItem(selected)
      }, true))
    })
    console.info('[Trialforged leveling] Registered ' + sourceKeys.length + ' chest sources; chance = level/'
      + settings.chanceDivisor + ', one base item per successful roll.')
  }))
})()
