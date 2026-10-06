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

	// Move the wither-bone requirement from the red canister to the yellow upgrade.
	event.replaceInput({ id: "bhc:red_heart_canister" }, "#c:wither_bones", "minecraft:bone")
	event.remove({ id: "bhc:yellow_heart_canister" })
	event.custom({
		type: "minecraft:crafting_shapeless",
		category: "misc",
		group: "bhc:yellow_heart_canister",
		ingredients: [
			{ item: "bhc:red_heart_canister" },
			{ item: "bhc:yellow_heart" },
			{ item: "minecraft:enchanted_golden_apple" },
			{ tag: "c:wither_bones" }
		],
		result: { count: 1, id: "bhc:yellow_heart_canister" }
	}).id("bhc:yellow_heart_canister")

	// Elsebase has a single bedrock layer at Y=0, within the bore's blade area at Y=1 or Y=2.
	let elsebaseBoreOutputs = [
		{ item: "ember_shard", weight: 60 },
		{ item: "ember_crystal", weight: 20 },
		{ item: "ember_grit", weight: 20 }
	]
	for (let output of elsebaseBoreOutputs) {
		event.custom({
			type: "embers:boring",
			dimensions: ["elsebase:backdoor"],
			min_height: 1,
			max_height: 2,
			output: { id: "embers:" + output.item },
			required_block: { amount: 3, block_tag: "embers:world_bottom" },
			weight: output.weight
		}).id("kubejs:embers/boring/elsebase/" + output.item)
	}

	// Raise raw-metal processing to two ingots; retain the native ore-block bonus.
	// Collect first so replacing recipes cannot mutate the collection being visited.
	let meltingReplacements = []
	event.forEachRecipe({ type: "embers:melting" }, recipe => {
		let data = JSON.parse(recipe.json.toString())
		let inputTag = data.input && data.input.tag
		if (typeof inputTag !== "string") return
		let amount
		if (/^c:raw_materials\//.test(inputTag)) amount = 180
		else if (/^c:storage_blocks\/raw_/.test(inputTag)) amount = 1620
		else if (/^c:ores\//.test(inputTag)) amount = 360
		else return
		if (!data.output || !Number.isInteger(data.output.amount) || data.output.amount <= 0) {
			throw new Error("Invalid molten output in ore recipe " + recipe.id)
		}
		data.output.amount = amount
		meltingReplacements.push({ id: String(recipe.id), data: data })
	})
	for (let replacement of meltingReplacements) {
		event.remove({ id: replacement.id })
		event.custom(replacement.data).id(replacement.id)
	}
})
