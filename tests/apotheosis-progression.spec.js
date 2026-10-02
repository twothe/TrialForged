/**
 * Contract tests for the actual production event handlers. Minecraft, NBT and
 * Apotheosis are boundary fakes; progression and participation rules are not
 * reimplemented here. Compatible with Node and the installed KubeJS Rhino.
 */
var testHandlers = {}
var testMessages = []
var console = { info: function () {}, error: function (message) { testMessages.push(message) } }
var Text = { of: function (value) { return { gold: function () { return value } } } }

function TestTag() { this.values = {} }
TestTag.prototype.contains = function (key, type) {
  return Object.prototype.hasOwnProperty.call(this.values, key)
    && (type == null || this.values[key].type === type)
}
TestTag.prototype.getInt = function (key) { return this.contains(key, 3) ? this.values[key].value : 0 }
TestTag.prototype.putInt = function (key, value) { this.values[key] = { type: 3, value: value } }
TestTag.prototype.getLong = function (key) { return this.contains(key, 4) ? this.values[key].value : 0 }
TestTag.prototype.putLong = function (key, value) { this.values[key] = { type: 4, value: value } }
TestTag.prototype.getDouble = function (key) { return this.contains(key, 6) ? this.values[key].value : 0 }
TestTag.prototype.putDouble = function (key, value) { this.values[key] = { type: 6, value: value } }
TestTag.prototype.getBoolean = function (key) { return this.contains(key, 1) && this.values[key].value }
TestTag.prototype.putBoolean = function (key, value) { this.values[key] = { type: 1, value: value } }
TestTag.prototype.getCompound = function (key) { return this.contains(key, 10) ? this.values[key].value : new TestTag() }
TestTag.prototype.put = function (key, value) { this.values[key] = { type: 10, value: value } }

