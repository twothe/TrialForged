/** Runs current pack contracts and verifies native always-infernal boss configuration. */
require('./check-apotheosis-progression.cjs')
require('./check-level-loot.cjs')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const infernal = JSON.parse(fs.readFileSync(path.join(root, 'config/infernalmobs.cfg'), 'utf8'))
for (const name of ['WitherBoss', 'EnderDragon', 'Warden']) {
  assert.equal(infernal.permittedentities[name], true)
  assert.equal(infernal.entitiesalwaysinfernal[name], true)
}
assert.equal(fs.existsSync(path.join(root, 'kubejs/server_scripts/vanilla_boss_profiles.js')), false)
console.log('PASS: 3 native always-infernal bosses; custom boss profile handler removed.')
