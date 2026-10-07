# Eigener Minecraft-Laufzeittest

Der Prüflauf umfasst zusätzlich die [gemeinsamen Magieboni](magic-attribute-unification.md): native Schadensquellen mit festen Punkten und Prozenten, tatsächlich geladene Gem-/Affix-/Zusatzbonusdefinitionen, Sockelmodifier, beide Mana-/Regenattribute bei Anlegen und Ablegen sowie echte normale/erweiterte Clienttooltips. Die Ergebnisse stehen in `runtime-magic-result.json` und `runtime-magic-client-result.json` der isolierten Instanz. Der Runner verlangt beide erfolgreichen Ergebnisse. Diese Proben ersetzen weder sämtliche Einzelzauber noch einen dedizierten Test mit zwei Netzwerkspielern.

Der Weltbeitritt und die Packskripte werden nach relevanten Änderungen mit einem vollständigen Minecraft-Client geprüft. Schnittstellenfakes in Node und Rhino bleiben schnelle Vorprüfungen; sie können KubeJS-Umbenennungen und Java-Überladungen allein nicht zuverlässig abbilden.

## Ausführung

Im Instanzverzeichnis, immer nur einen Lauf gleichzeitig:

```powershell
./tests/run-runtime-client.ps1
```

Der Befehl prüft zunächst die Skriptverträge und erstellt unter `local/runtime-validation` eine eigene Instanz mit dem installierten Modbestand, Konfigurationen und aktuellen Produktionsskripten. Er verwendet die vorhandenen Minecraft-/NeoForge-Bibliotheken und GraalVM unter `C:\Work\Java\GraalVM\jdk-21.0.6`. Es werden keine Downloads oder Modwechsel durchgeführt. Die Pfade und Versionsmetadaten im Vorbereitungsprogramm entsprechen dieser lokalen Installation.

Die isolierte Instanz startet mit `soundCategory_master:0.0`. Ihr Clientprüfskript hält das Fenster für Minecraft inaktiv und gibt eine eventuell ergriffene Maus sofort frei; `pauseOnLostFocus:false` ermöglicht die Prüfung im Hintergrund. Normale Instanzeinstellungen bleiben erhalten. Bei einem fehlgeschlagenen Serverprüfschritt beendet sich der Testclient beim nächsten Prüfintervall.

Der Offline-Spieler `RuntimeTester` betritt automatisch die separate Welt `Runtime Validation`. Bei deren erster Anlage werden `level.dat`, Datapacks und Serverkonfiguration aus `Run #1` übernommen, jedoch keine Chunks oder externen Spielerdateien. `level.dat` kann eingebettete Spielerdaten enthalten; der Test setzt ausschließlich den Fortschritt der isolierten Testidentität zurück. Die Originalwelt wird nicht beschrieben. Weitere Läufe verwenden die gespeicherte Testwelt.

Die drei Prüfskripte werden ausschließlich in die Testinstanz kopiert. Sie prüfen:

- echten Spielerlogin und das Ende des Terrain-Ladebildschirms; die normale NeoOrigins-Herkunftsauswahl ist für den neuen Offline-Spieler zulässig;
- vollständigen JEI-Start und mindestens 200 Clientticks nach Erreichen des normalen Bildschirms;
- echten Schaden an einem Zombie und Schaden durch einen nativ infernalen Warden;
- native Infernal-Effekte aller drei frisch erzeugten Bosse und das Fehlen eigener Profilmarker; HP und Effekte sind zufällig statt fest vorgegeben;
- gespeicherte Kampfbeteiligung, den Lootpfad eines Level-1.000-Zombies und einen echten Warden-Kill mit Aufstieg von Haven nach Pinnacle;
- bei Wiederholung nach erfolgreichem Lauf den gespeicherten Tier vor dem erneuten Zurücksetzen;
- reguläres Beenden des Testclients. Der Runner verlangt Erfolgsmarker und lehnt Skriptfehler sowie unerwartete Serverausnahmen ab. Zwei bekannte Ressourcen-Tagfehler werden gesondert als Warnung ausgegeben, siehe unten.
- [Ars-Kistenloot](ars-chest-loot.md): installierte Kistentabellen, 20.000 native Bonuswürfe, Mengen und Essenzverteilung, echte Modkisten, unveränderte Ars-Spezialkisten sowie Lootr-Inventare zweier serverseitiger Testidentitäten.
- Elsebase: native Dimensionsregel, Gegenprobe der bisherigen globalen Distanzrechnung sowie frische Zombies, Skelette und Creeper bei weit entfernten Koordinaten ohne Levelwachstum oder Level-Attributboni. Keine Bereinigung gespeicherter Elsebase-Mobs.
- Nether/End: native Dimensionsprofile mit Basislevel 30/80, erhaltenen Obergrenzen und Zufallsboni, Basisrechnung ohne Distanz-/Tiefenbonus sowie frische Zombies über den normalen Spawnpfad.

Die Ergebnisdatei liegt unter `local/runtime-validation/runtime-result.json`, Details unter `logs/latest.log` und `launcher-output.log` derselben Testinstanz. Nach Änderungen am Modbestand dürfen in der wiederverwendeten Kopie keine alten JARs verbleiben; vor dem Lauf den Bestand mit dem Original abgleichen. Produktionsskripte während eines laufenden Tests nicht verändern.

