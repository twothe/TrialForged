/**
 * Converts native Apotheosis definitions without owning combat or mana state.
 * Values, conditions, resource IDs and unrelated fields come from installed mods.
 * Unknown schemas fail per resource; callers retain the original definition.
 */
global.TrialforgedMagic = (() => {
  let ars = 'ars_nouveau:ars_nouveau.perk.'
  let iron = 'irons_spellbooks:'
  let damage = 'puffish_attributes:magic_damage'
  let mana = [ars + 'max_mana', iron + 'max_mana']
  let regen = [ars + 'mana_regen', iron + 'mana_regen']
  let damageSources = [ars + 'spell_damage', iron + 'spell_power', 'lodestone:magic_proficiency']
  let operations = ['add_value', 'add_multiplied_base', 'add_multiplied_total']
  let clone = value => JSON.parse(JSON.stringify(value))
  let language = {}

  function label(attribute) {
    if (attribute.indexOf(ars) === 0) return 'Ars'
    if (attribute.indexOf(iron) === 0 || attribute.indexOf('aces_spell_utils:') === 0) return "Iron's"
    if (attribute.indexOf('malum:') === 0) return 'Malum'
    if (attribute === 'lodestone:magic_damage') return 'on hit'
    if (attribute === 'lodestone:magic_resistance') return 'magic hits'
    return ''
  }

  function validateValues(value) {
    if (value == null || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length === 0) {
      throw new Error('Attribute values must be a nonempty rarity/purity map')
    }
    function check(node) {
      if (typeof node === 'number') {
        if (!isFinite(node)) throw new Error('Nonfinite attribute value')
      } else if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (let key of Object.keys(node)) {
          if (['min', 'max', 'steps', 'step'].indexOf(key) < 0) throw new Error('Unknown value field: ' + key)
          check(node[key])
        }
      } else throw new Error('Unsupported attribute value: ' + JSON.stringify(node))
    }
    for (let key of Object.keys(value)) check(value[key])
  }

  function convertModifier(source, available) {
    let modifier = clone(source)
    if (typeof modifier.attribute !== 'string' || typeof modifier.operation !== 'string') {
      throw new Error('Missing attribute/operation in modifier')
    }
    let operation = modifier.operation.toLowerCase()
    if (operations.indexOf(operation) < 0) throw new Error('Unknown operation: ' + modifier.operation)
    validateValues(modifier.values)
    let keys = Object.keys(modifier)
    if (keys.some(key => ['attribute', 'operation', 'values'].indexOf(key) < 0)) {
      throw new Error('Unknown modifier fields: ' + keys.join(', '))
    }
    modifier.operation = operation
    if (damageSources.indexOf(modifier.attribute) >= 0) {
      if (!available(damage)) throw new Error('Missing target attribute: ' + damage)
      // Iron/Lodestone base 1 means ADD_VALUE is a power fraction, not damage points.
      modifier.operation = operation === 'add_value' && modifier.attribute === ars + 'spell_damage'
        ? 'add_value' : 'add_multiplied_base'
      modifier.attribute = damage
      return { modifiers: [modifier], label: '' }
    }
    let targets = mana.indexOf(modifier.attribute) >= 0 ? mana
      : regen.indexOf(modifier.attribute) >= 0 && (operation !== 'add_value' || modifier.attribute === regen[1]) ? regen : null
    if (targets) {
      for (let id of targets) if (!available(id)) throw new Error('Missing paired attribute: ' + id)
      // Native Ars base is zero; derived mana/rate arrives through an ADD_VALUE modifier.
      modifier.operation = targets === regen || operation !== 'add_value' ? 'add_multiplied_total' : 'add_value'
      return {
        modifiers: targets.map(id => Object.assign(clone(modifier), { attribute: id })),
        label: "Ars + Iron's"
      }
    }
    return { modifiers: [modifier], label: label(modifier.attribute) }
  }

  function convertList(sources, available) {
    let modifiers = []
    let visible = []
    let seen = {}
    for (let source of sources) {
      let converted = convertModifier(source, available)
      let first = modifiers.length
      for (let modifier of converted.modifiers) {
        // Future mods may already ship pairs. Do not double-apply either half.
        let key = modifier.attribute + '/' + modifier.operation
        if (seen[key]) throw new Error('Competing duplicate attribute: ' + key)
        seen[key] = true
        modifiers.push(modifier)
      }
      visible.push({ index: first + 1, label: converted.label })
    }
    let signature = visible.map(entry => entry.index + '_' + entry.label.replace(/[^a-zA-Z]/g, '').toLowerCase()).join('_')
    let desc = 'trialforged.magic.bonus.' + signature
    language[desc] = visible.map(entry => '%' + entry.index + '$s' + (entry.label ? ' (' + entry.label + ')' : '')).join(' / ')
    return { modifiers: modifiers, desc: desc }
  }

  function relevant(value) {
    if (!value || typeof value !== 'object') return false
    if (typeof value.attribute === 'string' && (label(value.attribute) || damageSources.indexOf(value.attribute) >= 0
      || mana.indexOf(value.attribute) >= 0 || regen.indexOf(value.attribute) >= 0)) return true
    return Object.keys(value).some(key => relevant(value[key]))
  }

  function convertBonus(bonus, available, gem) {
    let single = bonus.type === 'apotheosis:attribute' || (!gem && bonus.type === 'irons_apothic:attribute')
    let multi = bonus.type === (gem ? 'apotheosis:multi_attribute' : 'apotheosis:multi_attr')
    if (!single && !multi) {
      if (relevant(bonus)) throw new Error('Unsupported magic bonus codec: ' + bonus.type)
      return bonus
    }
    if (!relevant(bonus)) return bonus
    // School-aware Iron affixes must keep their custom codec and school checks.
    if (bonus.type === 'irons_apothic:attribute' && (!Array.isArray(bonus.schools) || bonus.schools.length)) {
      return bonus
    }
    let allowed = gem ? ['type', 'attribute', 'operation', 'values', 'gem_class', 'modifiers', 'desc']
      : ['type', 'attribute', 'operation', 'values', 'definition', 'categories', 'modifiers', 'desc', 'schools', 'neoforge:conditions']
    for (let key of Object.keys(bonus)) if (allowed.indexOf(key) < 0) throw new Error('Unknown bonus field: ' + key)
    let converted = convertList(single ? [{ attribute: bonus.attribute, operation: bonus.operation, values: bonus.values }] : bonus.modifiers, available)
    let result = clone(bonus)
    delete result.attribute
    delete result.operation
    delete result.values
    delete result.schools
    result.type = gem ? 'apotheosis:multi_attribute' : 'apotheosis:multi_attr'
    result.modifiers = converted.modifiers
    result.desc = converted.desc
    return result
  }

  function transform(source, kind, available) {
    if (!relevant(source)) return null
    let result = clone(source)
    if (kind === 'gems' || kind === 'extra_gem_bonuses') {
      let expectedType = kind === 'gems' ? 'apotheosis:gem' : 'apotheosis:extra_gem_bonus'
      if (result.type !== expectedType || !Array.isArray(result.bonuses)) throw new Error('Unknown gem schema')
      result.bonuses = result.bonuses.map(bonus => convertBonus(bonus, available, true))
    } else if (kind === 'affixes') result = convertBonus(result, available, false)
    else throw new Error('Unknown definition kind: ' + kind)
    return JSON.stringify(result) === JSON.stringify(source) ? null : result
  }

  /** Read loaded mod resources through Minecraft packs; close resource streams. */
  function scan(accept, warn) {
    let PackLoader = Java.loadClass('net.neoforged.neoforge.resource.ResourcePackLoader')
    let PackInfo = Java.loadClass('net.minecraft.server.packs.PackLocationInfo')
    let PackSource = Java.loadClass('net.minecraft.server.packs.repository.PackSource')
    let PackType = Java.loadClass('net.minecraft.server.packs.PackType')
    let Optional = Java.loadClass('java.util.Optional')
    let Component = Java.loadClass('net.minecraft.network.chat.Component')
    let Resource = Java.loadClass('net.minecraft.server.packs.resources.Resource')
    let JsonParser = Java.loadClass('com.google.gson.JsonParser')
    let HashSet = Java.loadClass('java.util.HashSet')
    let visited = new HashSet()
    let mods = Platform.getList().iterator()
    while (mods.hasNext()) {
      let modId = String(mods.next())
      if (['minecraft', 'neoforge', 'forge'].indexOf(modId) >= 0) continue
      let source = modId + '@' + Platform.getInfo(modId).getVersion()
      let pack = null
      try {
        let supplier = PackLoader.getPackFor(modId)
        if (supplier.isEmpty() || !visited.add(supplier.get())) continue
        pack = supplier.get().openPrimary(new PackInfo(source, Component.literal(source), PackSource.DEFAULT, Optional.empty()))
        let namespaces = pack.getNamespaces(PackType.SERVER_DATA).iterator()
        while (namespaces.hasNext()) {
          let namespace = String(namespaces.next())
          for (let kind of ['gems', 'affixes', 'extra_gem_bonuses']) {
            pack.listResources(PackType.SERVER_DATA, namespace, kind, (location, input) => {
              let id = String(location)
              if (!id.endsWith('.json')) return
              let stream = null
              try {
                stream = new Resource(pack, input).openAsReader()
                accept(id, kind, JSON.parse(String(JsonParser.parseReader(stream))), source)
              } catch (error) { warn(id, source, error) }
              finally { if (stream !== null) stream.close() }
            })
          }
        }
      } catch (error) { warn(source, source, error) }
      finally { if (pack !== null) pack.close() }
    }
  }

  return { transform: transform, scan: scan, label: label, language: language, relevant: relevant }
})()
