# Gebietsskalierung und Levelbeute

Stand: 02.10.2026, Dynamic Difficulty NeoForge 1.3.4 für Minecraft 1.21.1. Advanced Mob Leveling wurde vom Nutzer entfernt. Seine verbliebenen Konfigurationsdateien sind nicht mehr aktiv.

## Boss-Ausschlüsse

`config/dynamic_difficulty/sync.toml` enthält die native `blacklistedMobs`-Liste. Dieselben IDs stehen in `kubejs/config/trialforged_leveling.json`, damit die ergänzende Bereinigung und der Bonus-Loot dieselben Gegner ausschließen. `node tests/check-level-loot.cjs` prüft die Übereinstimmung.

Die Liste umfasst die vier Vanilla-Gegner Wither, Ender Dragon, Warden und Elder Guardian sowie die Boss-Tags der installierten Mods Aether, Ars Nouveau, Cataclysm, Iron's Spellbooks, Mowzie's Mobs und Twilight Forest. Ergänzend sind die vier Lord-Pumpkinhead-Phasen aus Born in Chaos und NeoVitaes Daemonium Doloris aufgenommen. Insgesamt sind es 36 Entity-IDs.

Eine Blacklist verhindert neue Skalierung, entfernt aber nach der installierten Dynamic-Implementierung keine bereits gespeicherten Attributmodifikatoren. Deshalb entfernt `kubejs/server_scripts/dynamic_difficulty_integration.js` beim serverseitigen Welt-/Chunkbeitritt ausgeschlossener Bosse die Dynamic-Modifikatoren und den alten Advanced-Modifikator `autoleveling:level`. Der gespeicherte Dynamic-Level-Anhang und der alte `LEVEL`-Marker werden ebenfalls entfernt. Andere Modifikatoren bleiben erhalten. Die vorherige Gesundheitsfraktion bleibt erhalten; beschädigte Bosse werden nicht geheilt. Weltdateien werden nicht direkt bearbeitet.

Die drei höheren Vanilla-Meilensteine verwenden die native [Always-Infernal-Konfiguration](vanilla-boss-profiles.md). Die festen KubeJS-Bossprofile wurden am 05.10.2026 auf Nutzerwunsch entfernt. Boss-Ausschlüsse und die bestehende Levelbereinigung bleiben erhalten.

## Elsebase ohne Gebietsskalierung

Seit dem 06.10.2026 enthält `kubejs/data/elsebase/leveling_settings/dimensions/backdoor.json` eine native Dynamic-Difficulty-Regel für `elsebase:backdoor`. Zuvor fiel die Dimension auf die globalen Einstellungen zurück: 0,01 Level pro Block Entfernung ohne Levelobergrenze. Weit entfernte Elsebase-Räume konnten dadurch sehr hohe Gegnerlevel erhalten.

Die Dimensionsregel setzt alle Umgebungs- und Spielerfaktoren auf null, schaltet Biom-/Struktur-/Spielerboni aus und verwendet keine Level-Attributboni. Dynamic Difficulty begrenzt reguläre berechnete Level intern auf mindestens 1; diese technische Basisstufe bleibt erhalten, ohne weitere Skalierung. Die zusätzliche Levelbeute ist für Elsebase über `excludedDimensions` in `kubejs/config/trialforged_leveling.json` ausgeschlossen.

Auf ausdrücklichen Nutzerwunsch gibt es keine neue Altbestand-Bereinigung: Das Pack ist noch nicht live. Bereits gespeicherte Gegnerlevel werden nicht zurückgesetzt. Die vorhandene Bossbereinigung bleibt erhalten. Die Änderung gilt für neu erzeugte Mobs; zum Aktivieren neu starten. Für externe Server zusätzlich das neue Dimensionsprofil unter `kubejs/data` übernehmen.

