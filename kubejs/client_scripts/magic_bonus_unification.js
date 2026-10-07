/** Localized native descriptions only for Apotheosis bonuses, never global attribute names. */
ClientEvents.generateAssets('after_mods', event => {
  try {
    let available = id => Platform.isLoaded(id.split(':')[0])
    global.TrialforgedMagic.scan((id, kind, definition) => {
      global.TrialforgedMagic.transform(definition, kind, available)
    }, (id, source, error) => {
      console.warn('[Trialforged magic UI] Description skipped for ' + id + ' from ' + source + ': ' + error)
    })
    // Attribute components themselves remain localized by their owning mods.
    event.json('trialforged:lang/en_us.json', global.TrialforgedMagic.language)
    event.json('trialforged:lang/de_de.json', global.TrialforgedMagic.language)
  } catch (error) {
    console.error('[Trialforged magic UI] Description generation failed: ' + error + '. Check updated resource APIs.')
  }
})

// Aggregate item attribute lines can also contain a base item's own modifiers.
// Explicit source rows identify only native Apotheosis affixes/socket effects.
ItemEvents.modifyTooltips(event => {
  event.modifyAll(builder => builder.dynamic('trialforged_magic_sources'))
})

let trialforgedMagicTooltipFailed = false
ItemEvents.dynamicTooltips('trialforged_magic_sources', event => {
  try {
    let Minecraft = Java.loadClass('net.minecraft.client.Minecraft')
    let client = Minecraft.getInstance()
    if (client.level === null) return
    let AffixHelper = Java.loadClass('dev.shadowsoffire.apotheosis.affix.AffixHelper')
    let AttributeAffix = Java.loadClass('dev.shadowsoffire.apotheosis.affix.AttributeProvidingAffix')
    let EffectAffix = Java.loadClass('dev.shadowsoffire.apotheosis.affix.effect.MobEffectAffix')
    let GemItem = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.GemItem')
    let EffectBonus = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.bonus.MobEffectBonus')
    let EnchantmentBonus = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.bonus.EnchantmentBonus')
    let ExtraGems = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.ExtraGemBonusRegistry')
    let GemInstance = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.GemInstance')
    let Category = Java.loadClass('dev.shadowsoffire.apotheosis.loot.LootCategory')
    let SocketHelper = Java.loadClass('dev.shadowsoffire.apotheosis.socket.SocketHelper')
    if (String(event.item.id) !== 'apotheosis:gem' && !AffixHelper.hasAffixes(event.item)
      && SocketHelper.getGems(event.item).isEmpty()) return
    let RegistryOps = Java.loadClass('net.minecraft.resources.RegistryOps')
    let JsonOps = Java.loadClass('com.mojang.serialization.JsonOps')
    let Registry = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
    let Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
    let Component = Java.loadClass('net.minecraft.network.chat.Component')
    let ops = RegistryOps.create(JsonOps.INSTANCE, client.level.registryAccess())
    let rows = {}
    let ComponentCodec = Java.loadClass('net.minecraft.network.chat.ComponentSerialization')
    let TooltipContext = Java.loadClass('net.neoforged.neoforge.common.util.AttributeTooltipContext')
    let ItemContext = Java.loadClass('net.minecraft.world.item.Item$TooltipContext')
    let Flag = Java.loadClass('net.minecraft.world.item.TooltipFlag')
    let tooltipContext = TooltipContext.of(client.player, ItemContext.of(client.level), event.advanced ? Flag.ADVANCED : Flag.NORMAL)

    let encode = (value) => {
      return JSON.parse(String(value.getCodec().encodeStart(ops, value).getOrThrow()))
    }
    let collect = (value, attributes, effects) => {
      if (!value || typeof value !== 'object') return
      if (value.attribute) attributes.push(String(value.attribute))
      if (value.mob_effect) effects.push(String(value.mob_effect))
      for (let key of Object.keys(value)) collect(value[key], attributes, effects)
    }
    let addDefinition = (value, origin, effectsOnly) => {
      let attributes = []
      let effects = []
      collect(encode(value), attributes, effects)
      let pairedMana = attributes.indexOf('irons_spellbooks:max_mana') >= 0
        && attributes.indexOf('ars_nouveau:ars_nouveau.perk.max_mana') >= 0
      let pairedRegen = attributes.indexOf('irons_spellbooks:mana_regen') >= 0
        && attributes.indexOf('ars_nouveau:ars_nouveau.perk.mana_regen') >= 0
      if (!effectsOnly) for (let id of attributes) {
        if (pairedMana && id === 'irons_spellbooks:max_mana' || pairedRegen && id === 'irons_spellbooks:mana_regen') continue
        let label = global.TrialforgedMagic.label(id)
        if (pairedMana && id.endsWith('max_mana') || pairedRegen && id.endsWith('mana_regen')) label = "Ars + Iron's"
        if (!label) continue
        let attribute = Registry.ATTRIBUTE.get(Location.parse(id))
        if (attribute === null) throw new Error('Unknown tooltip attribute: ' + id)
        let name = Component.translatable(attribute.getDescriptionId()).getString()
        rows[origin + ': ' + name + ' (' + label + ')'] = true
      }
      for (let id of effects) {
        let label = global.TrialforgedMagic.label(id)
        // Effect IDs use ars_nouveau directly rather than its perk prefix.
        if (id.indexOf('ars_nouveau:') === 0) label = 'Ars'
        if (!label) continue
        let effect = Registry.MOB_EFFECT.get(Location.parse(id))
        if (effect === null) throw new Error('Unknown tooltip effect: ' + id)
        rows[origin + ': ' + Component.translatable(effect.getDescriptionId()).getString() + ' (' + label + ')'] = true
      }
    }
    let affixes = AffixHelper.getAffixes(event.item).values().iterator()
    while (affixes.hasNext()) {
      let instance = affixes.next()
      if (!instance.isValid()) continue
      let affix = instance.getAffix()
      if (affix instanceof AttributeAffix || affix instanceof EffectAffix) addDefinition(affix, 'Apotheosis', false)
      // Custom spell/imbue/mana-cost affixes are not ordinary attribute codecs.
      if (String(instance.affix().getId()).indexOf('irons_apothic:') === 0
        && !(affix instanceof AttributeAffix)) {
        rows['Apotheosis: ' + instance.getName(false).getString() + " (Iron's)"] = true
      }
    }

    let enchantmentLabels = value => {
      if (!value || typeof value !== 'object') return
      if (typeof value.translate === 'string' && value.translate.indexOf('enchantment.') === 0) {
        let namespace = value.translate.split('.')[1]
        let label = namespace === 'ars_nouveau' ? 'Ars' : global.TrialforgedMagic.label(namespace + ':')
        if (label) rows['Gem: ' + Component.translatable(value.translate).getString() + ' (' + label + ')'] = true
      }
      for (let key of Object.keys(value)) enchantmentLabels(value[key])
    }
    let gemSources = (holder, view, loose) => {
      if (holder === null || !holder.isBound()) return
      let visit = bonus => {
        if (!bonus.supports(view.purity())) return
        if (bonus instanceof EffectBonus) addDefinition(bonus, 'Gem', true)
        if (bonus instanceof EnchantmentBonus) {
          // Read the rendered enchantment component, not its holder codec: client
          // enchantment holders may belong to a different reload registry owner.
          let text = bonus.getSocketBonusTooltip(view, tooltipContext)
          enchantmentLabels(JSON.parse(String(ComponentCodec.CODEC.encodeStart(JsonOps.INSTANCE, text).getOrThrow())))
        }
      }
      if (loose) {
        let bonuses = holder.get().getBonuses().iterator()
        while (bonuses.hasNext()) visit(bonuses.next())
        let extras = ExtraGems.getBonusesFor(holder).iterator()
        while (extras.hasNext()) {
          let bonuses = extras.next().bonuses().iterator()
          while (bonuses.hasNext()) visit(bonuses.next())
        }
      } else {
        let bonus = view.getBonus()
        if (bonus.isPresent()) visit(bonus.get())
      }
      if (Platform.isLoaded('kaelos_gems')) {
        let Families = Java.loadClass('com.kaelo.gems.GemFamilies')
        let family = Families.familyOf(holder.getId())
        if (family !== null) {
          let label = global.TrialforgedMagic.label(String(family.attribute()))
          if (label) rows['Resonance: ' + label] = true
        }
      }
    }
    if (String(event.item.id) === 'apotheosis:gem') {
      let holder = GemItem.getGem(event.item)
      gemSources(holder, new GemInstance(holder, Category.forItem(event.item), GemItem.getPurity(event.item), event.item, 0), true)
    }
    let gems = SocketHelper.getGems(event.item).iterator()
    while (gems.hasNext()) {
      let instance = gems.next()
      gemSources(instance.gem(), instance, false)
    }
    for (let row of Object.keys(rows)) event.lines.add(Component.literal(row).withColor(0xAAAAAA))
  } catch (error) {
    if (!trialforgedMagicTooltipFailed) {
      trialforgedMagicTooltipFailed = true
      console.error('[Trialforged magic UI] Apotheosis source labels failed for ' + event.item.id + ': ' + error
        + '. Native tooltip retained; inspect updated Apotheosis/Kaelos codecs. Further hover errors suppressed until script reload.')
    }
  }
})
