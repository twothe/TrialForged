# Majrusz Accessories: Rechtsklick-Ernte

## Stand und genaue Binärversion

Prüfung vom 06.10.2026 mit dem aktuellen Modbestand von Trialforged:

- `majruszs-accessories-neoforge-1.21.1-1.0.3.jar`, 715.711 Bytes.
- SHA-256: `7253C8550F3DA6FEF582873922764B95B2627194BC48D7EA7F768A3C73FAD99C`.
- Right Click Harvest: `rightclickharvest-neoforge-4.6.1+1.21.1.jar`.
- NeoForge 21.1.252; LootJS 3.7.0 ebenfalls geladen.

Die Majrusz-JAR enthält keine Java-Sources und keinen Source-Commit. Ihre Metadaten verweisen auf das ursprüngliche Majrusz-Projekt. Ein öffentliches Repository des Continued-Ports konnte nicht gefunden werden. Der ursprüngliche 1.20.X-Quelltext ist deshalb kein Versionsbeleg für diesen Port. Die relevante Implementierung wurde unmittelbar mit `javap -p -c` beziehungsweise `-v` aus der installierten JAR gelesen. Die Testkopie hat denselben SHA-256-Hash.

Bytecode-Ausgaben liegen unter `local/accessories-validation/installed-majrusz-bytecode.txt` und `installed-rch-bytecode.txt`.

## Tatsächlicher Auslöser

`TamedPotatoBeetle.HarvestingDropChance` registriert sich über die innere Hilfsklasse `HarvestingDoubleCrops.OnCropHarvested` am Ereignis `OnLootGenerated`. Das ähnlich benannte eigenständige Library-Ereignis `lib.events.OnCropHarvested` ist nicht der Auslöser dieses Drops.

Die Filter verlangen einen logischen Server, eine Lootposition, einen reifen Pflanzenzustand und eine lebende Entität im Lootkontext. Die aktuelle Config setzt die Basischance auf 0,0025. Für den Block `minecraft:potatoes` multipliziert die Implementierung mit 2,0: **0,5 % pro geeigneter Pflanzen-Lootberechnung**. Anschließend läuft das native `OnAccessoryDropChanceGet`-Ereignis, das Chancenboni berücksichtigen kann. Bei Erfolg fügt Majrusz den Käfer mit zufälliger Effizienz zur erzeugten Beute hinzu.

Der NeoForge-Mixin hängt am Listen-Ergebnis von `LootTable.getRandomItems(LootContext)`. Right Click Harvest übergibt Spieler und Werkzeug an `Block.getDrops(...)`, bevor es eine Kartoffel zum Wiederanpflanzen abzieht und den Pflanzenzustand auf Alter 0 zurücksetzt.

## Native Laufzeitprüfung

Die separate Instanz unter `local/accessories-validation` verwendet den installierten Modbestand und kopierte Packkonfigurationen/-skripte. Sie startet stumm, ohne Mausübernahme, ohne Shader und mit 30 FPS. Ausschließlich dort wird die Modinitialisierung mit `maxThreads = 1` serialisiert: Der erste Start reproduzierte den dokumentierten Unfocused-Initialisierungsfehler; er lieferte keinen Gameplay-Beleg.

Der vollständige anschließende Prüfablauf bestätigte:

1. Native `Block.getDrops`-Berechnung für reife Kartoffeln: Käfer bei erzwungenem erfolgreichen Chancenwurf.
2. Direkter nativer `RightClickHarvest.onBlockUse`-Aufruf: Käfer im erzeugten Loot, Ergebnis `SUCCESS`, Pflanzenalter danach 0.
3. Normaler serverseitiger `ServerPlayerGameMode.useItemOn`-Aufruf mit leerer Hand und den geladenen Mod-Ereignissen: ebenfalls Käfer im erzeugten Loot, `SUCCESS` und Pflanzenalter 0.
4. Weitere 2.000 native Pflanzen-Lootberechnungen ohne Chancenüberschreibung: **9 Käfer**. Dies ist eine Zufallsstichprobe, keine feste Ausbeute.

Die drei garantierten Gegenproben verändern den Chancenwurf nur während der Testoperationen über einen Testlistener. Die Produktionsconfig bleibt unverändert. Ergebnisdatei: `local/accessories-validation/runtime-accessories-result.json`; Protokoll: `local/accessories-validation/logs/latest.log`. Der Testclient beendete sich danach regulär.

## Einordnung und Grenzen

Der Nutzer präzisierte die Beobachtung auf über 1.000 erhaltene Kartoffel-Items und Rechtsklick mit leerer Hand. Die Chance bezieht sich auf geerntete Pflanzen, nicht auf die Zahl der Kartoffel-Items. Ohne Chancenboni beträgt die Wahrscheinlichkeit für keinen Käfer nach N geeigneten Pflanzen `(0,995)^N`; zum Beispiel rund 22 % nach 300 Pflanzen. Aus der Itemmenge allein lässt sich N nicht sicher bestimmen.

Ein genereller Konflikt zwischen den geprüften Majrusz- und Right-Click-Harvest-Versionen wurde im nativen Lauf nicht reproduziert. Eine zusätzliche Drop-Brücke wäre auf diesem geprüften Pfad redundant und könnte doppelte Chancen erzeugen. Persönliche Herkunftseffekte, Ausrüstung und der konkrete Originalweltzustand wurden nicht nachgestellt; andere Erntemethoden und dedizierter Multiplayer wurden nicht geprüft. Easy-Villagers-Handel ist nicht Gegenstand dieses Laufzeitnachweises.

## Wiederholung

`node tests/prepare-accessories-client.cjs` bereitet die isolierte Instanz vor. Voraussetzung sind die vorhandenen lokalen Laufzeitbibliotheken und die Metadaten der früheren Testwelt unter `local/runtime-validation/saves/Runtime Validation`.

Danach im Verzeichnis `local/accessories-validation`:

```powershell
& 'C:\Work\Java\GraalVM\jdk-21.0.6\bin\java.exe' '@client.args' > launcher-output.log 2>&1
```

Die Prüfskripte liegen ausschließlich unter `tests` und werden nur in die Testinstanz kopiert. Zur Bewertung die Ergebnisdatei auf `status: passed`, Käfer in allen drei Phasen und native Erfolgsergebnisse prüfen. Die Zufallsstichprobe darf nicht als deterministischer Mengenvertrag interpretiert werden.