Die Ars-Prüfung schreibt zusätzlich `runtime-ars-chest-result.json`. Die zweite Lootr-Identität ist ein nativer NeoForge-FakePlayer im integrierten Server, kein zweiter verbundener Netzwerkclient. Diese Prüfung belegt den persönlichen Inventarpfad, keinen vollständigen dedizierten Mehrspielertest.

## Native Infernal-Bosse: Prüfung vom 05.10.2026

Der isolierte Clientlauf nach Entfernung der festen Bossprofile bestand: Weltbeitritt und gespeicherter Tier, native Infernal-Effekte aller drei frisch erzeugten Bosse ohne eigenen Profilmarker, gewöhnlicher Schaden, Warden-Schaden, Levelbeute, Warden-Kill mit Pinnacle, JEI-Start, Ende des Ladebildschirms und reguläres Beenden. In diesem einzelnen zufälligen Lauf erreichten alle drei Bosse 1.024 maximale HP; das ist kein festes Profil und keine Balancegarantie. Die zwei bekannten Ressourcen-Tagfehler wurden als Warnung ausgewiesen; keine Produktionsskriptfehler oder unerwartete Serverausnahme wurden gemeldet.

Die Testvorbereitung entfernt inzwischen veraltete kopierte JARs und Serverskripte ausschließlich aus der isolierten Laufzeitkopie. So kann das entfernte Profilskript dort nicht versehentlich weiterlaufen. Dedizierter Multiplayer und sämtliche zufälligen Effektkombinationen wurden nicht geprüft.

## Historische Befunde vom 02.10.2026

Das minutenlange „Loading Terrain“ entstand durch einen Serverabsturz im Schadenshandler. Anschließend fehlten JEIs noch laufender Amboss-Rezeptregistrierung die beim Serverstopp geleerten Apothic-Enchanting-Daten. Die detaillierte Fehlerkette steht in den [Bossprofilen](vanilla-boss-profiles.md#kubejs-schnittstellenkorrektur-vom-02102026).

Die echten Clientläufe deckten zusätzlich eine mehrdeutige `removeModifier`-Überladung, nicht verfügbare Drachenphasen-`equals`-Aufrufe, `getGameTime` statt KubeJS' `getTime` und eine ungültige LootJS-Auswahl auf. Die Produktionsskripte verwenden nun die explizite ResourceLocation-Überladung, Phasen-IDs und die tatsächlichen KubeJS-Namen. LootJS bearbeitet vorhandene Entity-Loot-Tabellen.

Ein separater Startabbruch trat in Unfocused 0.3.9 bei paralleler Modkonstruktion auf: `RegistryTypes.RegistryType.create` verändert eine ungeschützte `ArrayList`; der Stacktrace führte über Scriptor/JEI zu `ArrayIndexOutOfBoundsException` in `ArrayList.add`. Der installierte FML-Bytecode bestätigt, dass `maxThreads` den Executor für diese Initialisierung steuert. `config/fml.toml` setzt deshalb `maxThreads = 1`. Das serialisiert die frühe Modinitialisierung; Weltgenerierung und Spiellogik behalten ihre eigenen Threads. Dies ist eine Konfigurationsumgehung des Modfehlers, kein Modupdate.

Der vollständige Lauf um 20:05–20:06 Uhr bestand: Spielerbeitritt, alle nativen Prüfschritte, JEI-Start in 16,06 Sekunden, Ende des Terrain-Ladebildschirms, regulärer Serverstopp und Speicherung aller Dimensionen. Der Wiederholungslauf um 20:11–20:12 Uhr bestätigte den gespeicherten Pinnacle-Tier nach vollständigem Clientneustart und wiederholte die Kampfprüfungen erfolgreich. Vom Weltserverstart um 20:12:06,535 bis zum bestätigten Ende des Ladebildschirms um 20:12:31,591 vergingen rund 25 Sekunden; JEI benötigte dabei 15,71 Sekunden. Diese Zeit umfasst nicht den vorherigen vollständigen Modpackstart.

Es gab keine Ausnahme in den Produktionsskripten und keinen unerwarteten Serverstopp. Zwei bereits im Originalprotokoll um 19:40 Uhr vorhandene Ressourcenfehler bleiben bestehen: `farmersdelight:pies` verweist über Ars Delight auf fehlende Kuchen, `create:brittle` auf diesen fehlenden Tag. Auch KubeJS protokolliert diese Mod-Ressourcenfehler; sie verhindern den nachgewiesenen Login nicht. Die erste pauschale KubeJS-Logprüfung lehnte deshalb den zweiten Lauf ab. Der Runner weist genau diese beiden Meldungen nun ausdrücklich als bekannte Warnungen aus und verwirft weiterhin andere KubeJS-Fehler. Die erneute Auswertung des gespeicherten Laufs erfolgt mit `./tests/run-runtime-client.ps1 -VerifySavedRun`; sie startet keinen neuen Client. Weitere Modwarnungen sind damit nicht insgesamt behoben.

Die Prüfung belegt keinen dedizierten Mehrspielerbetrieb, keine vollständige Bossbalance und nicht sämtliche projektil-/zauberspezifischen Schadenspfade. Ein Testclient mit neuem Offline-Spieler erreicht die Herkunftsauswahl; diese Prüfung ersetzt keine manuelle Bewertung der danach folgenden Bedienung.
