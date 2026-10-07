/** Exercise the production transformer against installed-definition fixtures and schema failures. */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const context = vm.createContext({ global: {}, console })
vm.runInContext(fs.readFileSync(path.join(root, 'kubejs/startup_scripts/magic_bonus_unification.js'), 'utf8'), context)
const api = context.global.TrialforgedMagic
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/magic-bonus-inventory-2026-10-06.json'), 'utf8'))
const normalize = value => JSON.parse(JSON.stringify(value))
const convert = id => {
  const definition = inventory.definitions.find(entry => entry.id === id)
  assert.ok(definition, id)
  return normalize(api.transform(definition.definition, definition.kind, () => true))
}
const manaGem = convert('apothic_compats:ars_nouveau/mana')
assert.equal(manaGem.bonuses[2].modifiers[0].attribute, 'puffish_attributes:magic_damage')
assert.equal(manaGem.bonuses[2].modifiers[0].operation, 'add_multiplied_base')
assert.equal(manaGem.bonuses[2].modifiers[0].values.perfect, 1.25)
assert.deepEqual(manaGem.bonuses[0].modifiers.map(entry => entry.attribute), [
  'ars_nouveau:ars_nouveau.perk.max_mana', 'irons_spellbooks:max_mana'
])
assert.deepEqual(manaGem.bonuses[0].modifiers.map(entry => entry.values.perfect), [200, 200])
assert.deepEqual(manaGem.bonuses[1].modifiers.map(entry => entry.operation), ['add_multiplied_total', 'add_multiplied_total'])
const extraMana = convert('apothic_compats:curios/ars_nouveau/mana')
assert.equal(extraMana.type, 'apotheosis:extra_gem_bonus')
assert.equal(extraMana.gem, 'apothic_compats:ars_nouveau/mana')
assert.deepEqual(extraMana.bonuses[0].modifiers.map(entry => entry.values.perfect), [25, 25])
const glyph = convert('kaelos_gems:kaelos/glyph_of_power_rare_common')
assert.equal(glyph.bonuses[0].modifiers[0].operation, 'add_value')
assert.equal(glyph.bonuses[0].modifiers[0].values.perfect, 2.025)
const school = inventory.definitions.find(entry => entry.id === 'irons_apothic:elemental/school_none/attribute')
const general = convert(school.id)
assert.equal(general.type, 'apotheosis:multi_attr')
assert.equal(general.modifiers[0].attribute, 'puffish_attributes:magic_damage')
assert.deepEqual(general.modifiers[0].values, school.definition.values)
const unknown = normalize(school.definition)
unknown.new_semantics = true
assert.throws(() => api.transform(unknown, 'affixes', () => true), /Unknown bonus field/)
assert.throws(() => api.transform(school.definition, 'affixes', () => false), /Missing target attribute/)
const badOperation = normalize(school.definition)
badOperation.operation = 'NEW_OPERATION'
assert.throws(() => api.transform(badOperation, 'affixes', () => true), /Unknown operation/)
const duplicate = normalize(manaGem)
assert.throws(() => api.transform(duplicate, 'gems', () => true), /Competing duplicate attribute/)
let transformed = 0
for (const definition of inventory.definitions) {
  const original = JSON.stringify(definition.definition)
  const result = api.transform(definition.definition, definition.kind, () => true)
  assert.equal(JSON.stringify(definition.definition), original, 'input stays immutable')
  if (result) transformed++
}
assert.ok(transformed > 20)
console.log(`PASS: ${transformed} eligible definitions transformed; flat/percent, paired mana, preserved curves and safe schema rejection.`)
