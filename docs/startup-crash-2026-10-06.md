# Startabbruch und Desktop-Ausfall vom 06.10.2026

## Befunde

Der Nutzer berichtet beim Spielstart von zwei schwarzen Bildschirmen, ausgefallenem YouTube-Ton, anschließender Wiederherstellung des Desktops nach Alt-Tab und einem Wechsel der Audioausgabe vom Corsair-Headset zu den Monitoren. Zwei Befunde müssen getrennt bewertet werden; ein ursächlicher Zusammenhang ist nicht nachgewiesen.

### Vom Nutzer ergänzte Vorgeschichte

- Einige Tage zuvor trat laut Nutzer ein Netzteildefekt beim Aktivieren von Minecraft-Shadern auf. Shader sind inzwischen deaktiviert. Eine unabhängige Untersuchung des alten Netzteils liegt hier nicht vor.
- Am 05.10.2026 wurde ein **Seasonic Focus GX-850 ATX 3** professionell eingebaut; die modularen Kabel wurden ausdrücklich durch die beiliegenden Kabel ersetzt. Mainboard laut Nutzer: **ASUS Prime Z690-P WiFi D4**. Eine Übernahme alter modularer Kabel ist damit nach Nutzerangabe ausgeschlossen, nicht jedoch jede mögliche Hardwareursache.
- Nach dem Austausch waren Belastungstest und stundenlanges Minecraft-Spielen laut Nutzer unauffällig.
- Ebenfalls am 05.10. wurde laut Nutzer der aktuelle NVIDIA Studio-Treiber installiert. Mit dem vorherigen Game-Ready-Treiber hatte ausschließlich das Vivaldi-Fenster gelegentlich geflackert; seit dem Wechsel trat dieses Flackern nicht mehr auf. Der aktuelle Treiber und der Treiber im GPU-Dump melden beide **616.92**. Die Bezeichnung als Studio stammt aus der Nutzerangabe; die Behauptung „neueste Version“ wurde nicht unabhängig geprüft.
- Nach der Dump-Analyse hat der Nutzer Windows ausdrücklich neu gestartet. Vivaldi/YouTube und Minecraft wurden seit diesem Neustart noch nicht gemeinsam geöffnet; eine erfolgreiche Wiederholung des ursprünglichen Ablaufs ist daher noch nicht belegt. Das Minecraft-Protokoll stammt bei der Nachprüfung weiterhin vom Start um 11:33 Uhr.

Die Veränderung des Browserflackerns nach dem Treiberwechsel begründet eine gezielte Untersuchung der Grafiksoftware als Arbeitshypothese. Sie beweist weder, dass der heutige Timeout dieselbe Ursache hat, noch, dass das neue Netzteil oder die GPU defektfrei sind. Hardwarebeschleunigung in Vivaldi wäre bei erneuten Browser-/Videoproblemen eine einzelne, reversible Vergleichsvariable; keine entsprechende Einstellung wurde geändert. Vivaldi nennt diesen Vergleich in seiner offiziellen Fehlerdiagnose.

### Minecraft-Ladeabbruch

`logs/latest.log` protokolliert um 11:32:59.947 einen Initialisierungsfehler von `unfocused-neoforge-0.3.9-1.21.1-sgd.jar`: `ArrayIndexOutOfBoundsException: Index 1 out of bounds for length 0` in `ArrayList.add`, aufgerufen aus `RegistryTypes$RegistryType.create` (Zeile 14), über `ModInitializer` und die statische Initialisierung von `Unfocused`.

Um 11:33:02.419 bricht NeoForge die Modkonstruktion mit einem Fehler ab. Danach werden weitere Ladeereignisse wegen `broken mod state` verweigert. Um 11:33:08.303 fehlen FTB Quests die Theme-Ressourcen; anschließend scheitert `QuestShape.reload` mit `NoSuchElementException`. Der Bericht `crash-reports/crash-2026-10-06_11.33.08-client.txt` zeigt diesen Folgefehler als `Rendering overlay`. Der frühere Unfocused-Fehler ist der belegte Ansatzpunkt für den Minecraft-Ladeabbruch. Seine interne Ursache und eine mögliche Race Condition wurden nicht untersucht oder bestätigt.

### Windows-Grafikfehler

In `C:\ProgramData\Microsoft\Windows\WER\ReportQueue` existiert ein neuer Ordner:

`Kernel_141_ee7b412488a64cc36a8d5b2c7d951c04d2eef67_00000000_e97e78c9-b8fe-4616-991d-f203b7b5e205`

