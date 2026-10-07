/** Generate native overrides after mod data; higher-priority world packs remain authoritative. */
let trialforgedMagicExpected = []
ServerEvents.generateData('after_mods', event => {
  let prefix = '[Trialforged magic] '
  let converted = 0
  let skipped = 0
  let candidates = {}
  let sources = {}
  let issues = {}
  trialforgedMagicExpected = []
  try {
    let Registry = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
    let Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
    let JsonParser = Java.loadClass('com.google.gson.JsonParser')
    let JsonOps = Java.loadClass('com.mojang.serialization.JsonOps')
    let RegistryOps = Java.loadClass('net.minecraft.resources.RegistryOps')
    let MultiGem = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.bonus.MultiAttrBonus')
    let MultiAffix = Java.loadClass('dev.shadowsoffire.apotheosis.affix.effect.MultiAttrAffix')
    let Condition = Java.loadClass('net.neoforged.neoforge.common.conditions.ICondition')
    let ops = RegistryOps.create(JsonOps.INSTANCE, event.getRegistries().access())
    let validateSchema = (definition, kind) => {
      let bonuses = kind !== 'affixes' ? definition.bonuses : [definition]
      for (let bonus of bonuses) {
        if (typeof bonus.desc !== 'string' || bonus.desc.indexOf('trialforged.magic.bonus.') !== 0) continue
        let probe = JSON.parse(JSON.stringify(bonus))
        // Dynamic rarity holders do not exist yet. Probe the installed codec's
        // structure/attributes/operations without resolving rarity-map keys.
        for (let modifier of probe.modifiers) modifier.values = {}
        let codec = kind !== 'affixes' ? MultiGem.CODEC : MultiAffix.CODEC
        codec.parse(ops, JsonParser.parseString(JSON.stringify(probe))).getOrThrow()
      }
    }
    let available = id => Registry.ATTRIBUTE.containsKey(Location.parse(id))
    for (let id of ['puffish_attributes:magic_damage', 'ars_nouveau:ars_nouveau.perk.spell_damage',
      'ars_nouveau:ars_nouveau.perk.max_mana', 'ars_nouveau:ars_nouveau.perk.mana_regen',
      'irons_spellbooks:spell_power', 'irons_spellbooks:max_mana', 'irons_spellbooks:mana_regen']) {
      if (Platform.isLoaded(id.split(':')[0]) && !available(id)) {
        console.warn(prefix + 'Expected attribute missing: ' + id + '. Update the mapping before claiming this system is unified.')
      }
    }
    let warn = (id, source, error) => {
      skipped++
      let key = source + ': ' + error
      issues[key] = (issues[key] || 0) + 1
      if (issues[key] > 1) return
      console.warn(prefix + 'Kept original resource ' + id + ' from ' + source + ': ' + error
        + '. Review the updated codec/attribute IDs and tests/inspect-magic-bonuses.py. Repeated instances summarized below.')
    }
    global.TrialforgedMagic.scan((id, kind, definition, source) => {
      if (candidates[id]) {
        candidates[id].ambiguous = true
        warn(id, source, 'Duplicate mod resource; first source: ' + candidates[id].source)
      } else candidates[id] = { kind: kind, definition: definition, source: source }
    }, warn)
    for (let id of Object.keys(candidates)) {
      let candidate = candidates[id]
      if (candidate.ambiguous) continue
      try {
        let enabled = true
        for (let condition of candidate.definition['neoforge:conditions'] || []) {
          if (!Condition.CODEC.parse(JsonOps.INSTANCE, JsonParser.parseString(JSON.stringify(condition))).getOrThrow()
            .test(event.getRegistries())) { enabled = false; break }
        }
        if (!enabled) continue
        let result = global.TrialforgedMagic.transform(candidate.definition, candidate.kind, available)
        if (result === null) continue
        // Apotheosis rarity holders/enchantment registries are not bound at this stage.
        // Native decoding occurs during reload; the loaded registry is audited below.
        validateSchema(result, candidate.kind)
        event.json(id, result)
        converted++
        sources[candidate.source] = true
        trialforgedMagicExpected.push({ id: id.replace(/:(gems|affixes|extra_gem_bonuses)\//, ':').replace(/\.json$/, ''), kind: candidate.kind, source: candidate.source })
      } catch (error) { warn(id, candidate.source, error) }
    }
    console.info(prefix + 'Generated ' + converted + ' native overrides; skipped ' + skipped + ' incompatible resources. Values/conditions retained; existing IDs reused.')
    console.info(prefix + 'Converted data sources: ' + Object.keys(sources).sort().join(', '))
    for (let issue of Object.keys(issues)) if (issues[issue] > 1) {
      console.warn(prefix + 'Skipped ' + issues[issue] + ' resources with the same issue: ' + issue)
    }
  } catch (error) {
    console.error(prefix + 'Generation unavailable: ' + error + '. Original mod data remains active. Check KubeJS/NeoForge APIs after updates.')
  }
})

ServerEvents.loaded(event => {
  event.server.scheduleInTicks(1, () => {
    try {
      let Gems = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.GemRegistry')
      let Affixes = Java.loadClass('dev.shadowsoffire.apotheosis.affix.AffixRegistry')
      let ExtraGems = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.ExtraGemBonusRegistry')
      let Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
      let missing = 0
      for (let expected of trialforgedMagicExpected) {
        let registry = expected.kind === 'gems' ? Gems.INSTANCE : expected.kind === 'affixes' ? Affixes.INSTANCE : ExtraGems.INSTANCE
        if (registry.getValue(Location.parse(expected.id)) === null) {
          missing++
          console.error('[Trialforged magic] Generated definition did not load: ' + expected.id + ' from ' + expected.source
            + '. Inspect Apotheosis decoding errors above; update the converter for this codec.')
        }
      }
      console.info('[Trialforged magic] Loaded-registry audit: ' + trialforgedMagicExpected.length + ' expected definitions, ' + missing + ' missing.')
    } catch (error) {
      console.error('[Trialforged magic] Loaded-registry audit failed: ' + error + '. Check updated registry APIs.')
    }
  })
})
