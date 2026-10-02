# Startabbruch durch fehlende AzureLib

Beim Start am 02.10.2026 um 14:51 Uhr war der sichtbare FTB-Quests-Fehler ein Folgefehler einer zuvor fehlgeschlagenen Modregistrierung.

## Nachgewiesener Ablauf

1. `logs/latest.log:885`: `twilight_spellbooks` 0.0.4 konnte `mod.azure.azurelib.common.animation.play_behavior.AzPlayBehaviors` nicht laden. Der Aufruf kam aus `ModDispatcher` beim Erzeugen von `UltimateScepterItem`.
2. Im Modverzeichnis war keine AzureLib-JAR vorhanden. Die Metadaten von `twilight_spellbooks-0.0.4.jar` deklarieren nur Minecraft und NeoForge als Pflichtabhängigkeiten; die benötigte Bibliothek wurde deshalb nicht durch diese Metadaten erzwungen.
3. `logs/latest.log:997`: Die Registrierung schlug fehl; bei Zeile 1037 erfolgte ein Rollback auf den Vanilla-Zustand.
4. Der anschließende Ressourcenreload enthielt keine normalen Modressourcen mehr. FTB Quests meldete eine fehlende Theme-Datei und scheiterte anschließend in `QuestShape.reload` mit `NoSuchElementException`.

Zusätzlich meldete Apotheosis 8.9.0 beim selben Registrierungsdurchlauf einen ungebundenen `apotheosis:sigil_of_withdrawal`. Ob dieser Fehler nach Behebung der fehlenden Bibliothek bestehen bleibt, ist offen. Es wurde keine eigenständige Apotheosis-Ursache nachgewiesen und kein Apotheosis-Downgrade vorgenommen.

## Korrektur und Prüfung

- Die offizielle Modrinth-API lieferte `azurelib-neo-1.21.1-3.1.14.jar` für Minecraft 1.21.1 und NeoForge.
- Die Datei wurde vor der Installation geprüft: Die exakt fehlende Klasse ist enthalten; die deklarierten Minecraft-/NeoForge-Versionen passen zur Instanz.
- Die SHA-512-Prüfsumme wurde vor und nach dem Verschieben nach `mods` mit den offiziellen Dateimetadaten verglichen.
- Installiert wurde ausschließlich diese fehlende Bibliothek. Vorhandene Mods, Konfigurationen und Weltstände blieben unverändert.

Quelle: [AzureLib auf Modrinth](https://modrinth.com/mod/azurelib).

## Noch erforderlicher Starttest

Die Instanz erneut über den Launcher starten. Ein erfolgreicher Start bis zum Hauptmenü ist noch nicht belegt. Bei erneutem Abbruch zuerst die früheste Registrierungsfehlermeldung im neuen Log prüfen, insbesondere `twilight_spellbooks` und Apotheosis. FTB Quests nicht aufgrund dieses Folgefehlers entfernen oder seine Konfiguration zurücksetzen.