Erstellzeit: 06.10.2026 11:33:27.398, Änderungszeit: 11:33:27.716 (Europe/Berlin). Der Berichtstyp 0x141 bezeichnet eine nicht rechtzeitig antwortende GPU-Engine. Das ist ein zeitlich passender Windows-Befund außerhalb der Java-Ausnahme. Minecraft meldet eine NVIDIA GeForce RTX 3070 Ti mit Treiber 616.92 (32.0.16.1692).

Vier weitere `Kernel_141`-Ordner sowie je ein `Kernel_1a8`- und `Kernel_1b8`-Ordner haben ebenfalls eine Änderungszeit um 11:33:27, wurden aber bereits 2025 beziehungsweise am 31.08.2026 erstellt. Diese älteren Ordner dürfen nicht als sieben neue Fehler dieses Starts gezählt werden. 0x1A8 und 0x1B8 sind Black-Screen-Diagnoseberichte; ihre bloße Existenz beweist keinen neuen Ausfall am 06.10.

Das Wiederaufbauen des Desktops passt zu einer Wiederherstellung des Grafiksystems. Die nachfolgende Dump-Auswertung bestätigt den NVIDIA-Treiberpfad und den Desktop Window Manager als zugeordneten Prozess. Der ursprüngliche Auslöser und die Ursache der Audio-Umschaltung bleiben ungeklärt. Weder ein Hardwaredefekt noch YouTube, Unfocused oder Sodium als Ursache des GPU-Hängers sind nachgewiesen. Die Sodium-Meldung `NVIDIA_THREADED_OPTIMIZATIONS_BROKEN` beschreibt eine aktivierte Schutzmaßnahme und beweist für sich keinen Treiberabsturz.

### Auswertung der gesicherten Windows-Dateien

Der Nutzer stellte `WATCHDOG-20261006-1133.dmp`, `sysdata.xml` und `WERInternalRequest.xml` unter `local/crash-diagnostics` bereit. Der ursprünglich genannte temporäre WER-Ordner verschwand zwischen Auflistung und Leseversuch; die dauerhaft kopierten Dateien konnten vollständig gelesen werden.

Der Microsoft-Konsolendebugger CDB 10.0.29617.1000 wurde aus dem offiziellen WinDbg-Paket lokal extrahiert; die Signaturen von `cdb.exe` und `dbgeng.dll` wurden als gültige Microsoft-Signaturen geprüft. Keine Systeminstallation. Die maßgebliche Ausgabe mit passenden öffentlichen Windows-Symbolen und lokalem Treiberabbild liegt unter `local/crash-diagnostics/debugger-analysis-full.txt`.

Ergebnisse aus `.bugcheck`, `!analyze -v`, `lmvm nvlddmkm` und Stackauswertung:

- Aufnahmezeit des Dumps: **06.10.2026 11:33:06.250 (UTC+2)**, Systemlaufzeit 18:17:07.971. Die WER-Anfrage wurde um 11:33:27.389 erstellt; das ist nicht der Beginn des Hängers.
- Fehler: `VIDEO_ENGINE_TIMEOUT_DETECTED (141)`, Attribut `Live Generated Dump`. Es handelt sich um einen im laufenden Windows aufgenommenen Diagnose-Dump, nicht um den Beleg eines Bluescreens.
- Zuordnung: `FAILURE_BUCKET_ID: LKD_0x141_IMAGE_nvlddmkm.sys`.
- Betroffener Treiber: `nvlddmkm.sys`, Version `32.0.16.1692` / NVIDIA **616.92**.
- Fehlerparameter 2 (`fffff80453019ff0`) liegt innerhalb des geladenen NVIDIA-Moduls; Offset `0x1939ff0`. Die Ausgabe `nvDumpConfig+795a80` verwendet lediglich verfügbare Exportsymbole mit großem Offset und identifiziert keine gesicherte interne Fehlerfunktion.
- Nach vollständiger Symbol-/Abbildauflösung nennt die Analyse `PROCESS_NAME: dwm.exe` und `PROCESS_OBJECT: ffffb881e92130c0`. Die erste unvollständige Offline-Analyse nannte lediglich den System-Kontext des aufzeichnenden Threads und ist für diese Prozesszuordnung nicht maßgeblich.
- Der Windows-Stack zeigt `VidSchiCheckHwProgress` → `VidSchiResetEngines` → `VidSchiResetHwEngine` → `TdrCollectDbgInfoStage1`: Die GPU-Fortschrittsprüfung führt in den Engine-Reset-/Diagnosepfad.

