"""Build the offline vanilla item picker from an existing Minecraft client JAR, without downloads."""
import argparse
import base64
import json
from pathlib import Path
from zipfile import ZipFile


def build_catalog(client_jar: Path, destination: Path) -> None:
    """Export named item models and their first resolvable texture; previews are not 3D renders."""
    with ZipFile(client_jar) as archive:
        names = set(archive.namelist())
        language = json.loads(archive.read("assets/minecraft/lang/en_us.json"))

        def textures(model_path: str, visited: frozenset[str] = frozenset()) -> dict:
            if model_path in visited or model_path not in names:
                return {}
            model = json.loads(archive.read(model_path))
            parent = model.get("parent", "")
            inherited = {}
            if parent:
                namespace, resource = parent.split(":", 1) if ":" in parent else ("minecraft", parent)
                inherited = textures(f"assets/{namespace}/models/{resource}.json", visited | {model_path})
            return inherited | model.get("textures", {})

        items = []
        for entry in sorted(names):
            if not entry.startswith("assets/minecraft/models/item/") or not entry.endswith(".json"):
                continue
            item_name = entry.removeprefix("assets/minecraft/models/item/").removesuffix(".json")
            label = language.get("item.minecraft." + item_name) or language.get("block.minecraft." + item_name)
            if not label:
                continue
            candidates = textures(entry)
            preview = None
            for key in ["layer0", "all", "side", "texture", "top", *candidates]:
                resource = candidates.get(key, "")
                visited_keys = set()
                while resource.startswith("#") and resource not in visited_keys:
                    visited_keys.add(resource)
                    resource = candidates.get(resource[1:], "")
                if not resource or resource.startswith("#"):
                    continue
                namespace, name = resource.split(":", 1) if ":" in resource else ("minecraft", resource)
                texture_path = f"assets/{namespace}/textures/{name}.png"
                if texture_path in names:
                    preview = "data:image/png;base64," + base64.b64encode(archive.read(texture_path)).decode("ascii")
                    break
            items.append({"id": "minecraft:" + item_name, "label": label, "preview": preview})
    items.sort(key=lambda item: (item["label"].casefold(), item["id"]))
    header = "/** Local Minecraft 1.21.1 item names and flat texture previews; generated from the installed client JAR. */\n"
    destination.write_text(header + "globalThis.SkillIcons = " + json.dumps(items, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Exported {len(items)} items, {sum(bool(item['preview']) for item in items)} texture previews.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("client_jar", type=Path)
    parser.add_argument("destination", type=Path)
    arguments = parser.parse_args()
    build_catalog(arguments.client_jar, arguments.destination)