Der isolierte, stumme Clientlauf vom 06.10.2026 bestand: Zombie, Skelett und Creeper in Elsebase bei ungefähr X/Z=8.192 behielten Basislevel 1 ohne Dynamic-Difficulty-Attributboni. Die native Gegenprobe mit den alten globalen Einstellungen ergab an diesen Koordinaten einen Basislevel über 100. Die Ergebnisdatei `local/runtime-validation/runtime-result.json` enthält `elsebase: "passed"`; das Log enthält `ELSEBASE_TESTS_COMPLETE`. Die Mod erwartet `attribute_modifiers` als JSON-Liste (`[]` für keine Boni), obwohl der dekodierte Java-Wert eine Map ist. Ein eigener dedizierter Mehrspieler-Test wurde nicht durchgeführt.

## Basislevel pro Dimension

Dynamic Difficulty unterstützt native JSON-Einstellungen je Dimension. Der globale Startlevel steht in `config/dynamic_difficulty/sync.toml`; einzelne Dimensionen überschreiben ihn über `starting_level` in `kubejs/data/<namespace>/leveling_settings/dimensions/<name>.json`. Dafür ist kein eigener Laufzeit-Hook erforderlich.

Seit dem 06.10.2026 verwendet `minecraft:the_nether` den Basislevel **30**, `minecraft:the_end` den Basislevel **80**. Die Dateien stehen unter `kubejs/data/minecraft/leveling_settings/dimensions/the_nether.json` und `the_end.json`. Sie übernehmen die übrigen Werte der installierten Standardprofile: Obergrenze 50 im Nether, Obergrenze 100 und Zufallsbonus 0–5 im End. Ein Override ersetzt die gleichnamige Standarddatei vollständig; deshalb sind diese bisherigen Werte ausdrücklich enthalten. Weitere nicht angegebene Einstellungen kommen weiterhin aus der globalen Konfiguration.

Der Basislevel ist ein Ausgangswert, kein fixer Endlevel: Distanz, Tiefe sowie vorhandene Entity-, Biom- und Strukturregeln können das berechnete Ergebnis beeinflussen. Native Regeln können Boni ausdrücklich an der Obergrenze vorbeiführen. Boss-Ausschlüsse und das Elsebase-Profil bleiben erhalten. Bereits gespeicherte Mobs werden nicht auf die neuen Werte umgestellt; zum Aktivieren für neue Spawns neu starten. Für einen externen Server beide JSON-Dateien mit übernehmen.

Der isolierte, stumme Clientlauf vom 06.10.2026 bestand: Die nativen Einstellungen und die Basisrechnung bestätigten 30/80 sowie die erhaltenen Obergrenzen und Zufallsboni. Frische Testzombies erhielten Level 30 im Nether und Level 84 im End; im End kam der bestehende Zufallsbonus hinzu. Die Ergebnisdatei enthält `dimensionBases: "passed"`, das Log `DIMENSION_BASES_TESTS_COMPLETE`. Auch Elsebase, Spielerlogin, JEI und die vorhandenen Kampf-/Fortschrittsprüfungen bestanden. Ein eigener dedizierter Mehrspieler-Test wurde nicht durchgeführt.

## Bonuschance und Itemmenge

Die Chance je regulärem Entity-Loot-Wurf beträgt `min(1, Mob-Level / chanceDivisor)`. `chanceDivisor` steht in `kubejs/config/trialforged_leveling.json` und ist zunächst `1000`.

| Mob-Level | Bonuschance |
|---:|---:|
| 1 | 0,1 % |
| 10 | 1 % |
| 100 | 10 % |
| 500 | 50 % |
| ab 1.000 | 100 % |

Ein erfolgreicher Wurf wählt gleichverteilt eine der freigegebenen Kistentabellen, erzeugt deren Loot und wählt gleichverteilt einen nicht leeren erzeugten Itemstack. Das ausgewählte Item wird kopiert und seine Menge auf genau **ein Exemplar** gesetzt. Komponenten wie Affixe, Verzauberungen und Trankdaten bleiben erhalten. Große Quellstacks erhöhen die übernommene Menge nicht. Das Mob-Level erhöht ausschließlich die Chance, nicht die Qualität oder die Auswahl der Quellen.

