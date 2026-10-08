/** Compiles the saved authoring plan into native Pufferfish data; stable node IDs own player unlocks. */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const model = require('../skill-planner/model.js')
const root = path.resolve(__dirname, '../..')
const sourceFile = path.join(__dirname, 'plan.json')
const regenerationAttributes = ['ars_nouveau:ars_nouveau.perk.mana_regen', 'irons_spellbooks:mana_regen']
const needfulTag = 'trialforged_needful_taste'

/** Explicit adapters prevent future custom instructions from silently becoming ineffective skills. */
function customRewards(skill) {
  if (!skill.implementation.trim()) return { rewards: [], descriptions: [] }
  if (skill.name === 'Mage' && skill.implementation === 'Magic damage bonus for all possible spells') {
    return { rewards: [], descriptions: [] }
  }
  if (skill.name === 'Regeneration' && skill.implementation === '10% more mana regeneration (all possible mods)') {
    return { rewards: regenerationAttributes.map(attribute => ({
      type: 'puffish_skills:attribute', data: { attribute, value: 0.1, operation: 'add_multiplied_total' }
    })), descriptions: ["+10% Mana Regeneration (Ars + Iron's)"] }
  }
  if (skill.name === 'Needful Taste'
    && skill.implementation === 'Anything consumed (food, potions) that give the player poison, hunger or other debuffs has a 50% chance not to do so.'
    && skill.acceptance.includes('for each negative effect')) {
    return { rewards: [{ type: 'puffish_skills:tag', data: { tag: needfulTag } }],
      descriptions: ['50% chance to avoid each harmful effect from consumed food and drinks.'] }
  }
  throw new Error('Custom implementation needs a reviewed adapter: ' + skill.name)
}

/** Returns all output paths before writing anything; unknown instructions or invalid plans fail atomically at validation. */
function compile(plan) {
  model.validate(plan)
  const warnings = model.issues(plan)
  if (warnings.length) throw new Error(warnings.join('\n'))
  const files = {}, namespaces = new Map()
  for (const tree of plan.trees) {
    const [namespace, category] = tree.category.split(':')
    if (!/^[a-z0-9_.-]+$/.test(namespace) || !/^[a-z_]+$/.test(category)) {
      throw new Error('Unsupported native category ID: ' + tree.category)
    }
    if (!namespaces.has(namespace)) namespaces.set(namespace, [])
    namespaces.get(namespace).push(category)
    const base = `kubejs/data/${namespace}/puffish_skills/categories/${category}`
    const definitions = {}, skills = {}
    const names = new Set(tree.skills.map(node => node.name))
    const keys = new Map()
    for (const definition of plan.definitions.filter(value => names.has(value.name))) {
      const key = 'definition_' + crypto.createHash('sha256').update(definition.name).digest('hex').slice(0, 24)
      keys.set(definition.name, key)
      const custom = customRewards(definition)
      const descriptions = [definition.description, ...definition.effects.map(model.effectText), ...custom.descriptions].filter(Boolean)
      definitions[key] = {
        title: definition.name,
        icon: { type: 'item', data: { item: definition.icon } },
        frame: { type: 'advancement', data: { frame: 'task' } },
        size: 26,
        ...(descriptions.length ? { description: descriptions.join('\n') } : {}),
        cost: definition.cost,
        required_skills: definition.requiredSkills,
        required_points: definition.requiredPoints,
        required_spent_points: definition.requiredSpentPoints,
        rewards: [...definition.effects.map(model.reward), ...custom.rewards]
      }
    }
    for (const node of tree.skills) {
      const position = model.position(node.q, node.r)
      skills[node.id] = { x: Math.round(position.x), y: Math.round(position.y), definition: keys.get(node.name), root: node.root }
    }
    const connections = { normal: { bidirectional: [], unidirectional: [] }, exclusive: { bidirectional: [], unidirectional: [] } }
    for (const link of tree.connections) {
      const group = link.type === 'exclusive' ? connections.exclusive : connections.normal
      group[link.type === 'directed' ? 'unidirectional' : 'bidirectional'].push([link.from, link.to])
    }
    files[`${base}/category.json`] = {
      title: tree.name, icon: { type: 'item', data: { item: 'minecraft:nether_star' } },
      background: 'minecraft:textures/block/deepslate.png', unlocked_by_default: true,
      exclusive_root: tree.exclusiveRoot, starting_points: 0, erase_on_death: false
    }
    files[`${base}/definitions.json`] = definitions
    files[`${base}/skills.json`] = skills
    files[`${base}/connections.json`] = connections
  }
  for (const [namespace, categories] of namespaces) {
    files[`kubejs/data/${namespace}/puffish_skills/config.json`] = { version: 3, categories }
  }
  return files
}

function build(input = sourceFile, check = false) {
  const plan = model.parse(fs.readFileSync(input, 'utf8'))
  const files = compile(plan)
  for (const [relative, value] of Object.entries(files)) {
    const file = path.join(root, relative), content = JSON.stringify(value, null, 2) + '\n'
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) throw new Error('Generated file differs: ' + relative)
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, content)
    }
  }
  if (!check && path.resolve(input) !== sourceFile) fs.writeFileSync(sourceFile, JSON.stringify(plan, null, 2) + '\n')
  console.log(`${check ? 'Verified' : 'Built'} ${plan.definitions.length} definitions, ${plan.trees.reduce((sum, tree) => sum + tree.skills.length, 0)} placements.`)
  return files
}

if (require.main === module) build(process.argv[2] === '--check' ? sourceFile : process.argv[2], process.argv[2] === '--check')
module.exports = { compile, build, customRewards, regenerationAttributes, needfulTag }
