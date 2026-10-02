# Behaviour

- Nutzerkommunikation und Projektdokumentation auf Deutsch; Code und technische Bezeichner auf Englisch.
- Mod-JARs, interne Metadaten, Konfigurationen und lokale Skripte prüfen. Launcherlisten allein sind kein Beleg für installierte oder erfolgreich geladene Mods.
- Der Nutzer kann während einer Analyse Mods installieren oder entfernen. Vor Empfehlungen den aktuellen Bestand erneut prüfen und Inventare als zeitgebundene Snapshots behandeln.
- Cisco dient als Inspiration. Keine Cisco-spezifischen Assets, Questtexte, Skripte oder Content-Mods ohne ausdrücklichen Auftrag und geklärte Nutzungsgrundlage übernehmen.
- Weltstände und fremde Änderungen erhalten. Eine Bestandsanalyse autorisiert keine Modinstallation oder Balanceänderung.
- Mods und Bibliotheken nicht eigenständig installieren, aktualisieren oder entfernen. Fehlende Abhängigkeiten und Alternativen zuerst benennen; der Nutzer entscheidet über die Aufnahme ins Pack, auch bei Crashbehebungen.
- Spellbooks Of Twilight ist vom Nutzer als unerwünschter Bestandteil ausgeschlossen worden. Keine Abhängigkeiten installieren, um diesen Mod im Pack zu halten.
- Apotheosis 8 besitzt bereits World Tiers. Zusätzliche Gegner-Skalierung und Lootprogression müssen mit diesen abgestimmt werden.
- Multiplayer ist eine zwingende Anforderung. Apotheosis 8.9.0 verwendet beim Spawn den nächstgelegenen Spieler als Tier-Kontext; manche Lootwürfe verwenden den beteiligten Spieler. Automatische Spielertiers allein garantieren keine ortsfeste Gegner-/Beuteprogression. Gebietsschwierigkeit, Gruppen verschiedener Stufen und serverseitige Persistenz gemeinsam planen und testen.
- Persönliche Apotheosis-Tiers steigen automatisch und dauerhaft: Haven ab Einstieg, normales Witherskelett → Frontier, Wither → Ascent, Ender Dragon → Summit, Warden → Pinnacle. Keine zusätzliche Prüfung oder Spielerbestätigung; höhere Meilensteine dürfen frühere Stufen überspringen. Bestehenden Fortschritt erhalten.
- Keine Gegner-/Boss-Skalierung anhand der Spielerzahl. Gemeinsames Spielen soll helfen und die Gruppe nicht durch stärkere Gegner benachteiligen. Wither, Drache und Warden verwenden feste Infernal-Profile und feste Apotheosis-Gegnertiers; nicht an nahe höherstufige Spieler koppeln.

# Project Overview

Trialforged ist eine lokale Minecraft-1.21.1-Instanz mit NeoForge. Ziel ist ein eigenständiges Adventure-RPG-Modpack mit Charakterentwicklung, Erkundung, Bossen und langfristiger Ausrüstungsprogression. Die lokal angepasste Forge-1.19.2-Instanz `Ciscos Modified` ist die Referenz für das gewünschte Spielgefühl.

# Documentation Index

- [Dynamic Difficulty](docs/dynamic-difficulty.md): Boss-Blacklist, Bereinigung gespeicherter Levelboni, Bonuschance Level/1000, generische Kistenquellen und Scavenger-Integration.
- [Vanilla-Bossprofile](docs/vanilla-boss-profiles.md): feste HP, Infernal-Effekte und Angriffswerte ohne Spielerzahls-Skalierung; Konfliktbereinigung, Speicherverhalten und Prüfbefehl `node tests/check-pack-scripts.cjs`.
- [Apotheosis-Progression](docs/apotheosis-progression.md): persönliche Meilensteine, Multiplayer-Beteiligung, Persistenz, Einrichtung und Stand der Prüfung.
- [Startabbruch vom 02.10.2026](docs/startup-crash-2026-10-02.md): fehlende AzureLib für Spellbooks Of Twilight, FTB-Quests-Folgefehler und ausstehender Starttest.
- [Modvergleich](docs/mod-comparison-2026-10-02.txt): vollständige JAR-Listen und Gemeinsamkeiten/Unterschiede als Snapshot vom 02.10.2026.
- [Strukturiertes Inventar](docs/mod-inventory-2026-10-02.json): Dateinamen, Mod-IDs, deklarierte Versionen, Projektlinks und Vergleichsdaten. Eingebettete Bibliotheken und weltlokale Datapacks sind nicht vollständig erfasst.

# Glossary

- Cisco: die lokale Referenzinstanz `C:\Games\Minecraft\Instances\Ciscos Modified`, nicht automatisch der unveränderte veröffentlichte Modpackstand.
- Mob-Level: die Gegnerstufe; getrennt von Spielerentwicklung und Apotheosis World Tiers betrachten.
- World Tier: Apotheosis-Fortschrittsstufe pro Spieler, die unter anderem Schwierigkeit und Ausrüstungsbelohnungen beeinflusst.
- Levelbeute: eine eigenständige Integration, die Mob-Stärke mit Bonuschance und Belohnungsqualität verbindet.
