/** Portable one-point reward for dungeon loot and future quests; use is handled server-side by the Skills API. */
// Initialize the shared API at startup; KubeJS prohibits replacing globals in server scripts.
global.TrialforgedSkills = {}
StartupEvents.registry('item', event => {
  event.create('skill_point').displayName('Skill Point').texture('minecraft:item/experience_bottle').maxStackSize(64)
    .tooltip('Use to gain 1 Trialforged skill point.')
})
