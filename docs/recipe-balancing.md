# Rezept-Balancing

`kubejs/server_scripts/balancing-recipes.js` ist die zentrale Datei für das Entfernen und Verändern von Rezepten zur Spielbalance. Die vorhandenen Komfortrezepte bleiben in `qol-recipes.js`.

Blöcke werden ausschließlich über ihre Herstellungsrezepte eingeschränkt. Ihre Registrierung, vorhandene Exemplare und ihre Funktion bleiben erhalten. Admins können sie weiterhin beispielsweise mit `/give` bereitstellen.

## Easy Villagers

- Rezepte mit dem Ergebnis `easy_villagers:iron_farm` oder `easy_villagers:farmer` werden entfernt.
- In `easy_villagers:trader` und `easy_villagers:auto_trader` wird die zentrale Redstone-Zutat (`#c:dusts/redstone`) durch `minecraft:emerald_block` ersetzt. Muster, Glas- und Eisen-Tags sowie der Netherite-Barren des Autotraders bleiben unverändert.

Die Rezept-IDs und Zutaten wurden am 06.10.2026 direkt aus der installierten Easy-Villagers-JAR `1.21.1-1.1.45` geprüft. KubeJS `2101.7.2-build.377` stellt die verwendeten Rezept-APIs bereit. Syntax und Skriptregistrierung wurden geprüft; ein Minecraft-Laufzeittest wurde für diese Änderung nicht durchgeführt.

Die Änderungen gelten nach einem Server-/Weltneustart oder `/reload`. Für zusätzliche Balanceänderungen diese Datei erweitern; keine Blockregistrierungen oder Inventare entfernen.
