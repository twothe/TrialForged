// priority: 0
/**
 * Central recipe balancing. Keep items and blocks registered and usable so
 * administrators can grant them; restrict availability through recipes only.
 */
ServerEvents.recipes((event) => {
	// Disable production of these blocks without removing existing blocks or items.
	event.remove({ output: "easy_villagers:iron_farm" })
	event.remove({ output: "easy_villagers:farmer" })

	// Change only the central ingredient; preserve each recipe's other ingredients.
	event.replaceInput({ id: "easy_villagers:trader" }, "#c:dusts/redstone", "minecraft:emerald_block")
	event.replaceInput({ id: "easy_villagers:auto_trader" }, "#c:dusts/redstone", "minecraft:emerald_block")
})
