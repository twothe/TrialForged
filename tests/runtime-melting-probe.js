/** Checks decoded native recipes and processes iron inputs through Embers' production recipe API. */
PlayerEvents.loggedIn(event => {
    event.server.scheduleInTicks(80, () => {
        let result = { status: 'running', recipes: [], iron: [] }
        try {
            let Melting = Java.loadClass('com.rekindled.embers.recipe.MeltingRecipe')
            let Input = Java.loadClass('net.minecraft.world.item.crafting.SingleRecipeInput')
            let controls = { 'embers:melting/ingots/iron': 90, 'embers:melting/nuggets/iron': 10,
                'embers:melting/storage_blocks/iron': 810 }
            let controlCount = 0
            let holders = event.server.getRecipeManager().getRecipes().toArray()
            console.info('MELTING_TEST_START: ' + holders.length + ' recipes')
            let checkRecipe = holder => {
                let id = String(holder.id())
                let recipe = holder.value()
                if (!(recipe instanceof Melting)) return
                let expected
                if (id.startsWith('embers:melting/raw_materials/')) expected = 180
                else if (id.startsWith('embers:melting/storage_blocks/raw_')) expected = 1620
                else if (id.startsWith('embers:melting/ores/')) expected = 360
                else if (controls[id] !== undefined) { expected = controls[id]; controlCount++ }
                else return
                let amount = recipe.getDisplayOutput().getAmount()
                if (amount !== expected) throw new Error(id + ': expected ' + expected + ', got ' + amount)
                result.recipes.push({ id: id, amount: amount })
                console.info('MELTING_CHECK: ' + id + ' = ' + amount)
                let ironItem
                if (id.startsWith('embers:melting/raw_materials/iron_')) ironItem = 'minecraft:raw_iron'
                else if (id.startsWith('embers:melting/storage_blocks/raw_iron_')) ironItem = 'minecraft:raw_iron_block'
                else if (id.startsWith('embers:melting/ores/iron_')) ironItem = 'minecraft:iron_ore'
                if (ironItem) {
                    let stack = Item.of(ironItem, 2)
                    let context = new Input(stack)
                    if (!recipe.matches(context, event.player.level)) throw new Error('Native ingredient mismatch: ' + id)
                    let output = recipe.process(context)
                    if (output.getAmount() !== expected || stack.getCount() !== 1) {
                        throw new Error('Native melting process mismatch: ' + id)
                    }
                    result.iron.push({ id: id, amount: output.getAmount(), remaining: 1 })
                }
            }
            for (let index = 0; index < holders.length; index++) checkRecipe(holders[index])
            if (controlCount !== 3 || result.iron.length !== 3 || result.recipes.length < 12) {
                throw new Error('Missing active melting recipes or control recipes')
            }
            result.status = 'passed'
            console.info('MELTING_TESTS_COMPLETE: ' + result.recipes.length + ' native recipes')
        } catch (error) {
            result.status = 'failed'
            result.error = String(error)
            console.error('MELTING_TEST_FAILED: ' + error)
        }
        JsonIO.write('runtime-melting-result.json', result)
    })
})
