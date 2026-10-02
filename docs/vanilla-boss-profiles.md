# Feste Vanilla-Bossprofile

Wither, Ender Dragon und Warden sind die drei höheren persönlichen Apotheosis-Meilensteine. Sie bekommen feste Infernal-Mobs-Profile und eine Schwierigkeit passend zum Tier vor ihrem jeweiligen Sieg.

| Boss | Echte maximale HP | Infernal-Effekte | Fester Apotheosis-Gegnertier | Verstärkte Angriffe |
|---|---:|---|---|---|
| Wither | 600 | Bulwark, Fiery | Frontier | Witherschädel und zugeordnete Explosionen: +20 % |
| Ender Dragon | 1.000 | Bulwark | Ascent | Kontaktangriffe vom Schadenstyp `mob`: +25 % |
| Warden | 1.024 | Bulwark, Gravity | Summit | Nahkampf: +15 %; Sonic Boom: +20 % |

Die Werte sind unabhängig von Spielerzahl, Entfernung zum Weltspawn und Tier benachbarter Spieler. Gemeinsames Spielen verursacht keine zusätzlichen HP, Schadensboni oder nachträgliche Anpassung der Bossstärke. Gewöhnliche Gegner und Witherskelette behalten ihre bisherigen Regeln.

Bulwark halbiert größere eingehende Treffer; seine native Untergrenze beträgt einen Schadenspunkt. Fiery setzt Angreifer beziehungsweise geeignete direkt getroffene Ziele in Brand. Gravity zieht ein geeignetes nahes Ziel zum Gegner. Die Boss-KI und ihre ursprünglichen Phasen bleiben bestehen. Atem-/Flächenschaden des Drachen wird nicht durch den zusätzlichen Kontaktbonus verstärkt.

## Abweichungen vom ersten Entwurf

- Storm benötigt nach der installierten Infernal-Mobs-Implementierung sichtbaren Himmel. Das normale End hat kein Himmelslicht; dort ist der Effekt als verlässliche Bossmechanik ungeeignet. Der Drache bekommt deshalb ausschließlich Bulwark.
- Die installierte Definition von `minecraft:generic.max_health` hat eine Obergrenze von 1.024. Der vorläufige Warden-Wert von 1.500 wäre ohne weitere Änderungen keine echte maximale Gesundheit. Das Profil verwendet deshalb 1.024 echte HP und hält den Infernal-Cache und die Anzeige dazu passend. Die Attributobergrenze wurde nicht global verändert.

Diese Werte sind eine erste Balanceeinstellung. Ihre tatsächliche Schwierigkeit mit den vorhandenen Nahkampf-, Fernkampf- und Magie-Builds ist noch im Spiel zu beurteilen.

## Umsetzung

`kubejs/server_scripts/vanilla_boss_profiles.js` registriert serverseitige native NeoForge-Ereignisse mit Priorität `LOWEST`:

1. Beim Betreten einer Welt/Dimension wird der Boss einen Tick später eingerichtet, nachdem die anderen Spawn-/Ladehandler gelaufen sind.
2. Alte Modifikatoren von Advanced Leveling (`autoleveling:level`) werden ohne Abhängigkeit von dessen entferntem JAR bereinigt. Die [Dynamic-Integration](dynamic-difficulty.md) entfernt zusätzlich gespeicherte Dynamic-Levelboni und Levelanhänge bei ausgeschlossenen Bossen. Die vorherige Gesundheitsfraktion bleibt erhalten.
3. Alle vorhandenen Apotheosis-World-Tier-Gegnerboni werden über deren öffentliche Schnittstelle entfernt. Anschließend werden die Boni des fest vorgegebenen Gegnertiers angewendet und Apotheosis' Ladekennzeichen `TIER_AUGMENTS_APPLIED` gesetzt. Damit bleibt auch ein ohne nahe Spieler eingerichteter Boss beim späteren Laden unabhängig von deren Tier. Das verändert keine Spielertiers.
4. Infernal Mobs erhält die feste Modifikatorkette über `addEntityModifiersByString`. Abweichende alte Ketten werden ersetzt; passende Ketten bleiben erhalten.
5. Echte maximale HP, das persistente `infernalMaxHealth` und Infernal Mobs' interner HP-Cache werden abgeglichen. Unerwartete zusätzliche HP-Modifikatoren verursachen einen sichtbaren Fehler statt falscher Erfolgs-/HP-Angaben.
6. Die Zusatzschäden werden im `LivingIncomingDamageEvent` vor der normalen Schadensminderung angewendet. Nur passende Schadenstypen und eindeutig dem Boss zugeordnete Quellen erhalten den Bonus. Kein Berserk-Effekt und keine zusätzliche Schadensdeckelung werden eingeführt.

