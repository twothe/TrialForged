/** Native skill points and consumption-scoped debuff protection; Pufferfish owns unlocks, rewards and persistence. */
;(() => {
  let Skills = Java.loadClass('net.puffish.skillsmod.api.SkillsAPI')
  let Location = Java.loadClass('net.minecraft.resources.ResourceLocation')
  let Player = Java.loadClass('net.minecraft.server.level.ServerPlayer')
  let Components = Java.loadClass('net.minecraft.core.component.DataComponents')
  let EffectCategory = Java.loadClass('net.minecraft.world.effect.MobEffectCategory')
  let EffectInstance = Java.loadClass('net.minecraft.world.effect.MobEffectInstance')
  let Priority = Java.loadClass('net.neoforged.bus.api.EventPriority')
  let RightClick = Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickItem')
  let Tick = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent$Tick')
  let Finish = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent$Finish')
  let Stop = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent$Stop')
  let Result = Java.loadClass('net.minecraft.world.InteractionResult')
  let categoryId = Location.parse('trialforged:skills')
  let sourceId = Location.parse('trialforged:skill_point_items')
  let tag = 'trialforged_needful_taste'
  let snapshots = new Map()

  function guard(context, action) {
    try { return action() }
    catch (error) { console.error('[Trialforged skills] ' + context + ': ' + error); throw error }
  }
  function harmful(effect) { return effect.getEffect().value().getCategory().equals(EffectCategory.HARMFUL) }
  function consumable(stack) {
    return stack.has(Components.FOOD) || stack.has(Components.POTION_CONTENTS)
  }
  function protectedPlayer(entity) {
    return entity instanceof Player && entity.getTags().contains(tag)
  }

  /** A token is consumed only after the native point update succeeds, on the authoritative server. */
  function redeem(player, stack) {
    if (!(player instanceof Player) || stack.isEmpty() || String(stack.id) !== 'kubejs:skill_point') return false
    let category = Skills.getCategory(categoryId).orElseThrow()
    if (!category.isUnlocked(player)) throw new Error('Trialforged category is not unlocked')
    category.addPoints(player, sourceId, 1)
    stack.shrink(1)
    player.tell(Text.of('+1 Skill Point').gold())
    return true
  }
  NativeEvents.onEvent(Priority.NORMAL, RightClick, event => {
    if (event.getEntity().level.isClientSide() || event.isCanceled()) return
    if (String(event.getItemStack().id) !== 'kubejs:skill_point') return
    guard('redeem token ' + event.getEntity().getUuid(), () => {
      if (redeem(event.getEntity(), event.getItemStack())) {
        event.setCancellationResult(Result.SUCCESS)
        event.setCanceled(true)
      }
    })
  })

  /** Capture immediately before the final native use tick; unrelated effects during earlier eating ticks are preserved. */
  function capture(entity, stack, duration) {
    let key = String(entity.getUuid())
    snapshots.delete(key)
    if (!protectedPlayer(entity) || !consumable(stack) || duration !== 1) return
    let effects = new Map(), iterator = entity.getActiveEffects().iterator()
    while (iterator.hasNext()) {
      let effect = iterator.next()
      if (harmful(effect)) effects.set(String(effect.getEffect().getRegisteredName()), effect.save())
    }
    snapshots.set(key, { tick: entity.level.getTime(), stack: stack.copy(), effects: effects })
  }
  function finish(entity, stack) {
    let key = String(entity.getUuid()), snapshot = snapshots.get(key)
    snapshots.delete(key)
    if (!snapshot || !protectedPlayer(entity) || snapshot.tick !== entity.level.getTime()
      || !ItemStack.isSameItemSameComponents(snapshot.stack, stack)) return
    let candidates = [], iterator = entity.getActiveEffects().iterator()
    while (iterator.hasNext()) {
      let effect = iterator.next()
      if (!harmful(effect)) continue
      let old = snapshot.effects.get(String(effect.getEffect().getRegisteredName()))
      if (old && old.equals(effect.save())) continue
      candidates.push({ effect: effect.getEffect(), previous: old })
    }
    for (let candidate of candidates) {
      if (entity.getRandom().nextFloat() >= 0.5) continue
      entity.removeEffect(candidate.effect)
      if (candidate.previous) entity.addEffect(EffectInstance.load(candidate.previous))
    }
  }
  let ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack')
  NativeEvents.onEvent(Priority.LOWEST, Tick, event => {
    if (!(event.getEntity() instanceof Player) || event.isCanceled()) return
    guard('consumption snapshot', () => capture(event.getEntity(), event.getItem(), event.getDuration()))
  })
  NativeEvents.onEvent(Priority.LOWEST, Finish, event => {
    if (!(event.getEntity() instanceof Player)) return
    guard('consumption finish', () => finish(event.getEntity(), event.getItem()))
  })
  NativeEvents.onEvent(Stop, event => snapshots.delete(String(event.getEntity().getUuid())))
  PlayerEvents.loggedOut(event => snapshots.delete(String(event.player.getUuid())))

  // Shared functions expose the actual production boundary to isolated native probes.
  Object.assign(global.TrialforgedSkills, { redeem: redeem, capture: capture, finish: finish, categoryId: categoryId, sourceId: sourceId, tag: tag })
})()
