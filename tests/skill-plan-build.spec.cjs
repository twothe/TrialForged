/** Native-output regression checks use the production compiler and explicit contracts, never a second compiler. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { compile } = require('../tools/skill-plan/build.cjs')
const plan = require('../tools/skill-plan/plan.json')
const base = 'kubejs/data/trialforged/puffish_skills/categories/skills/'
test('native plan preserves every node ID and shared definition, rounds positions and keeps zero start points', () => {
  const files = compile(plan), skills = files[base + 'skills.json'], definitions = files[base + 'definitions.json']
  assert.equal(Object.keys(skills).length, 90)
  assert.equal(Object.keys(definitions).length, 42)
  assert.deepEqual(Object.keys(skills), plan.trees[0].skills.map(node => node.id))
  for (const value of Object.values(skills)) {
    assert.ok(Number.isInteger(value.x) && Number.isInteger(value.y))
    assert.ok(definitions[value.definition])
  }
  assert.equal(files[base + 'category.json'].starting_points, 0)
  assert.equal(files[base + 'category.json'].exclusive_root, true)
  assert.equal(files[base + 'connections.json'].normal.bidirectional.length, 96)
  const copies = plan.trees[0].skills.filter(node => node.name === 'Magic Resilience')
  assert.equal(new Set(copies.map(node => skills[node.id].definition)).size, 1)
})
test('regeneration uses both native mana attributes and Needful Taste owns a reversible native tag', () => {
  const definitions = Object.values(compile(plan)[base + 'definitions.json'])
  assert.deepEqual(definitions.find(skill => skill.title === 'Regeneration').rewards.map(reward => reward.data.attribute),
    ['ars_nouveau:ars_nouveau.perk.mana_regen', 'irons_spellbooks:mana_regen'])
  assert.deepEqual(definitions.find(skill => skill.title === 'Needful Taste').rewards,
    [{ type: 'puffish_skills:tag', data: { tag: 'trialforged_needful_taste' } }])
  assert.equal(definitions.find(skill => skill.title === 'Blacksmith').rewards[0].data.value, -0.2)
})
test('extensions preserve existing IDs and unreviewed custom mechanics fail visibly', () => {
  const extended = structuredClone(plan)
  extended.definitions[0].implementation = 'New unsupported behavior'
  assert.throws(() => compile(extended), /reviewed adapter/)
  extended.definitions[0].implementation = ''
  extended.definitions.push({ ...structuredClone(plan.definitions[0]), name: 'Future skill', effects: [] , implementation: 'No effect yet' })
  extended.trees[0].skills.push({ id: 'future_node', name: 'Future skill', q: 100, r: 100, root: false })
  extended.trees[0].connections.push({ from: extended.trees[0].skills[0].id, to: 'future_node', type: 'normal' })
  assert.throws(() => compile(extended), /reviewed adapter/)
  extended.definitions.at(-1).implementation = ''
  extended.definitions.at(-1).effects = [{ attribute: 'minecraft:generic.max_health', operation: 'add_value', amount: 2 }]
  const expanded = compile(extended)[base + 'skills.json']
  assert.equal(Object.keys(expanded).length, 91)
  for (const node of plan.trees[0].skills) assert.ok(expanded[node.id])
})
test('checked-in native files exactly match their versioned source', () => {
  for (const [name, data] of Object.entries(compile(plan))) {
    assert.deepEqual(JSON.parse(fs.readFileSync(name, 'utf8')), data, name)
  }
})
