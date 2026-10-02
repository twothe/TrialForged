/** Runs the production script against event boundary fakes and validates its datapack. */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const scope = vm.createContext({})
for (const file of ['tests/apotheosis-progression.spec.js', 'kubejs/server_scripts/apotheosis_progression.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file })
}
const passed = vm.runInContext('runProgressionTests()', scope)
const tiers = ['haven', 'frontier', 'ascent', 'summit', 'pinnacle']
for (const [index, tier] of tiers.entries()) {
  const advancement = JSON.parse(fs.readFileSync(path.join(root, 'kubejs/data/apotheosis/advancement/progression', tier + '.json'), 'utf8'))
  assert.deepEqual(advancement.criteria, { milestone: { trigger: 'minecraft:impossible' } })
  assert.deepEqual(advancement.requirements, [['milestone']])
  assert.equal(advancement.parent, 'apotheosis:progression/' + (index === 0 ? 'root' : tiers[index - 1]))
  assert.equal(advancement.display.show_toast, false)
}
assert.match(fs.readFileSync(path.join(root, 'config/apotheosis/apotheosis.cfg'), 'utf8'), /B:"Enable Manual World Tier Changes"=false/)
console.log(`PASS: ${passed} production-handler scenarios, 5 advancement overrides, manual selection disabled.`)
