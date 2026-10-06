// priority: 0

ServerEvents.recipes((event) => {
	// Conveience
	event.shaped("16x minecraft:stick", ["W", "W"], { W: "#minecraft:logs" })
	event.shaped("4x minecraft:chest", ["WWW", "W W", "WWW"], { W: "#minecraft:logs" })
	event.shaped("minecraft:hopper", ["IWI", "IWI", " I "], { W: "#minecraft:logs", I:"#c:ingots/iron" })
})

ServerEvents.tags("item", (event) => {
	// Remove all other chests from chest tags, so you can actually craft things without going crazy
	event.removeAll("c:chests")
	event.removeAll("c:chests/wooden")
	event.add("c:chests", "minecraft:chest")
	event.add("c:chests/wooden", "minecraft:chest")
})


ServerEvents.tags("block", (event) => {
})
