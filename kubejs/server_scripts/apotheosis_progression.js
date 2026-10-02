/**
 * Personal, irreversible Apotheosis progression for Trialforged.
 * Uses the mod's public setter for attributes and client synchronization. The
 * persistent high-water mark survives respawns and prevents later downgrades.
 * Boss credit requires recent, substantial damage rather than the last hit.
 */
const TFWorldTier = Java.loadClass('dev.shadowsoffire.apotheosis.tiers.WorldTier')
const TFServerPlayer = Java.loadClass('net.minecraft.server.level.ServerPlayer')
const TFFakePlayer = Java.loadClass('net.neoforged.neoforge.common.util.FakePlayer')
const TFCompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')
const TFDragonPhase = Java.loadClass('net.minecraft.world.entity.boss.enderdragon.phases.EnderDragonPhase')

const TF_TIER_KEY = 'trialforged_highest_apotheosis_tier'
const TF_PARTICIPANTS_KEY = 'trialforged_tier_participants'
const TF_AWARDED_KEY = 'trialforged_tier_kill_awarded'
const TF_MINIMUM_DAMAGE_FRACTION = 0.05
const TF_PARTICIPATION_TICKS = 1200
const TF_PARTICIPATION_RANGE_SQUARED = 128 * 128
const TF_TIERS = [TFWorldTier.HAVEN, TFWorldTier.FRONTIER, TFWorldTier.ASCENT,
  TFWorldTier.SUMMIT, TFWorldTier.PINNACLE]
const TF_MILESTONES = {
  'minecraft:wither_skeleton': 1,
  'minecraft:wither': 2,
  'minecraft:ender_dragon': 3,
  'minecraft:warden': 4
}

function tfRealPlayer(entity) {
  return entity instanceof TFServerPlayer && !(entity instanceof TFFakePlayer)
}

/** Missing state means a new player; malformed existing state must fail visibly. */
function tfStoredTier(player) {
  const data = player.persistentData
  if (!data.contains(TF_TIER_KEY)) return 0
  if (!data.contains(TF_TIER_KEY, 3)) throw new Error('Stored world tier is not an integer')
  const tier = data.getInt(TF_TIER_KEY)
  if (tier < 0 || tier >= TF_TIERS.length) throw new Error('Invalid stored world tier: ' + tier)
  return tier
}

/** Grants matching display advancements and applies only monotonic transitions. */
function tfApplyTier(player, requestedTier, announce) {
  if (!tfRealPlayer(player)) return
  const oldTier = TFWorldTier.getTier(player).ordinal()
  const targetTier = Math.max(oldTier, tfStoredTier(player), requestedTier)
  for (let index = 0; index <= targetTier; index++) {
    let advancement = player.server.getAdvancements().get(TF_TIERS[index].getUnlockAdvancement())
    if (advancement == null) throw new Error('Missing world tier advancement: ' + TF_TIERS[index])
    player.getAdvancements().award(advancement, 'milestone')
  }
  // Calling the setter for Haven also completes Apotheosis's identification tutorial.
  TFWorldTier.setTier(player, TF_TIERS[targetTier])
  player.persistentData.putInt(TF_TIER_KEY, targetTier)
  if (announce && targetTier > oldTier) {
    player.tell(Text.of('Dein Apotheosis World Tier ist jetzt ' + TF_TIERS[targetTier].getSerializedName() + '. Der Aufstieg ist dauerhaft.').gold())
    console.info('[Trialforged tiers] ' + player.getUUID() + ': ' + oldTier + ' -> ' + targetTier)
  }
}

function tfGuard(context, action) {
  try {
    action()
  } catch (error) {
    console.error('[Trialforged tiers] ' + context + ': ' + error)
    throw error
  }
}

/** Actual post-mitigation damage is stored on the boss, including across unloads. */
function tfRecordDamage(event) {
  const entity = event.entity
  const tier = TF_MILESTONES[String(entity.type)]
  if (tier == null || tier === 1 || event.damage <= 0) return
  const player = event.source.getEntity()
  if (!tfRealPlayer(player)) return
  const data = entity.persistentData
  if (!data.contains(TF_PARTICIPANTS_KEY, 10)) data.put(TF_PARTICIPANTS_KEY, new TFCompoundTag())
  const participants = data.getCompound(TF_PARTICIPANTS_KEY)
  const playerId = String(player.getUUID())
  const now = entity.level().getGameTime()
  let contribution = participants.getCompound(playerId)
  if (now - contribution.getLong('last_hit') > TF_PARTICIPATION_TICKS) contribution = new TFCompoundTag()
  contribution.putDouble('damage', contribution.getDouble('damage') + Math.min(event.damage, entity.getMaxHealth()))
  contribution.putLong('last_hit', now)
  participants.put(playerId, contribution)
}

/** The dragon restores 1 HP for its death animation after the death event. */
function tfDefeated(entity) {
  return entity.isDeadOrDying() || (String(entity.type) === 'minecraft:ender_dragon'
    && entity.getPhaseManager().getCurrentPhase().getPhase().equals(TFDragonPhase.DYING))
}

function tfAwardKill(entity, killer, tier) {
  if (!tfDefeated(entity) || entity.persistentData.getBoolean(TF_AWARDED_KEY)) return
  if (tier === 1) {
    if (tfRealPlayer(killer)) tfApplyTier(killer, tier, true)
  } else {
    const participants = entity.persistentData.getCompound(TF_PARTICIPANTS_KEY)
    const now = entity.level().getGameTime()
    const players = entity.server.getPlayerList().getPlayers()
    for (let index = 0; index < players.size(); index++) {
      let player = players.get(index)
      if (!tfRealPlayer(player) || !player.isAlive()
        || !player.level().dimension().equals(entity.level().dimension())
        || player.distanceToSqr(entity) > TF_PARTICIPATION_RANGE_SQUARED) continue
      let contribution = participants.getCompound(String(player.getUUID()))
      if (contribution.getDouble('damage') >= entity.getMaxHealth() * TF_MINIMUM_DAMAGE_FRACTION
        && now - contribution.getLong('last_hit') <= TF_PARTICIPATION_TICKS) {
        tfApplyTier(player, tier, true)
      }
    }
  }
  entity.persistentData.putBoolean(TF_AWARDED_KEY, true)
}

PlayerEvents.loggedIn(event => tfGuard('player login', () => tfApplyTier(event.player, 0, false)))
PlayerEvents.respawned(event => tfGuard('player respawn', () => tfApplyTier(event.player, 0, false)))
PlayerEvents.cloned(event => tfGuard('player clone', () => {
  event.player.persistentData.putInt(TF_TIER_KEY, Math.max(tfStoredTier(event.oldPlayer), tfStoredTier(event.player)))
}))
ServerEvents.loaded(event => tfGuard('server load', () => {
  const players = event.server.getPlayerList().getPlayers()
  for (let index = 0; index < players.size(); index++) tfApplyTier(players.get(index), 0, false)
}))
EntityEvents.afterHurt(event => tfGuard('boss participation', () => tfRecordDamage(event)))
EntityEvents.death(event => {
  const entity = event.entity
  const tier = TF_MILESTONES[String(entity.type)]
  if (tier == null) return
  let killer = event.source.getEntity()
  if (!tfRealPlayer(killer)) killer = entity.getKillCredit()
  // Death may precede the lethal hit's afterHurt event. Delay credit until both
  // have completed, and recheck death to avoid awarding a cancelled death.
  entity.server.scheduleInTicks(1, () => tfGuard('milestone kill', () => tfAwardKill(entity, killer, tier)))
})
