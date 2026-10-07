/** Ask the real client tooltip stack for normal/advanced gem and affix text; no synthetic translations. */
let runtimeMagicClientChecked = false
let runtimeMagicClientTicks = 0
ClientEvents.tick(() => {
  let Minecraft = Java.loadClass('net.minecraft.client.Minecraft')
  let client = Minecraft.getInstance()
  if (runtimeMagicClientChecked || client.level === null || client.player === null) return
  runtimeMagicClientTicks++
  if (runtimeMagicClientTicks < 100) return
  runtimeMagicClientChecked = true
  let tooltips = {}
  try {
    let Gems = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.GemRegistry')
    let Purity = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.Purity')
    let Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
    let Context = Java.loadClass('net.minecraft.world.item.Item$TooltipContext')
    let Flag = Java.loadClass('net.minecraft.world.item.TooltipFlag')
    let Affixes = Java.loadClass('dev.shadowsoffire.apotheosis.affix.AffixRegistry')
    let AffixHelper = Java.loadClass('dev.shadowsoffire.apotheosis.affix.AffixHelper')
    let AffixInstance = Java.loadClass('dev.shadowsoffire.apotheosis.affix.AffixInstance')
    let Rarities = Java.loadClass('dev.shadowsoffire.apotheosis.loot.RarityRegistry')
    let tooltip = (stack, id, flags) => {
      let lines = stack.getTooltipLines(Context.of(client.level), client.player, flags)
      let text = []
      for (let index = 0; index < lines.size(); index++) text.push(String(lines.get(index).getString()))
      tooltips[id] = text
      if (text.join('\n').indexOf('trialforged.magic.') >= 0) throw new Error('Unresolved translation: ' + id)
      return text.join('\n')
    }
    for (let id of ['apothic_compats:ars_nouveau/mana', 'kaelos_gems:kaelos/archon_focus_rare_common',
      'kaelos_gems:kaelos/source_heart_rare_common', 'irons_apothic:core/golems_onyx', 'apotheosis:overworld/earth']) {
      let gem = Gems.INSTANCE.getValue(Location.parse(id))
      if (gem === null) throw new Error('Client gem registry missing ' + id)
      let stack = Gems.createGemStack(gem, Purity.PERFECT)
      let normal = tooltip(stack, id, Flag.NORMAL)
      tooltip(stack, id + '/advanced', Flag.ADVANCED)
      if (id.indexOf('mana') >= 0 && normal.indexOf("Ars + Iron's") < 0) throw new Error('Shared mana label absent')
      if (id.indexOf('archon_focus') >= 0 && normal.indexOf("Iron's") < 0) throw new Error('Iron school label absent')
      if (id === 'apothic_compats:ars_nouveau/mana' && normal.indexOf("+25 Max Mana (Ars + Iron's)") < 0) {
        throw new Error('Shared extra Curios mana bonus absent')
      }
      if (id === 'apotheosis:overworld/earth' && normal.indexOf('(Malum)') < 0) throw new Error('Extra Malum enchantment label absent')
    }
    let helmet = Item.of('minecraft:iron_helmet')
    let mana = Affixes.INSTANCE.holder(Location.parse('apothic_compats:armor/attribute/mana'))
    if (!mana.isBound()) throw new Error('Native mana affix fixture missing')
    AffixHelper.setRarity(helmet, Rarities.INSTANCE.getValue(Location.parse('apotheosis:mythic')))
    AffixHelper.applyAffix(helmet, new AffixInstance(mana, 1,
      Rarities.INSTANCE.holder(Location.parse('apotheosis:mythic')), helmet))
    let text = tooltip(helmet, 'mana_affix', Flag.NORMAL)
    if (text.indexOf("Ars + Iron's") < 0) throw new Error('Affix source label absent')
    let weapon = Item.of('minecraft:iron_sword')
    AffixHelper.setRarity(weapon, Rarities.INSTANCE.getValue(Location.parse('apotheosis:mythic')))
    let effect = Affixes.INSTANCE.holder(Location.parse('apothic_compats:melee/mob_effect/mana_regen'))
    AffixHelper.applyAffix(weapon, new AffixInstance(effect, 1,
      Rarities.INSTANCE.holder(Location.parse('apotheosis:mythic')), weapon))
    if (tooltip(weapon, 'ars_effect_affix', Flag.NORMAL).indexOf('(Ars)') < 0) throw new Error('Ars effect affix label absent')
    let ordinary = tooltip(Item.of('ars_nouveau:sorcerer_robes'), 'ordinary_ars_item', Flag.NORMAL)
    if (ordinary.indexOf('Apotheosis:') >= 0 || ordinary.indexOf('Gem:') >= 0 || ordinary.indexOf('Resonance:') >= 0) {
      throw new Error('Ordinary mod item received Apotheosis source rows')
    }
    JsonIO.write('runtime-magic-client-result.json', { status: 'passed', tooltips: tooltips })
    console.info('[Runtime magic] MAGIC_CLIENT_TESTS_COMPLETE')
  } catch (error) {
    JsonIO.write('runtime-magic-client-result.json', { status: 'failed', error: String(error), tooltips: tooltips })
    console.error('[Runtime magic] CLIENT_FAILED: ' + error)
  }
})
