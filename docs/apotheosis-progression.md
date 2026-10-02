# Persönliche Apotheosis-Progression

Die World Tiers steigen automatisch und dauerhaft anhand persönlicher Kampferfolge. Der Spieler bestätigt den Aufstieg nicht und kann im Apotheosis-Menü keinen anderen Tier wählen.

| World Tier | Auslöser |
|---|---|
| Haven | Beim ersten Betreten der Welt sofort aktiv, inklusive abgeschlossener Apotheosis-Einführung |
| Frontier | Ein normales Witherskelett besiegt |
| Ascent | Wither besiegt |
| Summit | Ender Dragon besiegt |
| Pinnacle | Warden besiegt |

Ein höherer Meilenstein setzt unmittelbar mindestens dessen Tier. Ein Wither-Sieg kann deshalb auch einen Haven-Spieler direkt auf Ascent bringen. Frühere Meilensteine sind keine zusätzlichen Aufgaben. Schwächere Gegner, Tod, Respawn und erneutes Verbinden senken den erreichten Tier nicht.

Witherskelette behalten ihre bisherigen Werte. Wither, Ender Dragon und Warden verwenden die gesondert beschriebenen [festen Bossprofile](vanilla-boss-profiles.md). Weitere Balanceänderungen brauchen eine eigene Entscheidung.

## Multiplayer

Beim Witherskelett zählt der persönlich zugeordnete Kill. Projektiltreffer werden über den verursachenden Spieler zugeordnet. Bei einem indirekten Tod wird Minecrafts Kill-Zuordnung verwendet, falls sie einen echten Spieler liefert. Automatisierung über Fake Players verleiht keine persönlichen Tiers.

Bei Wither, Drache und Warden können mehrere Spieler gleichzeitig aufsteigen. Jeder Empfänger muss:

- mindestens 5 % der maximalen Boss-Lebenspunkte als tatsächlich verrechneten Schaden verursacht haben;
- innerhalb der letzten 1.200 Spielticks, normalerweise 60 Sekunden, Schaden verursacht haben;
- beim Sieg online und am Leben sein, in derselben Dimension und höchstens 128 Blöcke entfernt.

Der letzte Treffer bekommt keine Sonderbehandlung. Bloße Anwesenheit zählt nicht. Eine länger als 1.200 Ticks unterbrochene Beteiligung beginnt hinsichtlich des angerechneten Schadens neu. Unterbrechungen durch Serverstillstand verbrauchen keine Spielticks.

Schaden zählt, wenn die Damage Source einen echten Spieler als Verursacher ausweist. Nahkampf und spielerzugeordnete Projektile/Zauber verwenden dieselbe Regel. Die konkrete Zuordnung besonderer Mod-Angriffe muss im Spiel geprüft werden. Reine Heilung ohne eigenen Schaden verleiht derzeit keinen Fortschritt.

Die Verarbeitung wartet nach dem Todesereignis einen Tick, damit auch der tödliche Treffer berücksichtigt wird und abgebrochene Todesereignisse keinen Aufstieg auslösen. Die Todesanimation des Drachen wird gesondert erkannt.

Unterschiedliche Spielertiers können weiterhin nebeneinander existieren. Apotheosis bestimmt die Stärke gewöhnlicher neu gespawnter Gegner anhand des nächststehenden Spielers; diese Integration macht Gebiete nicht unabhängig davon gleich schwierig. Die drei profilierten Vanilla-Bosse verwenden dagegen feste Gegnertiers.

## Umsetzung und Bestandsschutz

- `kubejs/server_scripts/apotheosis_progression.js` verarbeitet Login, Respawn, Klonen, Kampfbeteiligung und Kills serverseitig.
- `config/apotheosis/apotheosis.cfg` deaktiviert `Enable Manual World Tier Changes`.
- `kubejs/data/apotheosis/advancement/progression/` ersetzt die fünf bisherigen Ausrüstungs-/Kill-Anforderungen durch serverseitig vergebene Meilensteine. Die Anzeigen beschreiben die neuen Regeln. Die Aufstiegsmeldung ist persönlich.

