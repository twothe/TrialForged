# Specs Codex — config guide

Configs live in `config/specs_irons_spellbooks/`. Edit on the **server**, then restart and rejoin so clients sync.

JSON files are plain data only (no comment headers). This guide has the explanations and examples.

Spell / school ids: see auto-generated `known_spells.json` (overwritten every server start).

---

## `codex_settings.json`

| Key | Default | Meaning |
| --- | --- | --- |
| `respecRefundPercent` | `25` | Percent of spent unlock XP refunded on Respec (0–100) |
| `includeCreativeSpells` | `false` | If true, Iron's creative-only spells (`AllowCrafting = false`, e.g. Fang Swirl) appear in the Codex |
| `allowImbuedWeaponCasting` | `true` | Held imbued weapons can be cast with **Cast Imbued Spell** (default `R`). Shows a slot left of the actionbar. Does **not** require Codex discovery/tier (blacklist still applies) |
| `defaultActionbarSlots` | `3` | Visible actionbar slots when **no spellbook** is equipped (scrolls / empty). Clamped to 1–15. Equipped spellbooks still use the book's own slot count |

Tier unlocks also need matching Iron's ink (next tier rarity) plus XP. Discovering a spell (Codex page / scroll / spellbook extract) grants **tier I** for free; `+` is for higher tiers. XP costs are **not** in this file — use the cost configs below.

```json
{
  "respecRefundPercent": 25,
  "includeCreativeSpells": false,
  "allowImbuedWeaponCasting": true,
  "defaultActionbarSlots": 3
}
```

---

## `school_unlock_costs.json`

XP costs for unlocking **higher** spell tiers (Codex `+` button). Tier I is granted when you discover the spell.

- Values are levels-worth of XP from level **0** (vanilla curve), **not** “subtract N from your current level”.
- Default if a tier is missing: `20 + 10 × tier` (tier 1 = 30, tier 2 = 40, …).
- Priority: `spell_unlock_costs.json` → this file → default.
- Matching school focus = extra **25%** off.
- Use `{}` under a school to keep defaults for every tier.
- Missing schools are added automatically on server start.

```json
{
  "irons_spellbooks:fire": {
    "1": 20,
    "2": 35,
    "3": 50
  },
  "irons_spellbooks:ice": {}
}
```

---

## `spell_unlock_costs.json`

Optional **per-spell** XP overrides (same units as school costs).

- Omit a spell (or use `{}`) to fall back to school costs / default.
- Priority: this file → `school_unlock_costs.json` → default.

```json
{
  "irons_spellbooks:fireball": {
    "1": 15,
    "2": 25,
    "3": 40
  }
}
```

---

## `spell_blacklist.json`

Hide/block spells from the Codex (and casting). Full spell ids from `known_spells.json`.

```json
{
  "blacklist": [
    "irons_spellbooks:fireball",
    "irons_spellbooks:magic_missile"
  ]
}
```

---

## `school_blacklist.json`

Server-wide blocked schools: hidden from the Codex, cannot be cast, and cannot be locked/unlocked via `/specs_codex school` commands. Full school ids = keys in `known_spells.json`.

```json
{
  "blacklist": [
    "irons_spellbooks:blood",
    "irons_spellbooks:eldritch"
  ]
}
```

---

## Admin commands (`/specs_codex`, permission 2)

- `/specs_codex spell max <players>` — set every **already discovered** spell to its max Codex tier
- `/specs_codex spell max <players> <school>` — same, only for that school (e.g. `irons_spellbooks:fire`)

Does not discover new spells. Use `spell unlock` / `unlock_all` for that.

---

## `known_spells.json`

**Auto-generated** reference of spell ids grouped by school. Overwritten every server start — do not hand-edit; copy ids into the other configs.
