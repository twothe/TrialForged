/** Exercises the production integration with boundary fakes in Node and KubeJS Rhino. */
var levelLootHandlers = {}
var levelLootLogs = []
var console = { info: function () {}, error: function (message) { levelLootLogs.push(message) } }
var levelLootConfig = {
  chanceDivisor: 1000,
  bosses: ['minecraft:wither'],
  lootSources: ['minecraft:chests/simple_dungeon', 'dungeoncrawl:chests/stage_1']
}
var JsonIO = { readString: function () { return JSON.stringify(levelLootConfig) } }
function LevelLootId(id) { this.value = id }
LevelLootId.prototype.toString = function () { return this.value }
LevelLootId.prototype.getNamespace = function () { return this.value.split(':')[0] }
LevelLootId.prototype.equals = function (other) { return String(other) === this.value }
function LevelLootStack(id, count, components) {
  this.id = id; this.count = count; this.components = components || 'enchanted'
}
LevelLootStack.prototype.isEmpty = function () { return this.count === 0 }
LevelLootStack.prototype.copy = function () { return new LevelLootStack(this.id, this.count, this.components) }
LevelLootStack.prototype.setCount = function (count) { this.count = count }
function levelLootList(values) {
  return { size: function () { return values.length }, get: function (index) { return values[index] } }
}
function levelLootIterator(values) {
  var index = 0
  return { hasNext: function () { return index < values.length }, next: function () { return values[index++] } }
}
function LevelLootEntity(type, level) {
  this.type = type || 'minecraft:zombie'; this.mobLevel = level == null ? 100 : level
  this.allowed = true; this.leveled = true; this.removed = false; this.alive = true
  this.maximum = 300; this.health = 150
  this.modifiers = ['dynamic_difficulty:health', 'autoleveling:level', 'apotheosis:health']
  this.persistentRemovals = []; this.kubejsRemovals = []; this.dataRemovals = []; this.scheduled = []
  var self = this
  this.server = { scheduleInTicks: function (ticks, callback) {
    if (ticks !== 1) throw new Error('Expected one-tick cleanup')
    self.scheduled.push(callback)
  } }
}
LevelLootEntity.prototype.getLootTable = function () { return { location: function () { return 'minecraft:entities/zombie' } } }
LevelLootEntity.prototype.position = function () { return 'mob-position' }
LevelLootEntity.prototype.isRemoved = function () { return this.removed }
LevelLootEntity.prototype.isAlive = function () { return this.alive }
LevelLootEntity.prototype.getMaxHealth = function () { return this.maximum }
LevelLootEntity.prototype.getHealth = function () { return this.health }
LevelLootEntity.prototype.setHealth = function (value) { this.health = value }
LevelLootEntity.prototype.removeData = function (key) { this.dataRemovals.push(key) }
LevelLootEntity.prototype.getPersistentData = function () {
  var self = this
  return { remove: function (key) { self.kubejsRemovals.push(key) } }
}
LevelLootEntity.prototype.getForgePersistentData = function () {
  var self = this
  return { remove: function (key) { self.persistentRemovals.push(key) } }
}
LevelLootEntity.prototype.getAttribute = function () {
  var self = this
  return {
    getModifiers: function () { return { iterator: function () {
      return levelLootIterator(self.modifiers.map(function (id) {
        return { id: function () { return new LevelLootId(id) } }
      }))
    } } },
    'removeModifier(net.minecraft.resources.ResourceLocation)': function (id) {
      self.modifiers.splice(self.modifiers.indexOf(String(id)), 1)
      self.maximum -= 100
    }
  }
}
function LevelLootParamsBuilder(level) { this.values = { level: level } }
LevelLootParamsBuilder.prototype.withParameter = function (key, value) { this.values[key] = value; return this }
LevelLootParamsBuilder.prototype.withOptionalParameter = LevelLootParamsBuilder.prototype.withParameter
LevelLootParamsBuilder.prototype.withLuck = function (luck) { this.values.luck = luck; return this }
LevelLootParamsBuilder.prototype.create = function (type) { this.values.type = type; return this.values }
var levelLootChestType = { equals: function (value) { return value === this } }
var Java = { loadClass: function (name) {
  var classes = {
    'dev.muon.dynamic_difficulty.api.LevelingAPI': {
      canHaveLevel: function (entity) { return entity.allowed },
      hasLevel: function (entity) { return entity.leveled },
      getLevel: function (entity) { return entity.mobLevel }
    },
    'dev.muon.dynamic_difficulty.EntityLevelAttachmentNeoForge': { LEVEL: 'dynamic-level' },
    'net.minecraft.core.registries.BuiltInRegistries': { ATTRIBUTE: {
      iterator: function () { return levelLootIterator(['health']) },
      wrapAsHolder: function (value) { return value }
    } },
    'net.minecraft.resources.ResourceLocation': { parse: function (id) { return new LevelLootId(id) } },
    'net.minecraft.resources.ResourceKey': { create: function (registry, location) {
      return { location: function () { return location } }
    } },
    'net.minecraft.core.registries.Registries': { LOOT_TABLE: 'loot-registry' },
    'net.minecraft.world.level.storage.loot.LootParams$Builder': LevelLootParamsBuilder,
    'net.minecraft.world.level.storage.loot.parameters.LootContextParams': {
      THIS_ENTITY: 'entity', ORIGIN: 'origin', LAST_DAMAGE_PLAYER: 'killer'
    },
    'net.minecraft.world.level.storage.loot.parameters.LootContextParamSets': { CHEST: 'chest' },
    'com.almostreliable.lootjs.core.LootType': { CHEST: levelLootChestType, ENTITY: 'entity' },
    'net.neoforged.bus.api.EventPriority': { LOWEST: 'lowest' },
    'net.neoforged.neoforge.event.entity.EntityJoinLevelEvent': 'join',
    'net.minecraft.world.entity.LivingEntity': LevelLootEntity
  }
  if (!classes[name]) throw new Error('Unexpected Java class: ' + name)
  return classes[name]
} }
var NativeEvents = { onEvent: function (priority, event, callback) { levelLootHandlers[event] = callback } }
var LootJS = { lootTables: function (callback) { levelLootHandlers.register = callback } }
function levelLootRegister(missing, wrongType) {
  var result = {}
  var event = {
    hasLootTable: function () { return !missing },
    getLootTable: function () { return { getLootType: function () { return wrongType ? { equals: function () { return false } } : levelLootChestType } } },
    modifyEntityTables: function () { throw new Error('Unknown loot table: minecraft:entities/area_effect_cloud') },
    modifyLootTables: function (type) {
      if (type !== 'entity') throw new Error('Expected existing entity loot tables only')
      return { getTables: function () { return [{
      getLocation: function () { return 'minecraft:entities/zombie' },
      onDrop: function (callback) { result.drop = callback }
    }] } } }
  }
  levelLootHandlers.register(event)
  return result.drop
}
function levelLootRun(drop, entity, roll, stacks) {
  var calls = [], items = [], params, source, ints = [1, 1]
  var random = {
    nextFloat: function () { return roll },
    nextInt: function (bound) { return (ints.shift() || 0) % bound }
  }
  var level = { getServer: function () { return { reloadableRegistries: function () { return {
    getLootTable: function (key) {
      source = String(key.location())
      return { getRandomItems: function (values, rng) {
        if (rng !== random) throw new Error('Lost random source')
        params = values; calls.push('generate'); return levelLootList(stacks)
      } }
    }
  } } } } }
  var context = {
    getParamOrNull: function (key) { return key === 'entity' ? entity : 'killer-player' },
    getRandom: function () { return random }, getLevel: function () { return level }, getLuck: function () { return 2 }
  }
  drop(context, { addItem: function (item) { items.push(item) } })
  return { items: items, calls: calls, params: params, source: source }
}
function runLevelLootTests() {
  var count = 0
  function check(value, message) { if (!value) throw new Error(message); count++ }
  function rejects(action, message) {
    var failed = false
    try { action() } catch (error) { failed = true }
    check(failed, message)
  }
  var drop = levelLootRegister()
  var stacks = [new LevelLootStack('iron', 64), new LevelLootStack('sword', 1, 'affix-and-enchantment')]
  var entity = new LevelLootEntity()
  var hit = levelLootRun(drop, entity, 0.099, stacks)
  check(hit.items.length === 1 && hit.items[0].count === 1, 'One base item on success')
  check(hit.items[0].components === 'affix-and-enchantment', 'Components retained')
  check(stacks[0].count === 64 && stacks[1].count === 1, 'Source stacks preserved')
  check(hit.source === 'dungeoncrawl:chests/stage_1', 'Configured source selection')
  check(hit.params.type === 'chest' && hit.params.origin === 'mob-position', 'Dedicated chest context')
  check(hit.params.entity === 'killer-player' && hit.params.luck === 2, 'Killer and luck forwarded')
  check(levelLootRun(drop, entity, 0.1, stacks).calls.length === 0, 'Exact threshold rejected before generation')
  for (var i = 0; i < 5; i++) {
    var levels = [1, 50, 500, 999, 1000]
    entity.mobLevel = levels[i]
    check(levelLootRun(drop, entity, levels[i] / 1000 - 0.00001, stacks).items.length === 1, 'Chance below boundary ' + levels[i])
  }
  entity.mobLevel = 2000
  check(levelLootRun(drop, entity, 0.99999, stacks).items.length === 1, 'Chance capped at one')
  entity.allowed = false
  check(levelLootRun(drop, entity, 0, stacks).calls.length === 0, 'Ineligible mob skipped')
  entity.allowed = true; entity.leveled = false
  check(levelLootRun(drop, entity, 0, stacks).calls.length === 0, 'Unleveled mob skipped')
  entity.leveled = true; entity.type = 'minecraft:wither'
  check(levelLootRun(drop, entity, 0, stacks).calls.length === 0, 'Boss skipped independently of native blacklist')
  entity.type = 'minecraft:zombie'; entity.getLootTable = function () { return { location: function () { return 'nested:other' } } }
  check(levelLootRun(drop, entity, 0, stacks).calls.length === 0, 'Nested entity helper table skipped')
  entity = new LevelLootEntity('minecraft:zombie', 0)
  check(levelLootRun(drop, entity, 0, stacks).items.length === 0, 'Invalid level preserves original loot')
  entity.mobLevel = 100
  check(levelLootRun(drop, entity, 0, []).items.length === 0, 'Empty source preserves original loot')
  rejects(function () { levelLootRegister(true) }, 'Missing table rejected at reload')
  rejects(function () { levelLootRegister(false, true) }, 'Nonchest table rejected at reload')
  check(levelLootRun(drop, entity, 0, stacks).items.length + levelLootRun(drop, entity, 0, stacks).items.length === 2,
    'Independent repeated root rolls each receive a bonus')
  var boss = new LevelLootEntity('minecraft:wither')
  levelLootHandlers.join({ getLevel: function () { return { isClientSide: function () { return false } } }, getEntity: function () { return boss } })
  check(boss.scheduled.length === 1, 'Boss cleanup deferred')
  boss.scheduled.shift()()
  check(boss.modifiers.length === 1 && boss.modifiers[0] === 'apotheosis:health', 'Only leveling modifiers removed')
  check(boss.health === 50 && boss.maximum === 100, 'Half-health preserved')
  check(boss.dataRemovals[0] === 'dynamic-level' && boss.persistentRemovals[0] === 'LEVEL', 'Old level state removed')
  check(boss.kubejsRemovals.length === 0, 'KubeJS persistent namespace preserved')
  check(levelLootLogs.length >= 4, 'Contract failures logged')
  return count
}