var testTiers = ['haven', 'frontier', 'ascent', 'summit', 'pinnacle'].map(function (name, index) {
  return {
    ordinal: function () { return index },
    getSerializedName: function () { return name },
    getUnlockAdvancement: function () { return 'apotheosis:progression/' + name }
  }
})
var testWorldTier = {
  HAVEN: testTiers[0], FRONTIER: testTiers[1], ASCENT: testTiers[2], SUMMIT: testTiers[3], PINNACLE: testTiers[4],
  getTier: function (player) { return player.tier },
  setTier: function (player, tier) { player.tier = tier; player.tutorial = false; player.setterCalls++ }
}
function TestPlayer(server, id, tier) {
  this.server = server
  this.id = id
  this.tier = testTiers[tier == null ? 0 : tier]
  this.tutorial = true
  this.setterCalls = 0
  this.persistentData = new TestTag()
  this.dimension = 'overworld'
  this.alive = true
  this.distanceSquared = 0
  this.messages = []
  this.advancements = []
  server.players.push(this)
}
TestPlayer.prototype.getUUID = function () { return this.id }
TestPlayer.prototype.level = function () { return testLevel(this.server, this.dimension) }
TestPlayer.prototype.isAlive = function () { return this.alive }
TestPlayer.prototype.distanceToSqr = function () { return this.distanceSquared }
TestPlayer.prototype.tell = function (message) { this.messages.push(message) }
TestPlayer.prototype.getAdvancements = function () {
  var player = this
  return { award: function (advancement, criterion) {
    if (criterion !== 'milestone') throw new Error('Unexpected advancement criterion')
    if (player.advancements.indexOf(advancement) < 0) player.advancements.push(advancement)
  } }
}
function TestFakePlayer(server, id) { TestPlayer.call(this, server, id) }
TestFakePlayer.prototype = Object.create(TestPlayer.prototype)
TestFakePlayer.prototype.constructor = TestFakePlayer
var testDyingPhase = {}
var Java = { loadClass: function (name) {
  var classes = {
    'dev.shadowsoffire.apotheosis.tiers.WorldTier': testWorldTier,
    'net.minecraft.server.level.ServerPlayer': TestPlayer,
    'net.neoforged.neoforge.common.util.FakePlayer': TestFakePlayer,
    'net.minecraft.nbt.CompoundTag': TestTag,
    'net.minecraft.world.entity.boss.enderdragon.phases.EnderDragonPhase': { DYING: testDyingPhase }
  }
  if (!classes[name]) throw new Error('Unexpected Java class: ' + name)
  return classes[name]
} }
var EntityEvents = {
  afterHurt: function (handler) { testHandlers.afterHurt = handler },
  death: function (handler) { testHandlers.death = handler }
}
var PlayerEvents = {
  loggedIn: function (handler) { testHandlers.loggedIn = handler },
  respawned: function (handler) { testHandlers.respawned = handler },
  cloned: function (handler) { testHandlers.cloned = handler }
}
var ServerEvents = { loaded: function (handler) { testHandlers.loaded = handler } }
function testServer() {
  var server = { players: [], pending: [], time: 10000, missingAdvancement: false }
  server.getPlayerList = function () { return { getPlayers: function () {
    return { size: function () { return server.players.length }, get: function (index) { return server.players[index] } }
  } } }
  server.getAdvancements = function () { return { get: function (id) { return server.missingAdvancement ? null : id } } }
  server.scheduleInTicks = function (ticks, callback) {
    if (ticks !== 1) throw new Error('Unexpected delay')
    server.pending.push(callback)
  }
  server.flush = function () {
    server.time++
    while (server.pending.length) server.pending.shift()()
  }
  return server
}
function testLevel(server, dimension) {
  return { getGameTime: function () { return server.time }, dimension: function () {
    return { equals: function (other) { return other.id === dimension }, id: dimension }
  } }
}
function testMob(server, type, health) {
  return {
    server: server, type: type, persistentData: new TestTag(), defeated: true, dying: false, killCredit: null,
    getMaxHealth: function () { return health == null ? 200 : health },
    level: function () { return testLevel(server, 'overworld') },
    isDeadOrDying: function () { return this.defeated },
    getKillCredit: function () { return this.killCredit },
    getPhaseManager: function () { var mob = this; return { getCurrentPhase: function () { return {
      getPhase: function () { return { equals: function (phase) { return mob.dying && phase === testDyingPhase } } }
    } } } }
  }
}
function testHit(mob, player, damage) {
  testHandlers.afterHurt({ entity: mob, source: { getEntity: function () { return player } }, damage: damage })
}
function testDeath(mob, player) {
  testHandlers.death({ entity: mob, source: { getEntity: function () { return player } } })
}
function runProgressionTests() {
  var passed = 0
  function equal(actual, expected, label) {
    if (actual !== expected) throw new Error(label + ': expected ' + expected + ', received ' + actual)
  }
  function scenario(name, action) {
    try { action(); passed++ } catch (error) { throw new Error(name + ': ' + error) }
  }
  scenario('Haven activates immediately without a tier downgrade', function () {
    var player = new TestPlayer(testServer(), 'new')
    testHandlers.loggedIn({ player: player })
    equal(player.tier.ordinal(), 0, 'tier'); equal(player.tutorial, false, 'tutorial')
    equal(player.advancements.length, 1, 'Haven advancement')
  })
  scenario('Normal wither skeleton kill awards Frontier', function () {
    var server = testServer(), player = new TestPlayer(server, 'killer')
    testDeath(testMob(server, 'minecraft:wither_skeleton', 20), player); server.flush()
    equal(player.tier.ordinal(), 1, 'tier'); equal(player.messages.length, 1, 'announcement')
  })
  scenario('Environmental skeleton death uses vanilla kill credit', function () {
    var server = testServer(), player = new TestPlayer(server, 'killer'), mob = testMob(server, 'minecraft:wither_skeleton')
    mob.killCredit = player; testDeath(mob, null); server.flush(); equal(player.tier.ordinal(), 1, 'tier')
  })
  scenario('Unattributed deaths and unrelated mobs do not progress', function () {
    var server = testServer(), player = new TestPlayer(server, 'bystander')
    testDeath(testMob(server, 'minecraft:wither_skeleton'), null)
    testDeath(testMob(server, 'minecraft:zombie'), player); server.flush(); equal(player.tier.ordinal(), 0, 'tier')
  })
  var bossCases = [['minecraft:wither', 2], ['minecraft:ender_dragon', 3], ['minecraft:warden', 4]]
  bossCases.forEach(function (bossCase) {
    scenario(bossCase[0] + ' awards its tier directly', function () {
      var server = testServer(), player = new TestPlayer(server, 'killer'), mob = testMob(server, bossCase[0])
      // NeoForge may dispatch death before the lethal post-damage event.
      testDeath(mob, player); testHit(mob, player, 200); server.flush()
      equal(player.tier.ordinal(), bossCase[1], 'tier')
      equal(player.advancements.length, bossCase[1] + 1, 'all preceding unlocks')
    })
  })
  scenario('Two participants receive credit and a bystander does not', function () {
    var server = testServer(), first = new TestPlayer(server, 'first'), second = new TestPlayer(server, 'second')
    var spectator = new TestPlayer(server, 'spectator'), mob = testMob(server, 'minecraft:wither')
    testHit(mob, first, 100); testHit(mob, second, 100); testDeath(mob, second); server.flush()
    equal(first.tier.ordinal(), 2, 'first'); equal(second.tier.ordinal(), 2, 'second'); equal(spectator.tier.ordinal(), 0, 'bystander')
  })
  scenario('A token finishing hit alone does not qualify', function () {
    var server = testServer(), player = new TestPlayer(server, 'token'), mob = testMob(server, 'minecraft:wither')
    testHit(mob, player, 1); testDeath(mob, player); server.flush(); equal(player.tier.ordinal(), 0, 'tier')
  })
  scenario('Exactly five percent damage qualifies', function () {
    var server = testServer(), player = new TestPlayer(server, 'qualified'), mob = testMob(server, 'minecraft:warden', 500)
    testHit(mob, player, 25); testDeath(mob, null); server.flush(); equal(player.tier.ordinal(), 4, 'tier')
  })
  scenario('Zero damage does not qualify', function () {
    var server = testServer(), player = new TestPlayer(server, 'immune'), mob = testMob(server, 'minecraft:wither')
    testHit(mob, player, 0); testDeath(mob, player); server.flush(); equal(player.tier.ordinal(), 0, 'tier')
  })
  scenario('Old participation expires', function () {
    var server = testServer(), player = new TestPlayer(server, 'old'), mob = testMob(server, 'minecraft:wither')
    testHit(mob, player, 100); server.time += 1201; testDeath(mob, null); server.flush(); equal(player.tier.ordinal(), 0, 'tier')
  })
  scenario('New token hit does not resurrect an expired contribution', function () {
    var server = testServer(), player = new TestPlayer(server, 'old'), mob = testMob(server, 'minecraft:wither')
    testHit(mob, player, 100); server.time += 1201; testHit(mob, player, 1)
    testDeath(mob, player); server.flush(); equal(player.tier.ordinal(), 0, 'tier')
  })
  ;['distance', 'dimension', 'dead', 'offline'].forEach(function (reason) {
    scenario('Ineligible participant: ' + reason, function () {
      var server = testServer(), player = new TestPlayer(server, 'absent'), mob = testMob(server, 'minecraft:wither')
      testHit(mob, player, 100)
      if (reason === 'distance') player.distanceSquared = 129 * 129
      if (reason === 'dimension') player.dimension = 'nether'
      if (reason === 'dead') player.alive = false
      if (reason === 'offline') server.players = []
      testDeath(mob, null); server.flush(); equal(player.tier.ordinal(), 0, 'tier')
    })
  })
  scenario('Fake players cannot unlock personal tiers', function () {
    var server = testServer(), fake = new TestFakePlayer(server, 'automation'), mob = testMob(server, 'minecraft:wither')
    testHandlers.loggedIn({ player: fake }); testHit(mob, fake, 200); testDeath(mob, fake)
    testDeath(testMob(server, 'minecraft:wither_skeleton'), fake); server.flush(); equal(fake.tier.ordinal(), 0, 'tier')
  })
  scenario('Cancelled deaths do not progress', function () {
    var server = testServer(), player = new TestPlayer(server, 'killer'), mob = testMob(server, 'minecraft:wither')
    testHit(mob, player, 200); testDeath(mob, player); mob.defeated = false; server.flush(); equal(player.tier.ordinal(), 0, 'tier')
  })
  scenario('Dragon death animation counts despite restored health', function () {
    var server = testServer(), player = new TestPlayer(server, 'killer'), mob = testMob(server, 'minecraft:ender_dragon')
    mob.defeated = false; mob.dying = true; testHit(mob, player, 200)
    testDeath(mob, player); server.flush(); equal(player.tier.ordinal(), 3, 'tier')
  })
  scenario('Lower milestones cannot downgrade a player', function () {
    var server = testServer(), player = new TestPlayer(server, 'veteran', 4)
    testDeath(testMob(server, 'minecraft:wither_skeleton'), player); server.flush()
    equal(player.tier.ordinal(), 4, 'tier'); equal(player.messages.length, 0, 'no false announcement')
  })
  scenario('Existing Apotheosis progress is preserved on first login', function () {
    var player = new TestPlayer(testServer(), 'existing', 3)
    testHandlers.loggedIn({ player: player }); equal(player.tier.ordinal(), 3, 'tier')
    equal(player.persistentData.getInt('trialforged_highest_apotheosis_tier'), 3, 'stored floor')
  })
  scenario('Reconnect restores the persisted high-water mark', function () {
    var player = new TestPlayer(testServer(), 'returning')
    player.persistentData.putInt('trialforged_highest_apotheosis_tier', 3)
    testHandlers.loggedIn({ player: player }); equal(player.tier.ordinal(), 3, 'tier')
  })
  scenario('Clone and respawn preserve progress', function () {
    var server = testServer(), oldPlayer = new TestPlayer(server, 'same', 4), player = new TestPlayer(server, 'same')
    testHandlers.loggedIn({ player: oldPlayer })
    testHandlers.cloned({ oldPlayer: oldPlayer, player: player }); testHandlers.respawned({ player: player })
    equal(player.tier.ordinal(), 4, 'tier')
  })
  scenario('Repeated deaths do not duplicate announcements', function () {
    var server = testServer(), player = new TestPlayer(server, 'killer'), mob = testMob(server, 'minecraft:wither')
    testHit(mob, player, 200); testDeath(mob, player); server.flush(); testDeath(mob, player); server.flush()
    equal(player.messages.length, 1, 'announcements')
  })
  scenario('Malformed persisted state fails visibly', function () {
    var player = new TestPlayer(testServer(), 'corrupt'), failed = false
    player.persistentData.putDouble('trialforged_highest_apotheosis_tier', 2)
    try { testHandlers.loggedIn({ player: player }) } catch (error) { failed = true }
    equal(failed, true, 'must fail'); equal(player.setterCalls, 0, 'no state mutation')
  })
  scenario('Missing advancements fail before changing the tier', function () {
    var server = testServer(), player = new TestPlayer(server, 'missing'), failed = false
    server.missingAdvancement = true
    try { testHandlers.loggedIn({ player: player }) } catch (error) { failed = true }
    equal(failed, true, 'must fail'); equal(player.setterCalls, 0, 'no tier mutation')
  })
  scenario('Server load reconciles online players', function () {
    var server = testServer(), player = new TestPlayer(server, 'online')
    player.persistentData.putInt('trialforged_highest_apotheosis_tier', 2)
    testHandlers.loaded({ server: server }); equal(player.tier.ordinal(), 2, 'tier')
  })
  return passed
}
