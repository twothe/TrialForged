/** Real native magic pipeline/codec/equipment probe, copied only into the isolated test instance. */
PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(140, () => {
    let player = event.player
    let observations = []
    let cleanup = []
    try {
      let Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
      let Registry = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
      let RegistryKeys = Java.loadClass('net.minecraft.core.registries.Registries')
      let AttributeModifier = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
      let Operation = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation')
      let Attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
      let DamageSource = Java.loadClass('net.minecraft.world.damagesource.DamageSource')
      let FakePlayers = Java.loadClass('net.neoforged.neoforge.common.util.FakePlayerFactory')
      let Gems = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.GemRegistry')
      let Purity = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.Purity')
      let Affixes = Java.loadClass('dev.shadowsoffire.apotheosis.affix.AffixRegistry')
      let SocketHelper = Java.loadClass('dev.shadowsoffire.apotheosis.socket.SocketHelper')
      let StackModifiers = Java.loadClass('dev.shadowsoffire.apothic_attributes.modifiers.StackAttributeModifiers')
      let ModifierEvent = Java.loadClass('dev.shadowsoffire.apothic_attributes.modifiers.StackAttributeModifiersEvent')
      let JsonOps = Java.loadClass('com.mojang.serialization.JsonOps')
      let RegistryOps = Java.loadClass('net.minecraft.resources.RegistryOps')
      let ops = RegistryOps.create(JsonOps.INSTANCE, player.level.registryAccess())
      let check = (condition, message) => {
        if (!condition) throw new Error(message)
        observations.push(message)
      }
      let encode = (value) => {
        return JSON.parse(String(value.getCodec().encodeStart(ops, value).getOrThrow()))
      }
      let gem = (id) => {
        let value = Gems.INSTANCE.getValue(Location.parse(id))
        check(value !== null, 'native gem loaded: ' + id)
        return value
      }
      let arsGem = encode(gem('apothic_compats:ars_nouveau/mana'))
      check(arsGem.bonuses[2].modifiers[0].attribute === 'puffish_attributes:magic_damage'
        && arsGem.bonuses[2].modifiers[0].values.perfect === 1.25, 'Ars damage retains 125% on Pufferfish')
      check(arsGem.bonuses[0].modifiers.length === 2 && arsGem.bonuses[1].modifiers.length === 2,
        'native codec loaded paired mana and regeneration')
      let affix = Affixes.INSTANCE.getValue(Location.parse('irons_apothic:elemental/school_none/attribute'))
      check(affix !== null && encode(affix).modifiers[0].attribute === 'puffish_attributes:magic_damage',
        'native Iron generic affix converted')
      let Extras = Java.loadClass('dev.shadowsoffire.apotheosis.socket.gem.ExtraGemBonusRegistry')
      let extra = Extras.INSTANCE.getValue(Location.parse('apothic_compats:curios/ars_nouveau/mana'))
      check(extra !== null && encode(extra).bonuses[0].modifiers.length === 2
        && encode(extra).bonuses[0].modifiers[1].values.perfect === 25, 'native extra Curios bonus has shared +25 mana')

      let actor = FakePlayers.getMinecraft(player.level)
      let damageHolder = Registry.ATTRIBUTE.getHolder(Location.parse('puffish_attributes:magic_damage')).get()
      let damageAttribute = actor.getAttribute(damageHolder)
      let testIds = []
      let clear = () => {
        for (let id of testIds) damageAttribute['removeModifier(net.minecraft.resources.ResourceLocation)'](id)
        testIds = []
      }
      cleanup.push(clear)
      let add = (amount, operation) => {
        let id = Location.parse('trialforged:magic_probe_' + testIds.length)
        damageAttribute.addTransientModifier(new AttributeModifier(id, amount, operation))
        testIds.push(id)
      }
      let hit = (type, expected, amount) => {
        let target = player.level.createEntity('minecraft:zombie')
        target.getAttribute(Attributes.MAX_HEALTH).setBaseValue(1000)
        target.getAttribute(Attributes.ARMOR).setBaseValue(0)
        target.setHealth(1000)
        let holder = player.level.registryAccess().registryOrThrow(RegistryKeys.DAMAGE_TYPE).getHolder(Location.parse(type)).get()
        let source = new DamageSource(holder, actor, actor)
        target.attack(source, amount === undefined ? 20 : amount)
        let lost = 1000 - target.getHealth()
        target.discard()
        check(Math.abs(lost - expected) < 0.02, 'native damage ' + type + ': expected ' + expected + ', actual ' + lost)
      }
      for (let type of ['ars_nouveau:spell', 'irons_spellbooks:fire_magic']) {
        clear(); hit(type, 20)
        add(0.2, Operation.ADD_MULTIPLIED_BASE); hit(type, 24)
        clear()
        add(5, Operation.ADD_VALUE); hit(type, 25)
        add(0.2, Operation.ADD_MULTIPLIED_BASE); hit(type, 30)
        add(0.2, Operation.ADD_MULTIPLIED_BASE); hit(type, 35)
        clear(); add(5, Operation.ADD_VALUE); add(0.2, Operation.ADD_MULTIPLIED_TOTAL)
        add(0.2, Operation.ADD_MULTIPLIED_TOTAL); hit(type, 36)
        clear(); add(5, Operation.ADD_VALUE); hit(type, 5, 0)
      }
      clear()
      // Native socket assembly: check real bonus IDs, operations and purity values.
      let weapon = Item.of('minecraft:iron_sword')
      SocketHelper.setSockets(weapon, 1)
      let socketed = SocketHelper.socketGemInItem(weapon,
        Gems.createGemStack(gem('kaelos_gems:kaelos/glyph_of_power_rare_common'), Purity.PERFECT))
      let modifiers = new ModifierEvent(socketed, StackModifiers.EMPTY)
      SocketHelper.getGems(socketed).addModifiers(modifiers)
      let entries = modifiers.getModifiers()
      check(entries.size() === 1 && String(Registry.ATTRIBUTE.getKey(entries.get(0).attribute().value())) === 'puffish_attributes:magic_damage'
        && Math.abs(entries.get(0).modifier().amount() - 2.025) < 0.00001, 'real perfect Glyph socket emits one +2.025 magic modifier')
      let actualModifier = entries.get(0).modifier()
      damageAttribute.addTransientModifier(actualModifier)
      testIds.push(actualModifier.id())
      hit('ars_nouveau:spell', 22.025)
      hit('irons_spellbooks:fire_magic', 22.025)
      clear()
      let Slots = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
      let ManaUtil = Java.loadClass('com.hollingsworth.arsnouveau.api.util.ManaUtil')
      let manaIds = ['ars_nouveau:ars_nouveau.perk.max_mana', 'irons_spellbooks:max_mana']
      let regenIds = ['ars_nouveau:ars_nouveau.perk.mana_regen', 'irons_spellbooks:mana_regen']
      let value = id => player.getAttribute(Registry.ATTRIBUTE.getHolder(Location.parse(id)).get()).getValue()
      let savedHead = player.getItemBySlot(Slots.HEAD).copy()
      let savedChest = player.getItemBySlot(Slots.CHEST).copy()
      ManaUtil.getMaxMana(player); ManaUtil.getManaRegen(player)
      let manaBefore = manaIds.map(value)
      let regenBefore = regenIds.map(value)
      let equipped = []
      for (let type of ['minecraft:iron_helmet', 'minecraft:iron_chestplate']) {
        let item = Item.of(type)
        SocketHelper.setSockets(item, 1)
        equipped.push(SocketHelper.socketGemInItem(item,
          Gems.createGemStack(gem('apothic_compats:ars_nouveau/mana'), Purity.PERFECT)))
      }
      player.setItemSlot(Slots.HEAD, equipped[0])
      player.setItemSlot(Slots.CHEST, equipped[1])
      player.server.scheduleInTicks(10, () => {
        try {
          ManaUtil.getMaxMana(player); ManaUtil.getManaRegen(player)
          for (let index = 0; index < 2; index++) {
            check(Math.abs(value(manaIds[index]) - manaBefore[index] - 200) < 0.01, 'equipped shared mana +200: ' + manaIds[index])
            check(Math.abs(value(regenIds[index]) - regenBefore[index] * 2.25) < 0.01, 'equipped shared regen x2.25: ' + regenIds[index])
          }
        } catch (error) {
          JsonIO.write('runtime-magic-result.json', { status: 'failed', error: String(error), observations: observations })
          console.error('[Runtime magic] EQUIPMENT_FAILED: ' + error)
        } finally {
          player.setItemSlot(Slots.HEAD, savedHead)
          player.setItemSlot(Slots.CHEST, savedChest)
        }
        player.server.scheduleInTicks(10, () => {
          try {
            let previous = JsonIO.read('runtime-magic-result.json')
            if (previous !== null && previous.status === 'failed') return
            ManaUtil.getMaxMana(player); ManaUtil.getManaRegen(player)
            for (let index = 0; index < 2; index++) {
              check(Math.abs(value(manaIds[index]) - manaBefore[index]) < 0.01, 'unequip restores mana: ' + manaIds[index])
              check(Math.abs(value(regenIds[index]) - regenBefore[index]) < 0.01, 'unequip restores regen: ' + regenIds[index])
            }
            JsonIO.write('runtime-magic-result.json', { status: 'passed', observations: observations })
            console.info('[Runtime magic] MAGIC_TESTS_COMPLETE checks=' + observations.length)
          } catch (error) {
            JsonIO.write('runtime-magic-result.json', { status: 'failed', error: String(error), observations: observations })
            console.error('[Runtime magic] UNEQUIP_FAILED: ' + error)
          }
        })
      })
    } catch (error) {
      JsonIO.write('runtime-magic-result.json', { status: 'failed', error: String(error), observations: observations })
      console.error('[Runtime magic] FAILED: ' + error)
    } finally { for (let action of cleanup) action() }
  })
})
