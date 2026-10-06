/** Exercises the production melting transformation without duplicating recipe classification. */
var meltingHandler
var ServerEvents = { recipes: function (handler) { meltingHandler = handler } }

function runEmbersMeltingRecipeTests() {
    var fixtures = [
        { id: 'test:raw_iron', input: { tag: 'c:raw_materials/iron' }, amount: 120, expected: 180 },
        { id: 'test:raw_copper_block', input: { tag: 'c:storage_blocks/raw_copper' }, amount: 1080, expected: 1620 },
        { id: 'test:lead_ore', input: { tag: 'c:ores/lead' }, amount: 240, expected: 360 },
        { id: 'test:iron_ingot', input: { tag: 'c:ingots/iron' }, amount: 90 },
        { id: 'test:iron_block', input: { tag: 'c:storage_blocks/iron' }, amount: 810 },
        { id: 'test:iron_nugget', input: { tag: 'c:nuggets/iron' }, amount: 10 }
    ]
    var originals = {}
    var changed = {}
    var removed = {}
    for (var index = 0; index < fixtures.length; index++) {
        var fixture = fixtures[index]
        originals[fixture.id] = JSON.stringify({ type: 'embers:melting', input: fixture.input,
            output: { amount: fixture.amount, tag: 'c:molten_iron' },
            bonus: { amount: 10, tag: 'c:molten_copper' },
            'neoforge:conditions': [{ type: 'neoforge:not', value: { type: 'neoforge:tag_empty', tag: 'c:ingots/iron' } }] })
    }
    meltingHandler({
        replaceInput: function () {},
        remove: function (filter) { if (filter.id) removed[filter.id] = true },
        custom: function (recipe) { return { id: function (id) { changed[id] = recipe } } },
        forEachRecipe: function (filter, consumer) {
            if (filter.type !== 'embers:melting') throw new Error('Unexpected recipe filter')
            for (var index = 0; index < fixtures.length; index++) {
                var fixture = fixtures[index]
                // A Gson object's script-visible contract is a JSON-producing toString method.
                consumer({ id: fixture.id, json: { toString: (function (text) { return function () { return text } })(originals[fixture.id]) } })
                if (changed[fixture.id]) throw new Error('Recipe replaced during iteration')
            }
        }
    })
    for (var index = 0; index < fixtures.length; index++) {
        var fixture = fixtures[index]
        if (fixture.expected === undefined) {
            if (changed[fixture.id] || removed[fixture.id]) throw new Error('Finished metal recipe modified')
        } else {
            if (!removed[fixture.id] || !changed[fixture.id]) throw new Error('Ore recipe not replaced under original ID')
            var expected = JSON.parse(originals[fixture.id])
            expected.output.amount = fixture.expected
            if (JSON.stringify(changed[fixture.id]) !== JSON.stringify(expected)) {
                throw new Error('Unexpected change to recipe ' + fixture.id)
            }
        }
    }
    return fixtures.length
}
