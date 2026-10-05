# Dear Diary Server Config

Main file: `dear_diary.json`

Use this file to control manual entry limits, shared memory time, and automatic memories.

## Language

- `language.defaultDiaryLanguage`: fallback language for automatic diary text when the player's client language is unknown.

## Manual entries

- `manualEntries.maxTitleLength`: maximum title length for manual entries and edits.
- `manualEntries.maxTextLength`: maximum text length for manual entries and edits.
- `manualEntries.maxSharedTextLength`: maximum text length shown when a memory is shared to chat.
- `manualEntries.sharedMemoryTimeZone`: timezone used for shared memories. Use `SERVER`, `UTC`, or an IANA timezone id such as `Europe/Moscow`.

## Automatic memories

- `automaticMemories.enabled`: turns automatic memories on or off.
- `automaticMemories.createOriginEntry`: creates the first origin memory. Existing origin memories are not duplicated.
- `automaticMemories.minimumImportance`: hides automatic memories below the selected importance.
- `automaticMemories.categories`: set a category to `false` to disable it.
- `automaticMemories.disabledEvents`: exact event ids to disable.

## Importance values

- `MINOR`
- `NORMAL`
- `MAJOR`
- `LEGENDARY`

## Category keys

- `beginning`
- `discovery`
- `exploration`
- `combat`
- `death`
- `building`
- `resources`
- `pets`
- `bosses`
- `rare`
- `other`

## Examples

Disable death memories:

```json
"categories": {
  "death": false
}
```

Disable one event:

```json
"disabledEvents": [
  "minecraft:death_by_fall"
]
```

## Useful commands

- `/deardiary config_status`: show the active config summary.
- `/deardiary config_help`: show the paths to these guide files.
- `/deardiary events_list`: list registered event ids in game.
- `/deardiary events_list COMBAT`: list one category.
- `/deardiary validate_events`: check automatic event definitions and lang keys.

See `EVENTS.md` for the current automatic event ids.
