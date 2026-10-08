# Trialforged-Skillbaum und Skillpunkte

Quelle: `tools/skill-plan/plan.json`, übernommen aus dem Nutzerexport vom 08.10.2026. Der erste Ausbau besitzt 42 gemeinsame Definitionen, 90 einzeln kaufbare Knoten und 96 beidseitige Verbindungen. Namen, Spielertexte, Kosten, Attributwerte und Knoten-IDs entsprechen dem Export. Pufferfish's Skills 0.19.1 und Attributes 0.8.3 verwalten Freischaltungen, Punkte und Boni nativ.

## Verwendung im Spiel

Der Baum „Trialforged“ steht im Pufferfish-Skillmenü bereit. Neue Spieler haben null Punkte. Ein `kubejs:skill_point` („Skill Point“) wird beim Benutzen verbraucht und gibt seinem Benutzer genau einen Punkt. Das Item eignet sich auch als spätere Questbelohnung. Bereits ausgegebene und nicht ausgegebene Punkte bleiben in Pufferfishs Spielerpersistenz; Tod löscht den Baum nicht.

Nach einem vollständigen Minecraft-Neustart lässt sich das Menü mit der derzeit gebundenen Taste **K** öffnen. Zum gezielten Testen können Administratoren mit `/give @s kubejs:skill_point 10` zehn Punkt-Items vergeben.

Ein Starter kostet wie alle übrigen Knoten einen Punkt. Der erste Einstieg schränkt die unmittelbar verfügbaren Starter ein; weitere Starter bleiben über investierte Verbindungspfade erreichbar. Mehrere gleichnamige Instanzen geben ihren Bonus jeweils erneut. Die native Attributbelohnung erzeugt dafür separate Modifier; Gesamtprozente multiplizieren sich pro Instanz.

Der Mod zeigt vorhandene Spielerbeschreibungen zusammen mit den umgesetzten Boni. Technische Implementationsaufträge und Prüfkriterien werden nicht als Spielertexte übernommen. Icons stammen aus den angegebenen Items. Das Hexlayout wird in native ganzzahlige x/y-Koordinaten übertragen. Die Editorfarben besitzen keine eigene Spielmechanik; native Rahmen zeigen den Freischaltzustand.

## Sondermechaniken

- **Regeneration:** je Knoten +10 % auf die nativen Manaregeneration-Attribute von Ars Nouveau und Iron's Spellbooks. Drei Knoten ergeben Faktor 1,331. Es gibt keine zusätzliche Manapersistenz und keine künstliche gemeinsame Manareserve.
- **Magieschaden:** native Pufferfish-Boni. Ars und Iron's wurden bereits in der [Magieintegration](magic-attribute-unification.md) geprüft; andere Mods profitieren, wenn ihre Treffer nativ als Magie erkannt werden und einen lebenden Verursacher besitzen. Keine aufwendigen zusätzlichen Trefferumleitungen.
- **Needful Taste:** native Tag-Belohnung aktiviert die serverseitige Verbrauchsprüfung. Unmittelbar vor dem letzten Verbrauchstick werden vorhandene schädliche Effekte gesichert. Nach dem Itemverbrauch hat jeder neu hinzugekommene oder verstärkte schädliche Effekt eine unabhängige 50-%-Chance, entfernt beziehungsweise auf den vorherigen Zustand zurückgesetzt zu werden. Positive Effekte bleiben erhalten. Bereits vorhandene, unveränderte negative Effekte werden nicht entfernt. Abbrechen, Ausloggen und Abschluss verwerfen die kurzlebige Prüfsicherung. Entfernen/Zurücksetzen des Skills entfernt den nativen Tag.

Needful Taste verwendet die native Klassifikation `MobEffectCategory.HARMFUL`. Direkter Schaden eines Items ist kein anhaltender Debuff und wird nicht rückwirkend geheilt. Effekte, die eine Mod erst zeitversetzt nach dem abgeschlossenen Itemverbrauch auslöst, gehören nicht zum synchronen Verbrauchspfad. Allgemeine Zaubereffekte ohne Itemverbrauch werden nicht gefiltert. Es gibt keinen allgemeinen Effekt-Immunitätshandler und keinen Eingriff in die Schadensberechnung.

## Dungeon-Loot

`kubejs/server_scripts/skill_point_loot.js` ergänzt einen unabhängigen 1-%-Wurf auf **ein** Punkt-Item pro Abfrage einer der zwölf generischen Dungeon-Tabellen aus `kubejs/config/trialforged_leveling.json`, Feld `lootSources`. Diese bestehende Liste ist zugleich die Quelle der levelabhängigen Mob-Bonusbeute. Dazu gehören Vanilla-Dungeons, Minenschächte und Stronghold-Korridore sowie ausgewählte Tabellen von Dungeon Crawl, Nova Structures und When Dungeons Arise. Dorf-, Boss-, Vault- und sonstige Spezialtabellen werden nicht pauschal einbezogen. Vorhandene Beute bleibt erhalten; Glück erhöht den unabhängigen Wurf nicht.

Mobkills erhalten **keinen zusätzlichen direkten Skillpunktwurf**. Der bestehende Mobpfad würfelt abhängig vom Moblevel Dungeon-Beute und wählt daraus ein einzelnes Item. Ein dabei erzeugtes Punkt-Item kann ausgewählt werden; seine endgültige Häufigkeit pro Mobkill liegt wegen der vorgelagerten Chance und der Itemauswahl unter 1 %. Loot Integrations kann generierte Dungeon-Beute zusätzlich verteilen oder kürzen. Die 1 % beschreiben den Bonuswurf auf die jeweilige Dungeon-Tabelle, keine garantierte Endhäufigkeit in sämtlichen Strukturkisten.