Die Erzeugung verwendet einen eigenen Chest-Kontext mit Mobposition, Luck und, sofern vorhanden, dem zugeordneten Spieler. Die gewählte Originaltabelle läuft durch ihre gewöhnlichen Global Loot Modifiers. Damit können die bereits installierten Loot Integrations und Apotheosis-Regeln für diese Kiste berücksichtigt werden; es wird keine eingefrorene Itemliste kopiert. Nach der Auswahl hängt das einzelne Item am normalen Entity-Lootpfad und kann dessen nachgelagerte Modifikatoren durchlaufen.

Der Bonus gilt für tatsächlich gelevelte, weiterhin zur Skalierung zugelassene Lebewesen. Ausgeschlossene Bosse, ungelevelte Gegner und verschachtelte Entity-Hilfstabellen erhalten ihn nicht. Es wird kein zusätzlicher Spielerkill-Zwang eingeführt. Eine registrierte Entity-Loot-Tabelle ist erforderlich.

Dynamic Difficultys eigene Level-up-Trank-/Kristalldrops sind über `enableLevelBasedDrops = false` abgeschaltet, damit sie nicht parallel zu dieser Beute laufen.

## Freigegebene generische Kisten

Die vollständige bearbeitbare Quellenliste steht unter `lootSources` in der gemeinsamen JSON-Konfiguration. Jede der zwölf Quellen hat dasselbe Auswahlgewicht.

| Herkunft | Quellen |
|---|---|
| Vanilla | `simple_dungeon`, `abandoned_mineshaft`, `stronghold_corridor` |
| Dungeon Crawl | `stage_1`, `stage_3`, `stage_5` |
| Dungeons and Taverns (`nova_structures`) | `dungeon_2`, `dungeon_4`, `dungeon_6` |
| When Dungeons Arise | `bandit_towers_normal`, `illager_fort_normal`, `foundry_normal` |

Verwendet werden gewöhnliche Dungeon-/Strukturkisten. Bossbelohnungen, Trial-/Ominous-Vaults, Questbelohnungen und Eventtabellen wurden nicht aufgenommen. Die zwölf Quellen und ihre 16 zusammenhängenden Loot-Tabellen wurden gegen die installierten Ressourcen geprüft. Änderungen anderer Mods an generischen Tabellen wirken künftig mit; deren gesamte Itembalance ist damit nicht automatisch freigegeben.

Fehlende Tabellen, falsche Loottypen und ungültige Einstellungen verursachen beim Skriptladen beziehungsweise Reload einen protokollierten Fehler. Falls eine Quelle zur Laufzeit unerwartet keine Items liefert oder ein Bonuswurf technisch fehlschlägt, wird dies mit Quellen-/Tabellenkontext protokolliert. Der fehlerhafte Bonus entfällt; bereits erzeugter normaler Mob-Loot bleibt erhalten. Es gibt keinen stillen Ersatzdrop oder unbeschränkte Wiederholungsversuche.

## Looting und Scavenger

Apothic Enchantings `apothic_enchanting:scavenger` verwendet `extra_loot_roll`. Die installierte Version ruft bei Erfolg die reguläre Mob-Loot-Erzeugung nochmals auf. Deshalb ist der Bonus über LootJS `lootTables`/`onDrop` an die Haupttabelle gebunden. Jeder zusätzliche Scavenger-Wurf enthält einen neuen unabhängigen Bonusversuch. Es gibt keinen selbst programmierten zweiten Scavenger-Multiplikator.

Looting erhöht einen beliebigen neuen Drop nicht automatisch. Es erhöht Mengen nur über ausdrücklich eingebundene Looting-Funktionen oder andere zuständige Modifikatoren. Diese Integration fügt keinen eigenen Looting-Mengenbonus hinzu: Sie liefert genau ein Basisitem pro erfolgreichem Bonuswurf. Nachgelagerte Modifikatoren und Scavenger können das endgültige Ergebnis weiterhin verändern.

## Aktivierung und Prüfung

