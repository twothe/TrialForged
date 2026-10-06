/** Verifies the production recipe handler's Elsebase additions in installed Rhino. */
var capturedRecipeHandler
var ServerEvents = {
    recipes: function (handler) { capturedRecipeHandler = handler }
}

function runEmbersBoreRecipeTests() {
    var registered = []
    capturedRecipeHandler({
        remove: function () {},
        replaceInput: function () {},
        forEachRecipe: function () {},
        custom: function (recipe) {
            return { id: function (id) { registered.push({ id: id, recipe: recipe }) } }
        }
    })
    var expected = {
        'kubejs:embers/boring/elsebase/ember_shard': ['embers:ember_shard', 60],
        'kubejs:embers/boring/elsebase/ember_crystal': ['embers:ember_crystal', 20],
        'kubejs:embers/boring/elsebase/ember_grit': ['embers:ember_grit', 20]
    }
    var count = 0
    for (var index = 0; index < registered.length; index++) {
        var record = registered[index]
        if (record.recipe.type !== 'embers:boring') continue
        var recipe = record.recipe
        var output = expected[record.id]
        if (!output || recipe.output.id !== output[0] || recipe.weight !== output[1]) {
            throw new Error('Unexpected Elsebase bore output or recipe ID: ' + record.id)
        }
        if (recipe.dimensions.length !== 1 || recipe.dimensions[0] !== 'elsebase:backdoor') {
            throw new Error('Elsebase bore recipe must target only elsebase:backdoor')
        }
        if (recipe.min_height !== 1 || recipe.max_height !== 2) {
            throw new Error('Elsebase bore height must be Y=1 through Y=2')
        }
        if (recipe.required_block.amount !== 3 || recipe.required_block.block_tag !== 'embers:world_bottom') {
            throw new Error('Native bedrock requirement must be preserved')
        }
        if (recipe.chance !== undefined) {
            throw new Error('Native field-density chance must not be overridden')
        }
        delete expected[record.id]
        count++
    }
    if (count !== 3 || Object.keys(expected).length !== 0) {
        throw new Error('Expected exactly three distinct Elsebase bore recipes')
    }
    return count
}
