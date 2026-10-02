/**
 * Fixed, cooperative-friendly vanilla progression bosses for Trialforged.
 * Profiles replace random Infernal modifiers and distance/nearest-player scaling.
 * Native join events distinguish fresh spawns from disk loads; damaged bosses
 * retain their health fraction. Nothing scales with participant count.
 */
const TFBossInfernal = Java.loadClass('atomicstryker.infernalmobs.common.InfernalMobsCore')
const TFBossAttributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
const TFBossRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const TFBossLegacyLevelModifier = Java.loadClass('net.minecraft.resources.ResourceLocation').parse('autoleveling:level')
const TFBossAugments = Java.loadClass('dev.shadowsoffire.apotheosis.tiers.augments.TierAugmentRegistry')
const TFBossAugmentTarget = Java.loadClass('dev.shadowsoffire.apotheosis.tiers.augments.TierAugment$Target')
const TFBossWorldTier = Java.loadClass('dev.shadowsoffire.apotheosis.tiers.WorldTier')
const TFBossAttachments = Java.loadClass('dev.shadowsoffire.apotheosis.Apoth$Attachments')
const TFBossDragonPhase = Java.loadClass('net.minecraft.world.entity.boss.enderdragon.phases.EnderDragonPhase')
const TFBossDamageTypes = Java.loadClass('net.minecraft.world.damagesource.DamageTypes')
const TFBossPriority = Java.loadClass('net.neoforged.bus.api.EventPriority')
const TFBossJoinEvent = Java.loadClass('net.neoforged.neoforge.event.entity.EntityJoinLevelEvent')
const TFBossIncomingDamage = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent')

const TF_BOSS_PROFILE_KEY = 'trialforged_boss_profile_version'
const TF_BOSS_PROFILE_VERSION = 1
const TF_BOSS_PROFILES = {
  'minecraft:wither': {
    health: 600, modifiers: 'Bulwark Fiery', tier: TFBossWorldTier.FRONTIER,
    projectileMultiplier: 1.20, explosionMultiplier: 1.20
  },
  'minecraft:ender_dragon': {
    health: 1000, modifiers: 'Bulwark', tier: TFBossWorldTier.ASCENT,
    meleeMultiplier: 1.25
  },
  'minecraft:warden': {
    // Vanilla MAX_HEALTH is capped at 1024 in the installed instance.
    health: 1024, modifiers: 'Bulwark Gravity', tier: TFBossWorldTier.SUMMIT,
    meleeMultiplier: 1.15, sonicMultiplier: 1.20
  }
}

function tfBossGuard(context, action) {
  try {
    action()
  } catch (error) {
    console.error('[Trialforged bosses] ' + context + ': ' + error)
    throw error
  }
}

/** Remove only Advanced Leveling's named modifiers, including old saved bosses. */
function tfBossRemoveLevelBonuses(entity) {
  const attributes = TFBossRegistries.ATTRIBUTE.iterator()
  while (attributes.hasNext()) {
    let attribute = attributes.next()
    let instance = entity.getAttribute(TFBossRegistries.ATTRIBUTE.wrapAsHolder(attribute))
    if (instance != null) instance.removeModifier(TFBossLegacyLevelModifier)
  }
  entity.getPersistentData().remove('LEVEL')
}

/** Use the preceding progression tier, regardless of nearby players' tiers. */
function tfBossApplyTier(entity, tier) {
  const tiers = TFBossWorldTier.values()
  for (let index = 0; index < tiers.length; index++) {
    let augments = TFBossAugments.getAugments(tiers[index], TFBossAugmentTarget.MONSTERS)
    for (let augmentIndex = 0; augmentIndex < augments.size(); augmentIndex++) {
      augments.get(augmentIndex).remove(entity.level(), entity)
    }
  }
  const augments = TFBossAugments.getAugments(tier, TFBossAugmentTarget.MONSTERS)
  for (let index = 0; index < augments.size(); index++) augments.get(index).apply(entity.level(), entity)
  // Mirror Apotheosis' own lifecycle marker, including spawns without a nearby player.
  entity.setData(TFBossAttachments.TIER_AUGMENTS_APPLIED, true)
}

function tfBossModifierNames(modifiers) {
  return String(modifiers.getLinkedModNameUntranslated()).trim().split(/\s+/).sort().join(' ')
}

/** Rebuild mismatching chains; preserve the original chain on ordinary reloads. */
function tfBossApplyInfernal(entity, profile) {
  const core = TFBossInfernal.instance()
  const rawData = entity.getPersistentData()
  let modifiers = TFBossInfernal.getMobModifiers(entity)
  const wanted = profile.modifiers.split(' ').sort().join(' ')
  if (modifiers != null && tfBossModifierNames(modifiers) !== wanted) {
    TFBossInfernal.removeEntFromElites(entity)
    rawData.remove(core.getNBTTag())
    rawData.remove('infernalMaxHealth')
    modifiers = null
  }
  if (modifiers == null) {
    core.addEntityModifiersByString(entity, profile.modifiers)
    modifiers = TFBossInfernal.getMobModifiers(entity)
  }
  if (modifiers == null || tfBossModifierNames(modifiers) !== wanted) {
    throw new Error('Could not assign Infernal profile ' + profile.modifiers + ' to ' + entity.type)
  }
  return modifiers
}

