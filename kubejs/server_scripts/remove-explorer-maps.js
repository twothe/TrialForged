// kubejs/server_scripts/remove-explorer-maps.js
// Explorer map generation cause insane lag as no actual location is generated in this world, so searching runs into timeouts.

LootJS.lootTables((event) => {
	event.modifyLootTables(LootType.CHEST).replaceItem("minecraft:map", "minecraft:paper")
})

LootJS.modifiers((event) => {
	event.addTableModifier(LootType.CHEST).removeLoot("minecraft:filled_map")
})
