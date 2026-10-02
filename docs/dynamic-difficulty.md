# Gebietsskalierung und Levelbeute

Stand: 02.10.2026, Dynamic Difficulty NeoForge 1.3.4 für Minecraft 1.21.1. Advanced Mob Leveling wurde vom Nutzer entfernt. Seine verbliebenen Konfigurationsdateien sind nicht mehr aktiv.

## Boss-Ausschlüsse

`config/dynamic_difficulty/sync.toml` enthält die native `blacklistedMobs`-Liste. Dieselben IDs stehen in `kubejs/config/trialforged_leveling.json`, damit die ergänzende Bereinigung und der Bonus-Loot dieselben Gegner ausschließen. `node tests/check-level-loot.cjs` prüft die Übereinstimmung.

Die Liste umfasst die vier Vanilla-Gegner Wither, Ender Dragon, Warden und Elder Guardian sowie die Boss-Tags der installierten Mods Aether, Ars Nouveau, Cataclysm, Iron's Spellbooks, Mowzie's Mobs und Twilight Forest. Ergänzend sind die vier Lord-Pumpkinhead-Phasen aus Born in Chaos und NeoVitaes Daemonium Doloris aufgenommen. Insgesamt sind es 36 Entity-IDs.

Eine Blacklist verhindert neue Skalierung, entfernt aber nach der installierten Dynamic-Implementierung keine bereits gespeicherten Attributmodifikatoren. Deshalb entfernt `kubejs/server_scripts/dynamic_difficulty_integration.js` beim serverseitigen Welt-/Chunkbeitritt ausgeschlossener Bosse die Dynamic-Modifikatoren und den alten Advanced-Modifikator `autoleveling:level`. Der gespeicherte Dynamic-Level-Anhang und der alte `LEVEL`-Marker werden ebenfalls entfernt. Andere Modifikatoren bleiben erhalten. Die vorherige Gesundheitsfraktion bleibt erhalten; beschädigte Bosse werden nicht geheilt. Weltdateien werden nicht direkt bearbeitet.

Die festen [Vanilla-Bossprofile](vanilla-boss-profiles.md) bleiben aktiv. Ihr bisheriger Klassenzugriff auf Advanced Leveling wurde durch die feste Resource-ID ersetzt, damit das Skript ohne den entfernten Mod lädt.

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

Im Spiel noch zu prüfen:

1. `logs/kubejs/server.log` enthält die Meldung über zwölf Quellen und keine Integrationsfehler.
2. Neue und bereits gespeicherte Bosse behalten ihre vorgesehenen Werte, beschädigte Bosse ihre Gesundheitsfraktion, auch nach erneutem Chunkladen und Serverneustart.
3. Gewöhnliche Level-1/100/500/1.000-Gegner zeigen über genügend Kills die vorgesehenen Chancen; ohne Mengenmodifikatoren erscheint pro erfolgreichem Wurf ein einzelnes Basisitem.
4. Luck, unterschiedliche Spielertiers, Loot Integrations und Apotheosis erzeugen passende Itemkomponenten ohne doppelte Bonusvergabe.
5. Scavenger würfelt auch den Bonus erneut; Looting-/Mengenmodifikatoren verändern nur die tatsächlich dafür vorgesehenen Drops.
