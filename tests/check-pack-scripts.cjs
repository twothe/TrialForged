/** Runs pack contract suites, then checks shared boss entities through both progression scripts. */
require('./check-apotheosis-progression.cjs')
require('./check-vanilla-boss-profiles.cjs')
require('./check-level-loot.cjs')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
function loadScope(files) {
  const scope = vm.createContext({})
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file })
  return scope
}
const bosses = loadScope(['tests/vanilla-boss-profiles.spec.js', 'kubejs/server_scripts/vanilla_boss_profiles.js'])
const progression = loadScope(['tests/apotheosis-progression.spec.js', 'kubejs/server_scripts/apotheosis_progression.js'])
const cases = [
  ['minecraft:wither', 300, 600, 2],
  ['minecraft:ender_dragon', 200, 1000, 3],
  ['minecraft:warden', 500, 1024, 4]
]
for (const [type, originalHealth, expectedHealth, expectedTier] of cases) {
  const server = progression.testServer()
  const entity = bosses.bossTestEntity(type, originalHealth, originalHealth)
  entity.persistentData = new progression.TestTag()
  entity.server = server
  entity.level = () => ({ ...progression.testLevel(server, 'overworld'), isClientSide: () => false })
  entity.isDeadOrDying = () => entity.defeated === true
  const first = new progression.TestPlayer(server, 'first')
  const second = new progression.TestPlayer(server, 'second')
  const bystander = new progression.TestPlayer(server, 'bystander')
  bosses.bossTestJoin(entity, false)
  server.flush()
  assert.equal(entity.getMaxHealth(), expectedHealth)
  // These are actual post-mitigation damage events, as consumed by progression.
  progression.testHit(entity, first, expectedHealth / 2)
  progression.testHit(entity, second, expectedHealth / 2)
  entity.defeated = true
  progression.testDeath(entity, second)
  server.flush()
  assert.equal(first.tier.ordinal(), expectedTier)
  assert.equal(second.tier.ordinal(), expectedTier)
  assert.equal(bystander.tier.ordinal(), 0)
  assert.equal(entity.getMaxHealth(), expectedHealth)
}
const server = progression.testServer()
const entity = bosses.bossTestEntity('minecraft:warden', 500, 500)
entity.persistentData = new progression.TestTag()
entity.server = server
entity.level = () => ({ ...progression.testLevel(server, 'overworld'), isClientSide: () => false })
entity.isDeadOrDying = () => entity.defeated === true
const players = Array.from({ length: 20 }, (_, index) => new progression.TestPlayer(server, 'player-' + index))
bosses.bossTestJoin(entity)
server.flush()
assert.equal(entity.getMaxHealth(), 1024)
for (const player of players) progression.testHit(entity, player, 51.2)
entity.defeated = true
progression.testDeath(entity, players[19])
server.flush()
assert.ok(players.every(player => player.tier.ordinal() === 4))
assert.equal(entity.getMaxHealth(), 1024)
console.log('PASS: 4 combined profile/progression scenarios, including equal-share credit for 20 players.')