Der aktuelle Tier wird über Apotheosis' öffentliche `WorldTier.setTier`-Schnittstelle geändert. Damit übernimmt Apotheosis Spielerboni und Client-Synchronisierung. Sein Tier-Attachment ist serialisiert und wird beim Tod kopiert. Zusätzlich speichert das Skript den höchsten erreichten Tier im persistenten KubeJS-Spieler-NBT unter `trialforged_highest_apotheosis_tier`; dieser Wert wird beim Klonen übernommen und beim Login/Respawn wiederhergestellt. Ungültige gespeicherte Werte erzeugen einen sichtbaren Skriptfehler und werden nicht stillschweigend ersetzt.

Bereits bestehende Apotheosis-Tiers werden beim ersten Login erhalten. Historische Kills werden nicht rückwirkend ausgewertet. Weltdateien wurden bei der Einrichtung nicht bearbeitet. Die Original-Ausrüstungsbedingungen verleihen künftig keine höheren Tiers mehr.

Die Unumkehrbarkeit gilt für normale Spieler. Administratoren können NBT, Skripte und Fortschritt weiterhin gezielt bearbeiten; ein per Befehl gesenkter Tier wird beim nächsten Login/Respawn vom gespeicherten Höchststand wiederhergestellt.

## Aktivierung und Prüfung

Die Instanz beziehungsweise den dedizierten Server vollständig neu starten, damit die Apotheosis-Konfiguration neu eingelesen wird. Für einen externen Server die geänderte Konfiguration und die KubeJS-Skript-/Datendateien in dessen Packstand übernehmen.

Die automatisierte Prüfung lässt sich im Instanzverzeichnis ausführen:

```powershell
node tests/check-apotheosis-progression.cjs
```

Sie führt das Produktionsskript mit nachgebildeten Minecraft-/Apotheosis-Schnittstellen aus und prüft 28 Verhaltensfälle, alle fünf Advancement-Dateien und die abgeschaltete manuelle Auswahl. Dieselben 28 Fälle wurden zusätzlich mit der tatsächlich installierten Rhino-Version `2101.2.7-build.85` ausgeführt:

```powershell
$rhinoJar = (Get-ChildItem mods -Filter 'rhino-*.jar' | Select-Object -First 1).FullName
& 'C:\Program Files\Java\jdk-21\bin\java.exe' --class-path $rhinoJar tests/RhinoProgressionCheck.java tests/apotheosis-progression.spec.js kubejs/server_scripts/apotheosis_progression.js
```

Die benötigten Event- und API-Namen sowie Apotheosis' Speicherung, Todeskopie und Tier-Aktualisierung wurden gegen die installierten JARs geprüft. Das ist noch kein vollständiger Minecraft-Laufzeit- oder dedizierter Mehrspielertest.

Im Spiel noch zu bestätigen:

1. Neuer Spieler startet mit aktivem Haven, identifizierten Affix-Gegenständen und gesperrter manueller Tierwahl.
2. Die vier Gegner setzen die vereinbarten Tiers; bereits höhere Stufen bleiben erhalten.
3. Zwei qualifizierte Teilnehmer steigen beim gemeinsamen Bosskill auf; ein Zuschauer und ein einzelner Alibi-Treffer tun das nicht.
4. Nahkampf, Pfeile und verwendete Mod-Zauber liefern dieselbe persönliche Zuordnung.
5. Tod/Respawn, erneutes Verbinden und vollständiger Serverneustart erhalten den Tier und dessen Boni ohne doppelte Anwendung.
6. In `logs/kubejs/server.log` beziehungsweise den Serverlogs stehen keine Fehler zu `apotheosis_progression.js` oder Advancement-Dateien.
