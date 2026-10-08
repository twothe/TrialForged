# Start Skill Studio

Double-click `Start-Skillatelier.cmd` or open `index.html` in your browser. No installation or internet is required. Keep all files in this folder together.

Use **+ Add skill** to place skills on the hex grid. **Connect** links two skills. Click a skill to edit its player description, native bonuses and implementation requests.

Input is autosaved immediately, including unfinished values. Reopening restores your previous session. **Save JSON copy** and **Implementation brief** export optional backups; both can be reopened with **Open plan**. Cache is tied to this browser/profile and can be lost when browser data is cleared.

The alphabetic skill list has a name/description filter. The item picker has vanilla names and local texture previews. Mod item IDs can be entered manually.

**Copy skill** places more instances of the same shared skill. Changing its name, bonuses, icon, color, cost or other content updates every instance across the plan. Positions, IDs, connections and root status remain local. Click free cells, then press **Esc** to finish. Delete removes only the selected instance. Untouched, disconnected **New skill** placeholders are deleted without confirmation.

Names are unique across the plan, case-sensitive and trimmed. An existing name blocks leaving the name field and exporting until corrected. Use **Copy skill** to share existing content. The compact A–Z library shows each skill once with an instance count; click again to cycle placements.

Exception: **New skill** and its numbered/case variants are independent drafts. Copying a draft creates separate content. Entering this reserved name is always allowed and assigns an available number; for a shared named skill it detaches only the selected instance. Previously shared placeholder drafts separate automatically when loaded.

Version-1 drafts and files upgrade automatically. Identical content with the same name shares one definition; conflicting content gets variant names without losing node IDs or values. Original legacy cache copies are retained before replacement. Version-2 exports require the updated editor.

Native attributes are sorted together A–Z. The item combo integrates search and texture previews. It matches anywhere in the name or ID, ignoring case; arrows and Enter choose, Esc closes. Mod IDs are under **Custom item ID**. Selected local icons also appear inside hex nodes.

The attribute catalogue includes all 42 Pufferfish attributes and 8 selected vanilla attributes, not every attribute in the modpack. Describe other mods' bonuses in **Technical implementation request**.

The color picker has a synchronized **#RRGGBB** text field for normal copy/paste. Six hex digits with or without **#** are accepted. Unfinished text is autosaved without replacing the last valid node color.

Shortcuts outside input fields: `+` / `N` add, `Ctrl+D` copy, `Delete` remove selected skill, `Esc` select, `Ctrl+Z` / `Ctrl+Y` undo/redo, `Ctrl+S` export JSON.

**Tree design notes** guide implementation of the whole tree: theme, playstyle, balance limits and interactions. They are separate from player descriptions and do not create automatic requirements.

Detailed project guide (German) and verification limits: [docs/skill-planner.md](../../docs/skill-planner.md).