`config/dynamic_difficulty/sync.toml` schließt `minecraft:wither`, `minecraft:ender_dragon` und `minecraft:warden` sowie weitere Packbosse aus der normalen Levelvergabe aus. Advanced Mob Leveling wurde vom Nutzer entfernt. `config/infernalmobs.cfg` deaktiviert ausschließlich die zufällige/erzwungene Infernal-Auswahl der drei Vanilla-Bosse anhand der Klassen `WitherBoss`, `EnderDragon` und `Warden`. Die gezielte Skriptzuweisung funktioniert über eine andere öffentliche Mod-Schnittstelle; Bulwark, Fiery und Gravity bleiben aktiviert. Die sonstigen Infernal-Einstellungen bleiben erhalten.

## Speicherung und bestehende Bosse

Die Einrichtung läuft auch für gespeicherte Bosse. Ihre vorherige HP-Fraktion bleibt erhalten: Ein Boss mit halber Gesundheit hat nach der Umstellung weiterhin halbe Gesundheit des neuen Profils. Das Laden oder wiederholte Betreten der Welt stellt keine verlorenen HP wieder her und multipliziert die Profile nicht erneut.

Ein frisch beschworener Wither bekommt während seiner unangreifbaren Aufladephase die vollen Profil-HP. Ein von Disk geladener Wither bekommt diese Sonderbehandlung nicht. Entfernte/tote Gegner und ein Drache in seiner Todesphase werden nicht verändert. Der persistente KubeJS-Marker `trialforged_boss_profile_version` kennzeichnet die erfolgte Einrichtung.

Die persönliche [Tierprogression](apotheosis-progression.md) bleibt bestehen. Die 5-%-Beteiligungsschwelle bezieht sich auf die neuen tatsächlichen maximalen HP; aufgezeichnet wird weiterhin tatsächlich verrechneter Schaden nach der Minderung. Bei exakt gleichen Schadensanteilen können auch 20 Spieler die bestehende Schwelle erreichen. Bloße Anwesenheit genügt weiterhin nicht.

Weltdateien wurden für die Einrichtung nicht direkt bearbeitet. Mods wurden nicht installiert, aktualisiert oder entfernt.

## Aktivierung und Prüfstand

Instanz beziehungsweise dedizierten Server vollständig neu starten. Bei einem externen Server müssen die beiden geänderten Konfigurationsdateien und das neue Serverskript in dessen Packstand übernommen werden.

Eine gemeinsame Prüfung der Packskripte ist im Instanzverzeichnis möglich:

```powershell
node tests/check-pack-scripts.cjs
```

Der Prüfbefehl führt die echten Produktionshandler mit nachgebildeten Minecraft-/Mod-Schnittstellen aus: 35 Bossprofil-Fälle, die vorhandenen 28 Progressionsfälle und vier kombinierte Fälle mit gemeinsamen Bossentitäten. Die Bossprofil- und Progressionsfälle wurden außerdem mit der installierten Rhino-Version geprüft:

```powershell
$rhinoJar = (Get-ChildItem mods -Filter 'rhino-*.jar' | Select-Object -First 1).FullName
& 'C:\Program Files\Java\jdk-21\bin\java.exe' '-Dtrialforged.test.entry=runBossProfileTests' --class-path $rhinoJar tests/RhinoProgressionCheck.java tests/vanilla-boss-profiles.spec.js kubejs/server_scripts/vanilla_boss_profiles.js
```

Die verwendeten APIs, Modifikatornamen, Eventtypen und das Aufräumen nativer Listener bei Skriptneuladungen wurden gegen die installierten JARs geprüft. Die Tests belegen die Skriptlogik; sie ersetzen keinen Minecraft-Laufzeit-, Balance- oder dedizierten Mehrspielertest.

Noch im Spiel zu bestätigen:

- Die drei Bosse zeigen die vorgesehenen HP und ausschließlich die festen Infernal-Modifikatoren.
- HP, Schäden und Apotheosis-Boni bleiben bei unterschiedlichen Orten und Spielergruppen gleich.
- Fiery und Gravity wirken mit der jeweiligen Boss-KI wie erwartet.
- Ein beschädigter Boss behält seine HP nach Chunk-Neuladen und vollständigem Serverneustart.
- Witherschädel, Explosionen, Drachenkontakt und Sonic Boom erhalten ihre vorgesehenen Boni; gewöhnliche Gegner und andere Schadenstypen bleiben unverändert.
- Beteiligte Spieler erhalten nach dem Sieg Ascent, Summit beziehungsweise Pinnacle; Logs enthalten keine Profil-/Progressionsfehler.