Damit ist ein GPU-Timeout im NVIDIA-Grafikpfad mit DWM-Prozesszuordnung belegt. DWM setzt die Desktop-Fenster zur Bildschirmausgabe zusammen; die Zuordnung passt zum Ausfall beider Bildschirme und zum Fensterstottern. Sie beweist weder einen Fehler in DWM selbst noch, dass DWM die ursprüngliche Ursache war. Der Stack belegt den Wiederherstellungspfad, nicht dessen vollständigen erfolgreichen Abschluss.

Der Dump ist ein kleiner Kernel-Dump. Der private Typ `dxgkrnl!_TDR_RECOVERY_CONTEXT` ist mit den öffentlichen Symbolen nicht auflösbar. Der genaue auslösende Grafikbefehl, ein Zusammenhang mit Browser-Videodekodierung und die Unterscheidung zwischen Treiberfehler und instabiler Hardware bleiben offen. NVIDIA-Privatsymbole liegen nicht vor.

SHA-256 des Originaldumps: `CA8E0C70535FCCFB91D3F998AAC567077FD9F66BB05788A7B08AB1A870D623AD`.

## Prüfgrenzen und nächster Schritt

Der Nutzer meldet anschließend neu aufgetretenes starkes Stottern, wenn verschobene Fenster gleichzeitig auf beiden Monitoren sichtbar sind. Das stützt die Hypothese einer noch gestörten Anzeigeverarbeitung nach dem GPU-Timeout, beweist aber keinen konkreten DWM-, Synchronisations- oder Treiberfehler. Eine anschließende `nvidia-smi`-Momentaufnahme liefert 41 °C, 22 % GPU-Auslastung, 948 von 8192 MiB belegten Grafikspeicher und P8. Diese Werte zeigen zu diesem Zeitpunkt keine hohe Temperatur oder ausgeschöpften Grafikspeicher; sie erlauben keine Rückschlüsse auf den Zustand beim Ausfall. Die Abfrage der aktuellen Anzeigemodi über CIM wurde verweigert.

Der Nutzer bestätigte zunächst: **Kein Neustart, das Stottern ist von selbst verschwunden.** Das passt zu einer verzögerten Erholung der Anzeigeverarbeitung; der genaue Mechanismus ist nicht belegt. Später führte der Nutzer einen Windows-Neustart durch. Die anschließende GPU-Momentaufnahme meldete 616.92, 43 °C, 9 % Auslastung und 740 MiB belegten Grafikspeicher. Ein gemeinsamer Start von Vivaldi/YouTube und Minecraft nach dem Neustart steht laut Nutzer noch aus; die Momentaufnahme ist kein Stabilitätsnachweis.

Windows verweigerte den direkten Zugriff auf `Report.wer`, `LiveKernelReports` und die Ereignisprotokolle. Der vom Nutzer bereitgestellte Dump und die XML-Dateien konnten anschließend ausgewertet werden; Windows-Ereignisprotokolle liegen weiterhin nicht vor. Ordnerzeiten sind keine exakten Ereigniszeiten.

Bei Wiederholung: neuen WATCHDOG-Dump dauerhaft sichern und die System-/Anwendungsereignisse für den Ausfallzeitraum mitliefern. Wiederkehrende NVIDIA-Timeouts rechtfertigen eine gezielte Prüfung der Treiberversion und ihrer offiziellen Fehlerhinweise; ein bestimmtes Update, Downgrade oder Hardwaretausch lässt sich aus diesem einzelnen Dump nicht als gesicherte Lösung ableiten. Der separate Unfocused-Ladefehler bleibt offen und muss unabhängig untersucht werden.

Keine Mods, Treiber oder Konfigurationen wurden geändert. Kein eigener Minecraft-Start oder Belastungstest wurde ausgelöst. Die bereits vorhandene Änderung an `config/ftbchunks-client.snbt` blieb unberührt.

## Quellen

- [Microsoft: 0x141 VIDEO_ENGINE_TIMEOUT_DETECTED](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x141---video-engine-timeout-detected)
- [Microsoft: Timeout Detection and Recovery](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/timeout-detection-and-recovery)
- [Microsoft: 0x1A8 Black-Screen-Livedump](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x1a8--video-dxgkrnl-black-screen-livedump)
- [Microsoft: 0x1B8 Black-Screen-Livedump](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x1b8--video-miniport-black-screen-livedump)
- [Vivaldi: Troubleshooting issues on desktop](https://help.vivaldi.com/desktop/troubleshoot/troubleshooting-issues/)
