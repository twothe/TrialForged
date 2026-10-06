# Rezept-Balancing

`kubejs/server_scripts/balancing-recipes.js` ist die zentrale Datei für das Entfernen und Verändern von Rezepten zur Spielbalance. Die vorhandenen Komfortrezepte bleiben in `qol-recipes.js`.

Blöcke werden ausschließlich über ihre Herstellungsrezepte eingeschränkt. Ihre Registrierung, vorhandene Exemplare und ihre Funktion bleiben erhalten. Admins können sie weiterhin beispielsweise mit `/give` bereitstellen.

## Easy Villagers

- Rezepte mit dem Ergebnis `easy_villagers:iron_farm` oder `easy_villagers:farmer` werden entfernt.
- In `easy_villagers:trader` und `easy_villagers:auto_trader` wird die zentrale Redstone-Zutat (`#c:dusts/redstone`) durch `minecraft:emerald_block` ersetzt. Muster, Glas- und Eisen-Tags sowie der Netherite-Barren des Autotraders bleiben unverändert.

Die Rezept-IDs und Zutaten wurden am 06.10.2026 direkt aus der installierten Easy-Villagers-JAR `1.21.1-1.1.45` geprüft. KubeJS `2101.7.2-build.377` stellt die verwendeten Rezept-APIs bereit. Syntax und Skriptregistrierung wurden geprüft; ein Minecraft-Laufzeittest wurde für diese Änderung nicht durchgeführt.

Die Änderungen gelten nach einem Server-/Weltneustart oder `/reload`. Für zusätzliche Balanceänderungen diese Datei erweitern; keine Blockregistrierungen oder Inventare entfernen.

## Baubley Heart Canisters

- `bhc:red_heart_canister`: normaler Knochen (`minecraft:bone`) statt Wither Bone. Leerer Canister, rotes Herz und Relic Apple bleiben unverändert.
- `bhc:yellow_heart_canister`: formloses Rezept aus je einem Red Heart Canister, Yellow Heart, verzauberten goldenen Apfel und Wither Bone. Der Wither Bone verwendet wie zuvor beim roten Canister den Mod-Kompatibilitätstag `c:wither_bones`.

Die beiden Ausgangsrezepte wurden am 06.10.2026 direkt aus der installierten Baubley-Heart-Canisters-JAR `1.21.1-1.4.3` geprüft. Das gelbe Rezept behält seine ursprüngliche ID, Gruppe und Ausgabemenge. Skriptsyntax und registrierte Rezeptänderungen wurden geprüft; kein Minecraft-Laufzeittest für diese Änderung.

## Embers Bore in Elsebase

Embers Re-Ignited `1.21.1-1.5.8` enthält standardmäßig nur Ember-Förderrezepte für Oberwelt und Nether. In Elsebase verbraucht der Bore deshalb Brennstoff, ohne Ember zu erzeugen; eine hohe Field-Chart-Anzeige hebt die Dimensionsbedingung nicht auf.

Das zentrale Balancing-Skript ergänzt drei native `embers:boring`-Rezepte ausschließlich für `elsebase:backdoor`. Die ID wurde aus der installierten Elsebase-JAR geprüft. Die Rezepte behalten die nativen Ausgaben und Gewichte bei: Ember Shard 60, Ember Crystal 20, Ember Grit 20. Die Erfolgswahrscheinlichkeit bleibt von der örtlichen Ember-Dichte abhängig.

Bei der vom Nutzer bestätigten einblockhohen Bedrock-Schicht auf Y=0 muss der Mittelblock des Bore auf **Y=1 oder Y=2** stehen. Der native Bohrbereich umfasst einen 3×3-Bereich auf den zwei Ebenen unter dem Mittelblock; mindestens drei Blöcke darin müssen zum unveränderten Tag `embers:world_bottom` (Bedrock) gehören. Die Rezepte erlauben nur diese beiden Aufstellhöhen. Weltgenerierung, bestehende Blöcke und native Rezepte der anderen Dimensionen bleiben erhalten.

Aktivierung über `/reload` oder einen Welt-/Serverneustart. `tests/embers-bore-recipes.spec.js` prüft die Registrierung aus dem Produktionsskript in der installierten Rhino-Engine. Die native Bereichsberechnung wurde in der installierten JAR geprüft; ein Minecraft-Laufzeittest der Förderung wurde für diese Änderung nicht durchgeführt.

## Embers Melter: Erzverdopplung

Das zentrale Balancing-Skript verändert ausschließlich bereits geladene `embers:melting`-Rezepte mit Roherz-, Roherzblock- oder Erz-Tags. Ein Barren entspricht bei Embers 90 mB:

| Eingabe | Ausgabe bisher | Ausgabe neu |
| --- | --- | --- |
| Roherz (`c:raw_materials/*`) | 120 mB | 180 mB = 2 Barren |
| Roherzblock (`c:storage_blocks/raw_*`) | 1.080 mB | 1.620 mB = 18 Barren |
| Erzblock (`c:ores/*`) | 240 mB | 360 mB = 4 Barren |

Der bestehende doppelte Ertrag von vollständigen Erzblöcken gegenüber Roherz bleibt erhalten. Beispielsweise ergeben 20 Roheisen jetzt 40 Eisenbarren. Barren-, Nugget- und fertige Metallblockrezepte bleiben unverändert; dadurch entsteht kein zusätzlicher Kreislaufgewinn durch Einschmelzen fertiger Metalle. Nebenprodukte, Rezept-IDs und Kompatibilitätsbedingungen bleiben erhalten.

Die installierten JARs wurden am 06.10.2026 geprüft. Embers Re-Ignited `1.21.1-1.5.8` stellt hierfür Varianten für Aluminium, Kupfer, Gold, Eisen, Blei, Nickel, Platin, Silber, Zinn, Uran und Zink bereit. Nur die im Pack tatsächlich aktivierten Varianten werden angepasst; zusätzliche Metallunterstützung wird nicht eingeführt. Aktivierung über `/reload` oder einen Welt-/Serverneustart.

Prüfung am 06.10.2026: `tests/embers-melting-recipes.spec.js` besteht mit sechs Szenarien in der installierten Rhino-Engine; die drei Bore-Szenarien bestehen weiterhin. Der separate, stumme Minecraft-Client unter `local/melting-validation` bestätigte alle 15 aktiven Erzrezepte für Eisen, Kupfer, Gold, Blei und Silber sowie drei unveränderte Eisen-Kontrollrezepte. Die native `MeltingRecipe.process`-API verarbeitete Roheisen, Eisenerz und Roheisenblock jeweils mit korrekter Flüssigkeitsmenge und Verbrauch von genau einem Eingabeitem. Maschinenaufbau und Fluidtransport wurden dabei nicht erneut geprüft.

Den Testclient mit `node tests/prepare-melting-client.cjs` vorbereiten und dessen `client.args` mit dem vorhandenen Minecraft-Java starten. Die Prüfskripte `runtime-melting-probe.js` und `runtime-melting-client.js` werden ausschließlich in diese isolierte Instanz kopiert. Das Ergebnis steht in `local/melting-validation/runtime-melting-result.json`; nach Abschluss beendet sich der Testclient automatisch.