/** Apply once per join after other mods finish; rejoining never restores lost HP. */
function tfBossApplyProfile(entity, loadedFromDisk) {
  const profile = TF_BOSS_PROFILES[String(entity.type)]
  if (profile == null || entity.isRemoved() || !entity.isAlive()) return
  if (String(entity.type) === 'minecraft:ender_dragon'
    && entity.getPhaseManager().getCurrentPhase().getPhase().equals(TFBossDragonPhase.DYING)) return
  const previousMaximum = entity.getMaxHealth()
  if (previousMaximum <= 0) throw new Error('Invalid boss maximum health')
  const fraction = Math.min(1, entity.getHealth() / previousMaximum)
  const firstApplication = !entity.persistentData.contains(TF_BOSS_PROFILE_KEY)
  // The freshly summoned Wither begins its invulnerable charging phase at 1/3 HP.
  // Give that fresh boss its full profile HP; never do this for a disk-loaded one.
  const freshCharge = firstApplication && !loadedFromDisk
    && String(entity.type) === 'minecraft:wither' && entity.getInvulnerableTicks() > 0

  tfBossRemoveLevelBonuses(entity)
  tfBossApplyTier(entity, profile.tier)
  const modifiers = tfBossApplyInfernal(entity, profile)
  const healthAttribute = entity.getAttribute(TFBossAttributes.MAX_HEALTH)
  if (healthAttribute == null) throw new Error('Boss has no maximum-health attribute')
  healthAttribute.setBaseValue(profile.health)
  const maximum = entity.getMaxHealth()
  if (Math.abs(maximum - profile.health) > 0.01) {
    throw new Error('Unexpected final HP for ' + entity.type + ': ' + maximum + ', expected ' + profile.health)
  }
  const health = freshCharge ? maximum : Math.min(maximum, fraction * maximum)
  entity.setHealth(health)
  // Infernal Mobs maintains its own maximum-health cache and persistent marker.
  entity.getPersistentData().putFloat('infernalMaxHealth', maximum)
  modifiers.setActualHealth(health, maximum)
  TFBossInfernal.instance().sendHealthPacket(entity)
  entity.persistentData.putInt(TF_BOSS_PROFILE_KEY, TF_BOSS_PROFILE_VERSION)
  if (firstApplication) {
    console.info('[Trialforged bosses] ' + entity.type + ': ' + maximum + ' HP, '
      + profile.modifiers + ', monster tier ' + profile.tier.getSerializedName())
  }
}

/** Boost only the specified attack types, before armor/shield mitigation. */
function tfBossAdjustDamage(event) {
  if (event.getEntity().level().isClientSide()) return
  const source = event.getSource()
  const attacker = source.getEntity()
  if (attacker == null) return
  const profile = TF_BOSS_PROFILES[String(attacker.type)]
  if (profile == null) return
  let multiplier = 1
  if (profile.meleeMultiplier != null && source.is(TFBossDamageTypes.MOB_ATTACK)) {
    multiplier = profile.meleeMultiplier
  } else if (profile.sonicMultiplier != null && source.is(TFBossDamageTypes.SONIC_BOOM)) {
    multiplier = profile.sonicMultiplier
  } else if (profile.projectileMultiplier != null && source.is(TFBossDamageTypes.WITHER_SKULL)) {
    multiplier = profile.projectileMultiplier
  } else if (profile.explosionMultiplier != null
    && (source.is(TFBossDamageTypes.EXPLOSION) || source.is(TFBossDamageTypes.PLAYER_EXPLOSION))) {
    multiplier = profile.explosionMultiplier
  }
  if (multiplier !== 1 && event.getAmount() > 0) event.setAmount(event.getAmount() * multiplier)
}

NativeEvents.onEvent(TFBossPriority.LOWEST, TFBossJoinEvent, event => {
  if (event.getLevel().isClientSide()) return
  const entity = event.getEntity()
  if (TF_BOSS_PROFILES[String(entity.type)] == null) return
  const loadedFromDisk = event.loadedFromDisk()
  entity.server.scheduleInTicks(1, () => tfBossGuard('boss profile', () => tfBossApplyProfile(entity, loadedFromDisk)))
})
NativeEvents.onEvent(TFBossPriority.LOWEST, TFBossIncomingDamage,
  event => tfBossGuard('boss attack', () => tfBossAdjustDamage(event)))
