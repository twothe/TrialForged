# Ars-Fortschritt durch generischen Kistenloot

Stand: 05.10.2026. Ziel ist, die Glyphen-/Essenzbeschaffung durch Erkundung zu ergänzen. Ars-Additions-Spezialkisten behalten ihren vorhandenen Loot. Nach Prüfung der installierten Loot Integrations hat der Nutzer ausdrücklich normale LootJS-Bonuswürfe mit möglichen Abweichungen der endgültigen Fundhäufigkeit gewählt.

## Bonuswürfe

`kubejs/server_scripts/ars_chest_loot.js` ergänzt den vorhandenen Loot über die reguläre `LootJS.modifiers`-Schnittstelle:

| Bonus | Chance pro freigegebenem Tabellenwurf | Basisanzahl |
|---|---:|---:|
| `ars_additions:codex_entry` | 10 % | 1 |
| `ars_additions:lost_codex_entry` | 4 % | 1 |
| `ars_additions:ancient_codex_entry` | 1 % | 1 |
| Zufällige Ars-Nouveau-Essenz | 20 % | 1 |

Die vier Würfe sind unabhängig; mehrere Boni können gemeinsam auftreten. Der Essenzpool wählt gleichverteilt Air, Earth, Fire, Water, Abjuration, Conjuration oder Manipulation. Es gibt einen einzigen Poolwurf ohne Luck-Bonuswürfe; nicht sieben unabhängige Essenzchancen. Die Angaben sind Wahrscheinlichkeiten, kein garantierter Abstand zwischen Funden.

## Auswahl und Ausschlüsse

Die vollständige explizite Auswahl steht in `kubejs/config/ars_chest_loot.json`. Sie umfasst generische Dorf-, Dungeon-, Ruinen-, Schatz- und Versorgungskisten des installierten Bestands, einschließlich Tabellen außerhalb des üblichen `chests/`-Pfads, etwa Twilight Forest. Gemischte Strukturkisten dürfen modtypische Materialien enthalten. Reine Spezialgegenstands-, Boss-, Vault-, Quest-, Spawner-, Vasen-, Dispenser-, Archäologie- und interne Ergänzungstabellen sind nicht pauschal freigegeben.

Insbesondere bleiben `ars_additions:chests/arcane_library`, `nexus_tower` und `ruined_portal` von der direkten Änderung ausgeschlossen. Ein allgemeiner `LootType.CHEST`-Filter wäre ungeeignet: Zahlreiche installierte Spawner-, Vasen- und Helfertabellen tragen ebenfalls diesen Typ. Neue Mods oder Tabellen werden deshalb erst nach Prüfung in die Liste aufgenommen.

Es wird nur der abschließend abgefragten freigegebenen Tabelle ein LootJS-Modifikator zugeordnet. Normale verschachtelte Tabellenreferenzen bekommen dadurch nicht jeweils zusätzliche Boni. Es werden keine vorhandenen Tabellen ersetzt und keine Mods installiert oder geändert.

## Bestehende Lootverteilung

Geprüft wurden LootJS 3.7.0, Loot Integrations 4.7 mit den installierten Erweiterungen und Lootr 1.11.38.127. Die installierten JARs zeigen:

- LootJS führt seine Modifikatoren im NeoForge-Lootpfad aus.
- Loot Integrations bearbeitet das Ergebnis danach, zieht zusätzliche Lootquellen, bündelt Stacks und entfernt bei Überschreiten seiner Grenzen gegebenenfalls zufällige Stacks. Verschiedene Regeln begrenzen auf 5–13 Stacks; andere verwenden 100.
- Loot Integrations kann eine freigegebene Vanilla-Tabelle intern mit vollständigen Modifikatoren auswürfeln. Dadurch können Ars-Boni als zusätzliche Quellitems weiterverteilt werden, auch an Tabellen, die selbst keinen Ars-Modifikator haben. Das betrifft grundsätzlich auch bereits vorhandene Integrationen in spezielle Kisten oder Gegnerloot. Die explizite Liste begrenzt die **direkte** Änderung, nicht die native Weiterverteilung.
- Die bestehenden Integrationsregeln und Gewichtungen bleiben erhalten. Daher können finale Chancen und Mengen von den eingestellten Basiswürfen abweichen. Diese Einschränkung ist ausdrücklich akzeptiert; es gibt keinen eigenen Eingriff nach Loot Integrations.
- Die bestehende Levelbeute erzeugt ebenfalls freigegebene Kistentabellen. Sie kann entsprechend auch einen Ars-Gegenstand auswählen; ihr eigener Ein-Item-Vertrag bleibt bestehen.

