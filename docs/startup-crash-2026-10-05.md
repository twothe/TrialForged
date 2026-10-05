# Startabbruch vom 05.10.2026

## Nachgewiesene Ursache

Die FML-Crashberichte der Starts um 17:56:08, 17:58:22 und 18:00:54 melden denselben Initialisierungsfehler in `fallen_gems_affixes-1.21.1-1.0.0.jar`: `IllegalStateException: Duplicate key ring (attempted merging values ring and ring)` in `FallenGemsAffixes.postRegister`, Quellzeile 136, während `FMLLoadCompleteEvent`.

Der mit dem vorhandenen JDK untersuchte JAR-Bytecode zeigt: Bei installiertem Curios liest die Methode alle gebundenen `CurioEquipmentSlot`-Einträge aus der Apothic-Attributes-Equipment-Slot-Registry, erzeugt Wrapper mit `curioType()` und sammelt sie mit `Collectors.toMap` ohne Zusammenführung doppelter Schlüssel. Der Lauf enthält mindestens zwei Einträge mit dem Typ `ring`; diese Sammlung wirft die protokollierte Ausnahme. Die Methode enthält keinen Konfigurationsschalter für diesen Pfad. Welcher weitere Mod die betreffenden Registry-Einträge erzeugt, wurde nicht abschließend ermittelt.

`logs/latest.log` protokolliert den Fehler um 18:00:51.823 und anschließend verweigerte Ereignisse wegen `broken mod state`. Der separate Client-Crashbericht um 18:00:54 nennt erst danach `sodium_extra` bei der späten Registrierung von Konfigurationsoptionen: `Mod with id sodium_extra not found in ModList`. Dessen JAR liegt im Modverzeichnis und erscheint im Stacktrace als geladener Code. Die letzte Sodium-Meldung ist daher eine Folge des vorherigen Ladeabbruchs und kein Beleg für eine fehlende Installation.

Die Änderungszeit der Fallen-Gems-JAR ist 17:49:15 am selben Tag; das passt zeitlich zum neu auftretenden Fehler, beweist allein aber keinen Installationszeitpunkt.

## Nächster Schritt und Prüfgrenzen

Gezielter nächster Diagnoseschritt ist ein Start mit vom Nutzer deaktiviertem Fallen Gems Affixes. Sodium-Erweiterungen müssen für diesen Befund nicht entfernt werden. Eine dauerhafte Lösung benötigt eine korrigierte Modversion oder eine fachlich geprüfte Änderung der Equipment-Slot-Verarbeitung; das bloße Zurücksetzen der vorhandenen Modkonfiguration umgeht den fehlerhaften Pfad nicht.

Es wurden keine Mods oder Konfigurationen verändert und kein neuer Clientlauf durchgeführt. Die Ursache ist durch drei vorhandene Laufzeitberichte und den installierten Bytecode belegt; ein erfolgreicher Start nach einer Änderung ist noch nicht nachgewiesen. Zusätzliche Ressourcenwarnungen, darunter fehlerhafte Sodium-Packmetadaten, sind damit nicht behoben.
