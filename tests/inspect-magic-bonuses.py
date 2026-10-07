"""Inventory installed Apotheosis magic bonuses without changing game resources.

Read JAR definitions and relevant native conditions. The snapshot is static evidence,
not proof that a world's datapack stack or runtime registry loaded these definitions.
Unknown conditions remain explicit rather than being assumed enabled.
"""

import argparse
import collections
import datetime
import hashlib
import json
from pathlib import Path
import tomllib
import zipfile


MAGIC_PREFIXES = (
    "ars_nouveau:", "irons_spellbooks:", "aces_spell_utils:",
    "malum:", "lodestone:", "puffish_attributes:magic_",
)


def collect_references(value, path=""):
    """Keep operations, values and JSON locations for nested multi-attribute bonuses."""
    references = []
    if isinstance(value, dict):
        for key in ("attribute", "mob_effect", "enchantment"):
            identifier = value.get(key)
            if isinstance(identifier, str) and identifier.startswith(MAGIC_PREFIXES):
                references.append({
                    "kind": key, "id": identifier, "json_path": path,
                    "operation": value.get("operation"), "values": value.get("values"),
                })
        for key, child in value.items():
            references.extend(collect_references(child, f"{path}/{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            references.extend(collect_references(child, f"{path}/{index}"))
    return references


def condition_state(condition, installed_mods, gem_config):
    """Return true, false or unknown for the inspected native condition subset."""
    kind = condition.get("type")
    if kind == "neoforge:mod_loaded":
        return condition["modid"] in installed_mods
    if kind in ("neoforge:true", "neoforge:false"):
        return kind == "neoforge:true"
    if kind == "neoforge:not":
        state = condition_state(condition["value"], installed_mods, gem_config)
        return None if state is None else not state
    if kind in ("neoforge:and", "neoforge:or"):
        states = [condition_state(child, installed_mods, gem_config)
                  for child in condition["values"]]
        if kind == "neoforge:and":
            return combine_conditions(states)
        return True if True in states else None if None in states else False
    if kind == "kaelos_gems:variant":
        enabled = next((section[condition["gem"]] for section in gem_config.values()
                        if isinstance(section, dict) and condition["gem"] in section), None)
        general = gem_config.get("general", {})
        frequency = general.get("frequency")
        floor = general.get("minimum_rarity")
        if enabled is None or frequency is None or floor is None:
            return None
        return (enabled and frequency.lower() == condition["frequency"].lower()
                and floor.lower() == condition["floor"].lower())
    return None


def combine_conditions(states):
    if False in states:
        return False
    return None if None in states else True


def create_snapshot(root):
    installed_mods = {"minecraft", "neoforge"}
    jars = sorted((root / "mods").glob("*.jar"))
    for jar in jars:
        with zipfile.ZipFile(jar) as archive:
            for name in ("META-INF/neoforge.mods.toml", "META-INF/mods.toml"):
                if name in archive.namelist():
                    metadata = tomllib.loads(archive.read(name).decode("utf-8-sig"))
                    installed_mods.update(mod["modId"] for mod in metadata.get("mods", []))
    config_paths = ("config/kaelos_gems.toml", "config/apothic_compat-common.toml",
                    "config/apothic_compats-startup.toml")
    configs = {name: tomllib.loads((root / name).read_text(encoding="utf-8-sig"))
               for name in config_paths}
    blacklist = set(configs["config/apothic_compat-common.toml"].get("affix_blacklist", []))
    definitions = []
    excluded = []
    magic_tags = []
    source_jars = set()
    for jar in jars:
        with zipfile.ZipFile(jar) as archive:
            for name in sorted(archive.namelist()):
                if name in ("data/c/tags/damage_type/is_magic.json",
                            "data/neoforge/tags/damage_type/is_magic.json",
                            "data/c/tags/damage_type/can_trigger_magic_damage.json"):
                    magic_tags.append({"jar": jar.name, "resource": name,
                                       "definition": json.loads(archive.read(name))})
                    source_jars.add(jar)
                parts = name.split("/")
                if (len(parts) < 4 or parts[0] != "data" or parts[2] not in ("affixes", "gems", "extra_gem_bonuses")
                        or not name.endswith(".json")):
                    continue
                data = json.loads(archive.read(name))
                references = collect_references(data)
                if not references and not data.get("type", "").startswith("irons_apothic:"):
                    continue
                identifier = parts[1] + ":" + "/".join(parts[3:])[:-5]
                state = combine_conditions([
                    condition_state(c, installed_mods, configs["config/kaelos_gems.toml"])
                    for c in data.get("neoforge:conditions", [])])
                if parts[2] == "affixes" and identifier in blacklist:
                    state = False
                source_jars.add(jar)
                header = {"id": identifier, "kind": parts[2], "jar": jar.name, "resource": name}
                if state is False:
                    excluded.append(header)
                else:
                    definitions.append({**header, "condition_state": "unknown" if state is None else "eligible",
                                        "references": references, "definition": data})
    attributes = collections.defaultdict(lambda: {"gems": set(), "affixes": set(), "extra_gem_bonuses": set()})
    for definition in definitions:
        for reference in definition["references"]:
            if reference["kind"] == "attribute":
                attributes[reference["id"]][definition["kind"]].add(definition["id"])
    runtime_patterns = ("puffish_attributes-", "ars_nouveau-", "irons_spellbooks-",
                        "Apotheosis-", "lodestone-", "malum-", "aces_spell_utils-")
    source_jars.update(jar for jar in jars if jar.name.startswith(runtime_patterns))
    return {
        "generated_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "limitations": ["Static top-level JAR inventory; eligible does not mean runtime-loaded.",
                        "World datapacks, resource-pack priority, embedded mods and code-generated bonuses are not enumerated.",
                        "Only explicitly handled native conditions are evaluated; unknown conditions remain unknown."],
        "configs": configs,
        "sources": [{"jar": jar.name, "sha256": hashlib.sha256(jar.read_bytes()).hexdigest()}
                    for jar in sorted(source_jars)],
        "attributes": {key: {kind: sorted(ids) for kind, ids in groups.items()}
                       for key, groups in sorted(attributes.items())},
        "definitions": definitions, "excluded_definitions": excluded,
        "magic_damage_tags": magic_tags,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    snapshot = create_snapshot(args.root)
    args.output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    unknown = sum(d["condition_state"] == "unknown" for d in snapshot["definitions"])
    print(f"Saved {len(snapshot['definitions'])} eligible/unknown magic definitions, "
          f"{len(snapshot['attributes'])} attributes, {unknown} unknown conditions to {args.output}")


if __name__ == "__main__":
    main()
