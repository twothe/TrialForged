/** Isolated native acceptance: loaded tree, tokens, actual consumables, reversible rewards and dungeon modifier frequency. */
let runtimeSkillProbeFinish = null
let runtimeSkillCapture = false
let runtimeSkillCounts = null
LootJS.modifiers(event => {
  event.addTableModifier(/.*/).customAction((context, bucket) => {
    if (!runtimeSkillCapture) return
    let counts = {}
    for (let index = 0; index < bucket.size(); index++) {
      let stack = bucket.get(index), id = String(stack.id)
      counts[id] = (counts[id] || 0) + stack.getCount()
    }
    runtimeSkillCounts = counts
  })
})
PlayerEvents.loggedIn(event => {
  if (String(event.player.username) !== 'RuntimeTester') return
  event.server.scheduleInTicks(300, () => {
    let player = event.player, observations = []
    let check = (condition, message) => {
      if (!condition) throw new Error(message)
      observations.push(message)
    }
    let fail = error => {
      runtimeSkillCapture = false
      console.error('[Runtime skills] FAILED: ' + error)
      JsonIO.write('runtime-skills-result.json', { status: 'failed', error: String(error), observations: observations })
    }
    try {
      let API = Java.loadClass('net.puffish.skillsmod.api.SkillsAPI')
      let Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
      let Registry = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
      let Dynamic = Java.loadClass('net.puffish.attributesmod.api.DynamicModification')
      let Effects = Java.loadClass('net.minecraft.world.effect.MobEffects')
      let Effect = Java.loadClass('net.minecraft.world.effect.MobEffectInstance')
      let Components = Java.loadClass('net.minecraft.core.component.DataComponents')
      let PotionContents = Java.loadClass('net.minecraft.world.item.alchemy.PotionContents')
      let List = Java.loadClass('java.util.List')
      let Optional = Java.loadClass('java.util.Optional')
      let NeoForge = Java.loadClass('net.neoforged.neoforge.common.NeoForge')
      let Tick = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent$Tick')
      let Finish = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent$Finish')
      let RightClick = Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickItem')
      let Hand = Java.loadClass('net.minecraft.world.InteractionHand')
      let source = JSON.parse(String(JsonIO.readString('kubejs/config/runtime_skill_plan.json')))
      let category = API.getCategory(Location.parse('trialforged:skills')).orElseThrow()
      let skill = name => category.getSkill(source.trees[0].skills.find(node => node.name === name).id).orElseThrow()
      let has = name => String(skill(name).getState(player)) === 'UNLOCKED'
      let holder = id => Registry.ATTRIBUTE.getHolder(Location.parse(id)).get()
      let value = id => player.getAttributeValue(holder(id))
      let config = JSON.parse(String(JsonIO.readString('kubejs/data/trialforged/puffish_skills/categories/skills/definitions.json')))
      check(category.streamSkills().count() === 90, 'native category contains all 90 placements')
      check(Object.keys(config).length === 42, '42 shared definitions loaded as data')
      for (let node of source.trees[0].skills) check(category.getSkill(node.id).isPresent(), 'stable node ID ' + node.id)
      check(category.isUnlocked(player), 'category available without granting starting points')
      let expected = JsonIO.read('runtime-expected-skills.json')
      if (expected != null && expected.persisted) {
        check(has('Warrior') && category.getPointsTotal(player) === 1, 'native points and unlock survive a full client restart')
      } else {
        // Failed prior probes may have saved a token; reset only this isolated identity.
        category.erase(player); category.unlock(player)
        check(category.getPointsTotal(player) === 0, 'fresh category grants zero skill points')
      }
      category.erase(player)
      category.unlock(player)
      let point = Item.of('kubejs:skill_point', 2)
      player.setItemInHand(Hand.MAIN_HAND, point)
      let click = new RightClick(player, Hand.MAIN_HAND)
      NeoForge.EVENT_BUS.post(click)
      check(click.isCanceled() && point.getCount() === 1 && category.getPointsTotal(player) === 1,
        'native right-click consumes exactly one token and grants exactly one point')
      check(!global.TrialforgedSkills.redeem(player, Item.of('minecraft:paper')), 'ordinary items cannot award skill points')
      let second = Java.loadClass('net.neoforged.neoforge.common.util.FakePlayerFactory').getMinecraft(player.level)
      check(category.getPointsTotal(second) === 0, 'point redemption does not credit another server identity')

      // Native ShowCategory packets read live category data on Netty. Destructive bulk probes
      // use a native FakePlayer, whose network handler discards packets, rather than racing that reader.
      let connectedPlayer = player
      player = second
      category.erase(player); category.unlock(player)

      category.setExtraPoints(player, 90)
      skill('Warrior').unlock(player)
      check(String(skill('Mage').getState(player)) === 'LOCKED', 'another starter initially requires investment in a path')
      // Fixture path selection only; every purchase is checked against the native state machine.
      let target = source.trees[0].skills.find(node => node.name === 'Mage').id
      let initial = source.trees[0].skills.find(node => node.name === 'Warrior').id
      let queue = [[initial]], visited = new Set([initial]), route = null
      for (let path of queue) {
        let last = path[path.length - 1]
        if (last === target) { route = path; break }
        for (let connection of source.trees[0].connections) {
          let next = connection.from === last ? connection.to : connection.to === last ? connection.from : null
          if (next && !visited.has(next)) { visited.add(next); queue.push(path.concat([next])) }
        }
      }
      check(route != null, 'starter-to-starter fixture has a connected path')
      for (let id of route.slice(1)) {
        let node = category.getSkill(id).get()
        check(String(node.getState(player)) === 'AFFORDABLE', 'native path purchase is available: ' + id)
        node.unlock(player)
      }
      check(has('Warrior') && has('Mage'), 'invested path permits a second starter')
      category.resetSkills(player)

      skill('Needful Taste').unlock(player)
      check(player.getTags().contains('trialforged_needful_taste'), 'native tag reward enables Needful Taste')
      let consume = stack => {
        let original = stack.copy()
        NeoForge.EVENT_BUS.post(new Tick(player, stack, 1))
        let result = stack.finishUsingItem(player.level, player)
        NeoForge.EVENT_BUS.post(new Finish(player, original, 0, result))
      }
      let avoidedPoison = 0, avoidedSlow = 0, trials = 2000
      for (let index = 0; index < trials; index++) {
        player.removeAllEffects()
        let potion = Item.of('minecraft:potion')
        potion.set(Components.POTION_CONTENTS, new PotionContents(Optional.empty(), Optional.empty(),
          List.of(new Effect(Effects.POISON, 200, 0), new Effect(Effects.MOVEMENT_SLOWDOWN, 200, 0), new Effect(Effects.MOVEMENT_SPEED, 200, 0))))
        consume(potion)
        check(player.hasEffect(Effects.MOVEMENT_SPEED), 'positive mixed-potion effect retained ' + index)
        if (!player.hasEffect(Effects.POISON)) avoidedPoison++
        if (!player.hasEffect(Effects.MOVEMENT_SLOWDOWN)) avoidedSlow++
      }
      check(Math.abs(avoidedPoison - trials / 2) < 6 * Math.sqrt(trials / 4), '50% native mixed-potion poison avoidance: ' + avoidedPoison)
      check(Math.abs(avoidedSlow - trials / 2) < 6 * Math.sqrt(trials / 4), '50% independent mixed-potion slowness avoidance: ' + avoidedSlow)
      player.removeAllEffects()
      player.addEffect(new Effect(Effects.POISON, 1000, 0))
      let savedPoison = player.getEffect(Effects.POISON).save()
      global.TrialforgedSkills.capture(player, Item.of('minecraft:spider_eye'), 1)
      global.TrialforgedSkills.finish(player, Item.of('minecraft:spider_eye'))
      check(player.getEffect(Effects.POISON).save().equals(savedPoison), 'preexisting harmful effect is preserved')
      let restored = 0
      for (let index = 0; index < 200; index++) {
        player.removeAllEffects()
        player.addEffect(new Effect(Effects.POISON, 1000, 0))
        player.addEffect(new Effect(Effects.POISON, 500, 1))
        let previous = player.getEffect(Effects.POISON).save()
        let stronger = Item.of('minecraft:potion')
        stronger.set(Components.POTION_CONTENTS, new PotionContents(Optional.empty(), Optional.empty(),
          List.of(new Effect(Effects.POISON, 200, 2))))
        consume(stronger)
        if (player.getEffect(Effects.POISON).getAmplifier() === 1) {
          check(player.getEffect(Effects.POISON).save().equals(previous), 'restored poison preserves its hidden weaker effect')
          restored++
        }
      }
      check(Math.abs(restored - 100) < 6 * Math.sqrt(50), '50% avoidance of stronger poison restores prior state: ' + restored)
      player.removeAllEffects()
      // A spell/source effect without a finishing item is never processed.
      player.addEffect(new Effect(Effects.POISON, 300, 0))
      check(player.hasEffect(Effects.POISON), 'non-consumption effect remains active')
      player.removeAllEffects()
      skill('Needful Taste').lock(player)
      check(!player.getTags().contains('trialforged_needful_taste'), 'locking the skill removes its protection tag')
      consume(Item.of('minecraft:spider_eye'))
      check(player.hasEffect(Effects.POISON), 'unskilled native spider-eye poisoning remains unchanged')
      player.removeAllEffects()
      category.resetSkills(player)
      player = connectedPlayer
      skill('Needful Taste').unlock(player)

      // Exercise one genuine multi-tick player consumption, beyond direct event/food probes.
      let finished = false
      runtimeSkillProbeFinish = entity => {
        if (String(entity.getUuid()) === String(player.getUuid())) {
          finished = true
          JsonIO.write('runtime-skill-food-use.json', { pending: false })
        }
      }
      // The earlier boss probe leaves this identity in creative mode, which does not consume food stacks.
      player.runCommandSilent('gamemode survival')
      check(!player.isCreative(), 'native food probe uses survival consumption rules')
      player.setItemInHand(Hand.MAIN_HAND, Item.of('minecraft:spider_eye', 2))
      player.getFoodData().setFoodLevel(18)
      // Ask the native client to hold use after inventory synchronization, rather than forcing server-only use.
      JsonIO.write('runtime-skill-food-use.json', { pending: true })
      player.server.scheduleInTicks(90, () => {
        try {
          check(finished && !player.isUsingItem() && player.getMainHandItem().getCount() === 1,
            'real player completed native food use and production finish hook; finished=' + finished
              + ' using=' + player.isUsingItem() + ' count=' + player.getMainHandItem().getCount())
          player.runCommandSilent('gamemode creative')
          runtimeSkillProbeFinish = null
          player.removeAllEffects()
          skill('Needful Taste').lock(player)
          check(!player.getTags().contains('trialforged_needful_taste'), 'connected player removes custom reward')
          player = second
          category.resetSkills(player)
          check(!player.getTags().contains('trialforged_needful_taste'), 'native respec removes custom reward')
          let regenIds = ['ars_nouveau:ars_nouveau.perk.mana_regen', 'irons_spellbooks:mana_regen']
          let before = regenIds.map(value)
          for (let node of source.trees[0].skills.filter(node => node.name === 'Regeneration')) category.getSkill(node.id).get().unlock(player)
          for (let index = 0; index < 2; index++) {
            check(Math.abs(value(regenIds[index]) - before[index] * 1.331) < 0.0001, 'three native shared regeneration instances stack: ' + regenIds[index])
          }
          category.resetSkills(player)
          for (let index = 0; index < 2; index++) check(Math.abs(value(regenIds[index]) - before[index]) < 0.0001, 'respec restores mana regeneration: ' + regenIds[index])
          category.setExtraPoints(player, 90)
          for (let node of source.trees[0].skills) category.getSkill(node.id).get().unlock(player)
          check(category.streamUnlockedSkills(player).count() === 90 && category.getSpentPoints(player) === 90, 'all instances unlock independently with native costs')
          let reduced = Dynamic.create().withPositive(holder('puffish_attributes:magic_resistance'), player)
            .withPositive(holder('puffish_attributes:resistance'), player).relativeTo(10)
          check(Math.abs(reduced - 5.40798875) < 0.001, 'native full-tree magic reduction at 10 damage: ' + reduced)
          category.resetSkills(player)
          check(!player.getTags().contains('trialforged_needful_taste'), 'full respec removes protection')

          let ParamsBuilder = Java.loadClass('net.minecraft.world.level.storage.loot.LootParams$Builder')
          let ContextBuilder = Java.loadClass('net.minecraft.world.level.storage.loot.LootContext$Builder')
          let Params = Java.loadClass('net.minecraft.world.level.storage.loot.parameters.LootContextParams')
          let Sets = Java.loadClass('net.minecraft.world.level.storage.loot.parameters.LootContextParamSets')
          let Random = Java.loadClass('net.minecraft.util.RandomSource')
          let ArrayList = Java.loadClass('java.util.ArrayList')
          let Modifications = Java.loadClass('com.almostreliable.lootjs.LootModificationsAPI')
          let random = Random.create(510862), hits = 0, iterations = 20000
          let params = new ParamsBuilder(player.level).withParameter(Params.ORIGIN, player.position())
            .withOptionalParameter(Params.THIS_ENTITY, player).create(Sets.CHEST)
          let roll = id => {
            let context = new ContextBuilder(params).withOptionalRandomSource(random)
              .withQueriedLootTableId(Location.parse(id)).create(Optional.empty())
            let items = new ArrayList(); items.add(Item.of('minecraft:diamond', 3))
            runtimeSkillCapture = true; runtimeSkillCounts = null
            Modifications.invokeActions(items, context)
            runtimeSkillCapture = false
            if (runtimeSkillCounts == null) throw new Error('Native loot observer did not run')
            if (runtimeSkillCounts['minecraft:diamond'] !== 3) throw new Error('Token modifier changed original loot')
            return runtimeSkillCounts['kubejs:skill_point'] || 0
          }
          for (let index = 0; index < iterations; index++) {
            let amount = roll('minecraft:chests/simple_dungeon')
            if (amount > 1) throw new Error('More than one token per dungeon roll')
            hits += amount
          }
          check(Math.abs(hits - 200) < 6 * Math.sqrt(198), 'native dungeon token chance 1%: ' + hits + '/' + iterations)
          for (let id of ['minecraft:entities/zombie', 'minecraft:chests/village/village_plains_house', 'minecraft:chests/trial_chambers/reward']) {
            for (let index = 0; index < 100; index++) check(roll(id) === 0, 'no direct token outside dungeon selection: ' + id)
          }
          player = connectedPlayer
          skill('Warrior').unlock(player)
          check(has('Warrior') && category.getPointsTotal(player) === 1, 'native persisted end state ready for restart test')
          JsonIO.write('runtime-skills-result.json', { status: 'passed', checks: observations.length,
            tokenRolls: { hits: hits, iterations: iterations },
            potionAvoidance: { avoidedPoison: avoidedPoison, avoidedSlow: avoidedSlow, trials: trials },
            restartVerified: expected != null && expected.persisted, savedStateReady: true })
          console.info('[Runtime skills] SKILLS_TESTS_COMPLETE checks=' + observations.length)
        } catch (error) { fail(error) }
      })
    } catch (error) { fail(error) }
  })
})
NativeEvents.onEvent(Java.loadClass('net.neoforged.bus.api.EventPriority').LOWEST,
  Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent$Finish'), event => {
    if (runtimeSkillProbeFinish) runtimeSkillProbeFinish(event.getEntity())
  })
