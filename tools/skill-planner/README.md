# Start Skill Studio

Double-click `Start-Skillatelier.cmd` or open `index.html` in your browser. No installation or internet is required. Keep all files in this folder together.

Use **+ Add skill** to place skills on the hex grid. **Connect** links two skills. Click a skill to edit its player description, native bonuses and implementation requests.

Input is autosaved immediately, including unfinished values. Reopening restores your previous session. **Save JSON copy** and **Implementation brief** export optional backups; both can be reopened with **Open plan**. Cache is tied to this browser/profile and can be lost when browser data is cleared.

The alphabetic skill list has a name/description filter. The item picker has vanilla names and local texture previews. Mod item IDs can be entered manually.

**Copy skill** copies the selected skill's content. Click free hex cells to place independent copies; press **Esc** to finish. Connections and root status are not copied. Untouched, disconnected **New skill** placeholders are deleted without confirmation; authored content still requires confirmation.

Native attributes are sorted together A–Z. Item searches match anywhere in the name or ID, ignoring case. Selected local icons also appear inside the hex nodes; unavailable previews retain a symbolic marker.

Shortcuts outside input fields: `+` / `N` add, `Ctrl+D` copy, `Delete` remove selected skill, `Esc` select, `Ctrl+Z` / `Ctrl+Y` undo/redo, `Ctrl+S` export JSON.

**Tree design notes** guide implementation of the whole tree: theme, playstyle, balance limits and interactions. They are separate from player descriptions and do not create automatic requirements.

Detailed project guide (German) and verification limits: [docs/skill-planner.md](../../docs/skill-planner.md).
