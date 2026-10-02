/**
 * Runs the production boss handlers with Minecraft/Infernal/Apotheosis boundary
 * fakes. Tests profile values, migration, reloads and attacks without reproducing
 * the profile orchestration. Compatible with Node and installed KubeJS Rhino.
 */
var bossTestHandlers = {}
var bossTestLogs = []
var console = { info: function () {}, error: function (message) { bossTestLogs.push(message) } }
var bossTestTierNames = ['haven', 'frontier', 'ascent', 'summit', 'pinnacle']
var bossTestTiers = bossTestTierNames.map(function (name) {
  return { getSerializedName: function () { return name } }
})
var bossTestWorldTier = {
  FRONTIER: bossTestTiers[1], ASCENT: bossTestTiers[2], SUMMIT: bossTestTiers[3],
  values: function () { return bossTestTiers }
}
function BossTestTag() { this.values = {} }
BossTestTag.prototype.contains = function (key) { return Object.prototype.hasOwnProperty.call(this.values, key) }
BossTestTag.prototype.remove = function (key) { delete this.values[key] }
BossTestTag.prototype.putInt = function (key, value) { this.values[key] = value }
BossTestTag.prototype.putFloat = function (key, value) { this.values[key] = value }
function bossTestIterator(values) {
  var index = 0
  return { hasNext: function () { return index < values.length }, next: function () { return values[index++] } }
}
function BossTestAttribute(base) { this.base = base; this.modifiers = { 'autoleveling:level': 100, unrelated: 0 } }
BossTestAttribute.prototype.setBaseValue = function (value) { this.base = value }
BossTestAttribute.prototype.removeModifier = function (id) { delete this.modifiers[id] }
BossTestAttribute.prototype.value = function () {
  var value = this.base, modifiers = this.modifiers
  Object.keys(modifiers).forEach(function (id) { value += modifiers[id] })
  return Math.min(value, 1024)
}
var bossTestAttributes = ['max_health', 'armor', 'projectile_bonus', 'not_on_this_entity']
var bossTestRegistry = {
  iterator: function () { return bossTestIterator(bossTestAttributes) },
  wrapAsHolder: function (attribute) { return attribute }
}
var bossTestAugments = { getAugments: function (tier, target) {
  if (target !== 'monsters') throw new Error('Player augments must not be touched')
  var augment = {
    remove: function (level, entity) { entity.tierRemovals.push(tier.getSerializedName()); entity.appliedTier = null },
    apply: function (level, entity) { entity.appliedTier = tier.getSerializedName() }
  }
  return { size: function () { return 1 }, get: function () { return augment } }
} }
function BossTestModifiers(names) { this.names = names; this.health = 0; this.maximum = 0 }
BossTestModifiers.prototype.getLinkedModNameUntranslated = function () { return this.names + ' ' }
BossTestModifiers.prototype.setActualHealth = function (health, maximum) { this.health = health; this.maximum = maximum }
var bossTestCore = {
  getNBTTag: function () { return 'InfernalMobsMod' },
  addEntityModifiersByString: function (entity, names) {
    entity.infernalAdds++
    if (entity.missingInfernalModifier) return
    entity.infernal = new BossTestModifiers(names)
    entity.rawData.values.InfernalMobsMod = names
    // Stress the external mod's spawn-time health buff/heal. Production must
    // restore the pre-call health fraction and both Infernal caches afterward.
    entity.attributes.max_health.setBaseValue(1024)
    entity.health = entity.getMaxHealth()
  },
  sendHealthPacket: function (entity) { entity.healthPackets++ }
}
var bossTestInfernal = {
  instance: function () { return bossTestCore },
  getMobModifiers: function (entity) { return entity.infernal },
  removeEntFromElites: function (entity) { entity.infernal = null; entity.infernalRemovals++ }
}
var Java = { loadClass: function (name) {
  var classes = {
    'atomicstryker.infernalmobs.common.InfernalMobsCore': bossTestInfernal,
    'net.minecraft.world.entity.ai.attributes.Attributes': { MAX_HEALTH: 'max_health' },
    'net.minecraft.core.registries.BuiltInRegistries': { ATTRIBUTE: bossTestRegistry },
    'net.minecraft.resources.ResourceLocation': { parse: function (id) { return id } },
    'dev.shadowsoffire.apotheosis.tiers.augments.TierAugmentRegistry': bossTestAugments,
    'dev.shadowsoffire.apotheosis.tiers.augments.TierAugment$Target': { MONSTERS: 'monsters' },
    'dev.shadowsoffire.apotheosis.tiers.WorldTier': bossTestWorldTier,
    'dev.shadowsoffire.apotheosis.Apoth$Attachments': { TIER_AUGMENTS_APPLIED: 'tier_augments_applied' },
    'net.minecraft.world.entity.boss.enderdragon.phases.EnderDragonPhase': { DYING: 'dying' },
    'net.minecraft.world.damagesource.DamageTypes': {
      MOB_ATTACK: 'mob', SONIC_BOOM: 'sonic_boom', WITHER_SKULL: 'wither_skull',
      EXPLOSION: 'explosion', PLAYER_EXPLOSION: 'player_explosion'
    },
    'net.neoforged.bus.api.EventPriority': { LOWEST: 'lowest' },
    'net.neoforged.neoforge.event.entity.EntityJoinLevelEvent': 'join',
    'net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent': 'damage'
  }
  if (!classes[name]) throw new Error('Unexpected Java class: ' + name)
  return classes[name]
} }
var NativeEvents = { onEvent: function (priority, eventClass, callback) {
  if (priority !== 'lowest') throw new Error('Expected lowest-priority registration')
  if (bossTestHandlers[eventClass]) throw new Error('Duplicate event registration')
  bossTestHandlers[eventClass] = callback
} }
function bossTestServer() {
  var server = { pending: [], players: [] }
  server.scheduleInTicks = function (ticks, callback) {
    if (ticks !== 1) throw new Error('Profile must wait one tick for other join handlers')
    server.pending.push(callback)
  }
  server.flush = function () { while (server.pending.length) server.pending.shift()() }
  return server
}
function bossTestEntity(type, health, maximum) {
  var entity = {
    type: type, server: bossTestServer(), health: health, client: false, alive: true, removed: false,
    charging: 0, phase: 'flying', persistentData: new BossTestTag(), rawData: new BossTestTag(),
    infernal: null, infernalAdds: 0, infernalRemovals: 0, healthPackets: 0, tierRemovals: [],
    attributes: { max_health: new BossTestAttribute(maximum), armor: new BossTestAttribute(0), projectile_bonus: new BossTestAttribute(0) }
  }
  // Fixtures begin with the supplied actual maximum; stale level modifiers are
  // added explicitly only in migration cases.
  delete entity.attributes.max_health.modifiers['autoleveling:level']
  entity.getMaxHealth = function () { return entity.attributes.max_health.value() }
  entity.getHealth = function () { return entity.health }
  entity.setHealth = function (value) { entity.health = Math.min(value, entity.getMaxHealth()) }
  entity.getAttribute = function (id) { return entity.attributes[id] == null ? null : entity.attributes[id] }
  entity.getPersistentData = function () { return entity.rawData }
  entity.setData = function (key, value) { entity.rawData.values[key] = value }
  entity.getInvulnerableTicks = function () { return entity.charging }
  entity.isAlive = function () { return entity.alive }
  entity.isRemoved = function () { return entity.removed }
  entity.level = function () { return { isClientSide: function () { return entity.client } } }
  entity.getPhaseManager = function () { return { getCurrentPhase: function () { return {
    getPhase: function () { return { equals: function (phase) { return entity.phase === phase } } }
  } } } }
  return entity
}
function bossTestJoin(entity, fromDisk) {
  bossTestHandlers.join({ getEntity: function () { return entity }, getLevel: function () { return entity.level() },
    loadedFromDisk: function () { return Boolean(fromDisk) } })
}
function bossTestAttack(attacker, type, amount, victim) {
  var event = {
    getEntity: function () { return victim || attacker },
    getSource: function () { return { getEntity: function () { return attacker }, is: function (id) { return id === type } } },
    amount: amount, getAmount: function () { return this.amount }, setAmount: function (value) { this.amount = value }
  }
  bossTestHandlers.damage(event)
  return event.amount
}
function runBossProfileTests() {
  var passed = 0
  function equal(actual, expected, label) {
    if (actual !== expected) throw new Error(label + ': expected ' + expected + ', got ' + actual)
  }
  function scenario(name, action) {
    try { action(); passed++ } catch (error) { throw new Error(name + ': ' + error) }
  }
  var cases = [
    ['minecraft:wither', 300, 600, 'Bulwark Fiery', 'frontier'],
    ['minecraft:ender_dragon', 200, 1000, 'Bulwark', 'ascent'],
    ['minecraft:warden', 500, 1024, 'Bulwark Gravity', 'summit']
  ]
  cases.forEach(function (entry) {
    scenario(entry[0] + ' gets its fixed profile and matching Infernal health cache', function () {
      var entity = bossTestEntity(entry[0], entry[1], entry[1])
      bossTestJoin(entity, false); equal(entity.infernalAdds, 0, 'deferred application'); entity.server.flush()
      equal(entity.getMaxHealth(), entry[2], 'maximum'); equal(entity.health, entry[2], 'fresh HP')
      equal(entity.infernal.names, entry[3], 'modifiers'); equal(entity.appliedTier, entry[4], 'tier')
      equal(entity.rawData.values.tier_augments_applied, true, 'Apotheosis lifecycle marker')
      equal(entity.rawData.values.infernalMaxHealth, entry[2], 'saved Infernal maximum')
      equal(entity.infernal.maximum, entry[2], 'cached maximum'); equal(entity.infernal.health, entry[2], 'cached HP')
    })
    scenario(entry[0] + ' retains damage across repeated disk joins', function () {
      var entity = bossTestEntity(entry[0], entry[1], entry[1])
      bossTestJoin(entity); entity.server.flush(); entity.health = entry[2] / 4
      bossTestJoin(entity, true); entity.server.flush(); bossTestJoin(entity, true); entity.server.flush()
      equal(entity.health, entry[2] / 4, 'HP'); equal(entity.getMaxHealth(), entry[2], 'no stacked HP')
      equal(entity.infernalAdds, 1, 'chain not rebuilt'); equal(entity.infernal.health, entry[2] / 4, 'cached HP')
    })
    scenario(entry[0] + ' values do not depend on player count or nearby tiers', function () {
      var entity = bossTestEntity(entry[0], entry[1], entry[1])
      entity.server.players = new Array(20); entity.appliedTier = 'pinnacle'
      bossTestJoin(entity); entity.server.flush()
      equal(entity.getMaxHealth(), entry[2], 'maximum'); equal(entity.appliedTier, entry[4], 'fixed tier')
    })
  })
  scenario('Damaged old boss migrates without healing to full', function () {
    var entity = bossTestEntity('minecraft:wither', 150, 300)
    entity.infernal = new BossTestModifiers('Regen 1UP Berserk')
    entity.rawData.values.InfernalMobsMod = entity.infernal.names
    entity.rawData.values.infernalMaxHealth = 300
    bossTestJoin(entity, true); entity.server.flush()
    equal(entity.health, 300, 'half of new maximum'); equal(entity.infernal.names, 'Bulwark Fiery', 'replacement')
    equal(entity.infernalRemovals, 1, 'old chain removed')
  })
  scenario('Old distance bonuses are removed without touching unrelated modifiers', function () {
    var entity = bossTestEntity('minecraft:wither', 200, 300)
    entity.attributes.max_health.modifiers['autoleveling:level'] = 100
    entity.attributes.armor.modifiers.unrelated = 5
    entity.rawData.values.LEVEL = 100
    bossTestJoin(entity, true); entity.server.flush()
    equal(entity.health, 300, 'original half-health fraction')
    equal(entity.rawData.contains('LEVEL'), false, 'level marker removed')
    equal(entity.attributes.armor.modifiers.unrelated, 5, 'unrelated modifier retained')
    equal(entity.attributes.projectile_bonus.modifiers['autoleveling:level'], undefined, 'projectile bonus removed')
    equal(entity.tierRemovals.join(','), 'haven,frontier,ascent,summit,pinnacle', 'all old tier augments removed')
  })
  scenario('Fresh charging Wither starts with full profile HP', function () {
    var entity = bossTestEntity('minecraft:wither', 100, 300)
    entity.charging = 220; bossTestJoin(entity); entity.server.flush(); equal(entity.health, 600, 'HP')
  })
  scenario('Disk-loaded charging Wither does not get a free heal', function () {
    var entity = bossTestEntity('minecraft:wither', 100, 300)
    entity.charging = 100; bossTestJoin(entity, true); entity.server.flush(); equal(entity.health, 200, 'HP')
  })
  scenario('Duplicate joins do not stack health or heal twice', function () {
    var entity = bossTestEntity('minecraft:wither', 100, 300)
    entity.charging = 220; bossTestJoin(entity); bossTestJoin(entity); entity.server.flush()
    equal(entity.getMaxHealth(), 600, 'maximum'); equal(entity.infernalAdds, 1, 'one chain')
  })
  ;['minecraft:zombie', 'minecraft:wither_skeleton'].forEach(function (type) {
    scenario(type + ' remains unchanged', function () {
      var entity = bossTestEntity(type, 20, 20)
      bossTestJoin(entity); entity.server.flush(); equal(entity.health, 20, 'HP'); equal(entity.infernalAdds, 0, 'no profile')
    })
  })
  ;['client', 'dead', 'removed', 'dying dragon'].forEach(function (reason) {
    scenario('No mutation for ' + reason, function () {
      var entity = bossTestEntity('minecraft:ender_dragon', 200, 200)
      if (reason === 'client') entity.client = true
      if (reason === 'dead') entity.alive = false
      if (reason === 'removed') entity.removed = true
      if (reason === 'dying dragon') entity.phase = 'dying'
      bossTestJoin(entity, true); entity.server.flush(); equal(entity.infernalAdds, 0, 'unchanged')
    })
  })
  var attackCases = [
    ['minecraft:wither', 'wither_skull', 12], ['minecraft:wither', 'explosion', 12],
    ['minecraft:wither', 'player_explosion', 12], ['minecraft:wither', 'magic', 10],
    ['minecraft:ender_dragon', 'mob', 12.5], ['minecraft:ender_dragon', 'dragon_breath', 10],
    ['minecraft:warden', 'mob', 11.5], ['minecraft:warden', 'sonic_boom', 12],
    ['minecraft:zombie', 'mob', 10], ['minecraft:wither_skeleton', 'mob', 10]
  ]
  attackCases.forEach(function (entry) {
    scenario('Attack multiplier: ' + entry[0] + ' / ' + entry[1], function () {
      var entity = bossTestEntity(entry[0], 200, 200)
      equal(bossTestAttack(entity, entry[1], 10), entry[2], 'damage')
    })
  })
  scenario('No reduction of high Warden damage to Infernal maxDamage', function () {
    var entity = bossTestEntity('minecraft:warden', 500, 500)
    equal(Math.round(bossTestAttack(entity, 'mob', 100) * 100) / 100, 115, 'uncapped damage')
  })
  scenario('No extra damage for blocked or zero-damage attacks', function () {
    var entity = bossTestEntity('minecraft:warden', 500, 500)
    equal(bossTestAttack(entity, 'sonic_boom', 0), 0, 'zero damage')
  })
  scenario('Damage hook ignores the client', function () {
    var entity = bossTestEntity('minecraft:warden', 500, 500)
    entity.client = true; equal(bossTestAttack(entity, 'mob', 10), 10, 'damage')
  })
  scenario('Missing required Infernal modifier fails visibly', function () {
    var entity = bossTestEntity('minecraft:wither', 300, 300), failed = false
    entity.missingInfernalModifier = true; bossTestJoin(entity)
    try { entity.server.flush() } catch (error) { failed = true }
    equal(failed, true, 'must fail'); equal(entity.persistentData.contains('trialforged_boss_profile_version'), false, 'no success marker')
  })
  scenario('Unexpected health modifiers fail instead of reporting false target HP', function () {
    var entity = bossTestEntity('minecraft:wither', 300, 300), failed = false
    entity.attributes.max_health.modifiers.unrelated = 50; bossTestJoin(entity)
    try { entity.server.flush() } catch (error) { failed = true }
    equal(failed, true, 'must fail'); equal(entity.persistentData.contains('trialforged_boss_profile_version'), false, 'no success marker')
  })
  return passed
}