Lootr erzeugt persönliche Inventare über den normalen Tabellen-/Befüllungspfad. Die Ergänzung führt keine eigene Spielerzählung oder Fortschrittsskalierung ein. Für Lootr beziehen sich Bonuswürfe auf neu erzeugten persönlichen Loot, nicht auf jeden erneuten Zugriff auf dieselbe Kiste. Bereits ausgefüllte Inventare werden nicht nachträglich geändert. Ungeöffnete Kisten mit gespeicherter LootTable können dagegen die neuen Regeln beim ersten Auswürfeln verwenden.

## Aktivierung und Prüfung

Auf Clientinstanz und dediziertem Server müssen das Skript und die JSON-Auswahl vorhanden sein. Für die erstmalige Aktivierung vollständig neu starten; spätere Änderungen sind per `/reload` ladbar. Danach meldet das Serverlog die Anzahl registrierter Tabellen. Die Quellenliste sollte nach Modänderungen erneut geprüft werden.

```powershell
./tests/check-ars-chest-assets.ps1
./tests/run-runtime-client.ps1
```

Die Ressourcenprüfung verifiziert Tabellenexistenz, Duplikate, zentrale Ausschlüsse und die zehn Ars-Itemressourcen gegen die tatsächlich installierten JARs. Die isolierte Laufzeitprüfung verwendet das Produktionsskript und native LootJS-/Minecraft-APIs: Tabellenregistrierung, 20.000 Bonuswürfe, Basisanzahl, gleichverteilte Essenzen, erhaltenen Ausgangsloot, ausgeschlossene Tabellen und echte modifizierte Kistenwürfe. Statistische Grenzen dienen als Regressionserkennung; der verbindliche Chancenvertrag entsteht durch die registrierten Lootbedingungen.

Der isolierte, stumme Clientlauf vom 05.10.2026 bestand mit allen 480 registrierten Tabellen. In 20.000 nativen Bonuswürfen entstanden 2.000 Codex Entries, 800 Lost Codex Entries, 222 Ancient Codex Entries und 3.991 einzelne Essenzen. Alle sieben Essenzen lagen innerhalb der statistischen Prüftoleranz. Vorhandener Ausgangsloot blieb erhalten; ausgeschlossene Spezial-, Boss-, Helfer- und Gegnertabellen erhielten keinen direkten Bonus.

Je 300 echte Tabellenwürfe aus Vanilla, Dungeon Crawl, Nova Structures, When Dungeons Arise, Twilight Forest und Kaisyn erzeugten Codex-Funde mit den aktiven Integrationen. Die ursprünglichen Pools von Arcane Library und Nexus Tower behielten ihre 1–4 normalen Codex Entries; nachgelagerte bestehende Modifikatoren sind davon getrennt zu betrachten. Lootr erzeugte in 50 Testcontainern persönliche Inventare für zwei serverseitige Identitäten mit Ars-Funden, getrenntem Inventarzustand und erhaltenem Loot beim Wiederöffnen. Die zweite Identität war ein NeoForge-FakePlayer. Ein dedizierter Server mit mehreren verbundenen Clients ist durch diesen Lauf nicht belegt.

Ergebnis und Protokoll liegen in `local/runtime-validation/runtime-ars-chest-result.json` und `local/runtime-validation/logs/latest.log`. Zusätzlich bestanden Spielerlogin, JEI-Start, Terrain-Laden und die vorhandenen Kampf-/Fortschrittsprüfungen. Die beiden bekannten Ressourcen-Tagfehler `farmersdelight:pies` und `create:brittle` bleiben als gesonderte Warnungen bestehen.