Instanz beziehungsweise dedizierten Server vollständig neu starten, damit die native Dynamic-Konfiguration geladen wird. Für externe Server `config/dynamic_difficulty/sync.toml`, `kubejs/config/trialforged_leveling.json`, das Integrationsskript und das korrigierte Vanilla-Bossskript übernehmen. Spätere Änderungen nur am Lootdivisor oder an den Quellen können per `/reload` geladen werden; Bosslisten müssen in beiden Dateien übereinstimmen und brauchen einen Neustart.

```powershell
node tests/check-pack-scripts.cjs
./tests/check-leveling-assets.ps1
$rhinoJar = (Get-ChildItem mods -Filter 'rhino-*.jar').FullName
& 'C:\Program Files\Java\jdk-21\bin\java.exe' '-Dtrialforged.test.entry=runLevelLootTests' --class-path $rhinoJar tests/RhinoProgressionCheck.java tests/level-loot.spec.js kubejs/server_scripts/dynamic_difficulty_integration.js
```

Die Tests führen die Produktionshandler mit Schnittstellenfakes aus und prüfen Chancegrenzen, Mengenbegrenzung, Komponenten, Quellenauflösung, Fehlerfälle, verschachtelte Tabellen, wiederholte Lootwürfe sowie Bossbereinigung. APIs, Modifikatorzustand, Scavenger-Pfad und Chest-Kontext wurden anhand der installierten JARs geprüft. Das ersetzt keinen Minecraft-Laufzeit- oder dedizierten Mehrspielertest.

Seit der KubeJS-Schnittstellenkorrektur vom 02.10.2026 entfernt die Bossbereinigung den alten nativen `LEVEL`-Marker über `getForgePersistentData()`. KubeJS benennt den Java-Getter um; `getPersistentData()` bezeichnet in Skripten den separaten KubeJS-Speicher. Die Tests unterscheiden beide Bereiche und bestätigen, dass eigene KubeJS-Daten erhalten bleiben. Alle 28 Integrationsprüfungen bestehen in Node und der installierten Rhino-Version.

Die Loot-Registrierung verwendet `modifyLootTables(LootType.ENTITY)` und damit tatsächlich vorhandene Tabellen. `modifyEntityTables(/.*/)` iteriert in LootJS 3.7.0 dagegen alle Entitätstypen und löst deren Standardtabelle auf; bei `minecraft:area_effect_cloud` existiert diese nicht. Das führte beim ersten Ressourcenladen zu `Unknown loot table: minecraft:entities/area_effect_cloud`. Die Auswahl existierender Tabellen erhält die beabsichtigte Bonusintegration, ohne fehlende Tabellen zu erfinden oder Fehler zu unterdrücken.

Im [echten Clienttest](runtime-validation.md) wurden alle zwölf Quellen registriert und ein gelevelter Level-1.000-Zombie über den nativen Schadens-/Todespfad getötet. Dabei trat kein Integrationsfehler auf. Eine statistische Prüfung der Beutemengen und Komponenten ist damit noch nicht abgedeckt.

Über diesen Lauf hinaus im Spiel noch zu prüfen:

1. `logs/kubejs/server.log` enthält die Meldung über zwölf Quellen und keine Integrationsfehler.
2. Neue und bereits gespeicherte Bosse behalten ihre vorgesehenen Werte, beschädigte Bosse ihre Gesundheitsfraktion, auch nach erneutem Chunkladen und Serverneustart.
3. Gewöhnliche Level-1/100/500/1.000-Gegner zeigen über genügend Kills die vorgesehenen Chancen; ohne Mengenmodifikatoren erscheint pro erfolgreichem Wurf ein einzelnes Basisitem.
4. Luck, unterschiedliche Spielertiers, Loot Integrations und Apotheosis erzeugen passende Itemkomponenten ohne doppelte Bonusvergabe.
5. Scavenger würfelt auch den Bonus erneut; Looting-/Mengenmodifikatoren verändern nur die tatsächlich dafür vorgesehenen Drops.