Quests und weitere Meilensteinmengen werden später definiert. Es werden keine automatischen Start-, Login- oder XP-Punkte vergeben und keine noch unbekannten Meilensteine erfunden.

## Weitere Entwürfe übernehmen

Im Instanzverzeichnis:

```powershell
node tools/skill-plan/build.cjs 'C:/Users/Two/Downloads/Trialforged---Skillplan.skillplan.json'
```

Der Konverter prüft die Quelle, legt sie versioniert unter `tools/skill-plan/plan.json` ab und erzeugt Daten unter `kubejs/data/<namespace>/puffish_skills`. Zusätzliche native Attributskills und Verbindungen benötigen keine einzelnen Handänderungen. Bestehende Knoten-IDs und die Kategorie `trialforged:skills` erhalten. Umbenennen einer Definition ändert ihre Spielerfreischaltungen nicht; Löschen und neu Erstellen eines Knotens erzeugt eine neue Identität.

Neue oder geänderte technische Freitextmechaniken brauchen einen geprüften Adapter. Der Konverter bricht ausdrücklich ab, statt technische Wünsche stillschweigend ohne Wirkung zu exportieren. Geänderte Kategorienamen, entfernte ganze Bäume und Modattributwechsel vor Übernahme prüfen. Bestehende Daten anderer Namespaces werden nicht gelöscht.

Mit `node tools/skill-plan/build.cjs --check` lassen sich Quelle und generierte Dateien vergleichen. Nach Änderungen an Punkt-Item oder Serverhandlern Minecraft vollständig neu starten. Für eine neue Baumversion native Belohnungen, Zurücksetzen und vorhandene Freischaltungen erneut prüfen; keine pauschale Bereinigung von Spielerständen.

## Prüfung

`node --test tests/skill-plan-build.spec.cjs` prüft den produktiven Konverter: stabile IDs, gemeinsame Definitionen, null Startpunkte, Rundung, Verbindungen, native Sonderboni, zukünftige Erweiterung und ausdrückliche Ablehnung unbekannter Sondermechaniken.

Der [isolierte Laufzeittest](runtime-validation.md) lädt Produktionsdaten und `tests/runtime-skills-probe.js`. Er prüft echte Punkt-Item-Ereignisse, unabhängige Spieleridentitäten, native Belohnungen und Zurücksetzen, Ars-/Iron's-Regeneration, gemischte Tränke, tatsächlichen mehrtickigen Nahrungsverbrauch, 20.000 native Dungeon-Bonuswürfe sowie Persistenz nach einem zweiten vollständigen Clientstart. Ergebnisse: `local/runtime-validation/runtime-skills-result.json` und `logs/latest.log`.

Abnahme vom 08.10.2026 bestanden: 2.548 native Prüfschritte; 206 Punkt-Items bei 20.000 Dungeon-Würfen; bei je 2.000 gemischten Tränken 1.023 abgewehrte Gift- und 1.003 abgewehrte Langsamkeitseffekte, stets erhaltene positive Effekte. Der Kauf eines vollständigen Verbindungspfads erlaubt den zweiten Starter. Vorherige Effekte einschließlich versteckter schwächerer Effekte bleiben bei Abwehr eines stärkeren Effekts erhalten. Gespeicherte Skillpunkte und Warrior-Freischaltung wurden nach vollständigem Neustart bestätigt (`restartVerified: true`). Das native Skillmenü wurde 200 Clientticks dargestellt (`runtime-skills-client-result.json`). Der gesamte Runner einschließlich Login, JEI, Bossen, Apotheosis, Magie- und Ars-Lootprüfungen bestand ohne neue Skriptfehler oder Verbindungsabbruch.

Die Massenprüfungen von Pfadkäufen, Zurücksetzen, Belohnungen und Tränken verwenden einen nativen NeoForge-FakePlayer im tatsächlichen Server. Ein verbundener Spieler prüft Punkt-Item, regulären Nahrungsverbrauch, reversible Schutzbelohnung, Persistenz und Menü. Zwei gleichzeitig verbundene Netzwerkspieler und sämtliche Mod-Nahrungsmittel sind separate Prüfgrenzen.

### Bekannte Grenze der installierten Modversion

Pufferfish Skills 0.19.1 serialisiert `ShowCategoryOutPacket` auf dem Netty-Thread aus dem noch veränderlichen `CategoryData`. Sofortiges Zurücksetzen und massenhaftes erzwungenes Freischalten per API können während dieses Lesens dessen Skillmenge ändern. Der Belastungstest löste dadurch eine `ConcurrentModificationException` in `CategoryData.getSkillState` und einen Verbindungsabbruch aus. Reguläre Skilländerungen versenden einfache `SkillUpdateOutPacket`-Werte; der abschließende verbundene Clientlauf bestand.

Destruktive Massenprüfungen laufen deshalb auf einer Server-Testidentität, deren nativer FakePlayer-Netzwerkhandler Pakete verwirft. Für spätere Admin-/Questskripte keine unmittelbar verketteten Kategorie-Resets und erzwungenen Massenfreischaltungen am verbundenen Spieler einführen. Der Modfehler wurde nicht durch einen Eingriff in die Mod-JAR oder das Netzwerk umgangen; seine generelle Behebung bleibt außerhalb dieser Umsetzung.
