# Lokales Skill Studio

Der Editor liegt unter `tools/skill-planner`. Zum Starten `Start-Skillatelier.cmd` doppelklicken oder `index.html` direkt im Browser öffnen. Keine Installation und kein Internet nötig. Alle Editor-Dateien zusammen behalten.

Oberfläche, Systemmeldungen, Attributnamen und Exporttexte sind Englisch. Bestehende Pläne bleiben lesbar; selbst geschriebene Texte werden nicht übersetzt.

## Bedienung

- **Add first skill** legt den ersten Startskill an. **+ Add skill** aktiviert das Setzen auf leere Hexfelder. **Select / move** erlaubt Auswählen und Verschieben. Freie Fläche ziehen verschiebt die Ansicht.
- **Copy skill** setzt weitere Instanzen desselben Skills auf freie Hexfelder; **Esc** beendet den Modus. Name, Beschreibung, Boni, Icon, Farbe, Kosten, Voraussetzungen und technische Aufträge sind gemeinsam, auch über mehrere Bäume. Änderungen an einer Instanz ändern diesen Inhalt überall. Position, Einstiegspunkt, Knoten-ID und Verbindungen bleiben je Instanz getrennt.
- Rechts Spielerbeschreibung, Kosten, Voraussetzungen und Effekte bearbeiten. **Native bonuses** erlaubt mehrere Attribute. Beispiel: **Sprinting Speed**, **Percent of total**, **5** = +5 % Sprinttempo. **Maximum health**, **Flat bonus**, **2** entspricht einem Herz. Basisprozente addieren sich auf den Basiswert; Gesamtprozente können sich miteinander multiplizieren.
- **Technical implementation request** beschreibt Sondermechaniken: Auslöser, Bedingungen, Werte, Dauer, Cooldown, Zurücksetzen. Kann native Boni ergänzen. **Acceptance criteria / edge cases** beschreibt gewünschte Prüfkriterien.
- **Connect**: zuerst Ausgangsskill, dann Zielskill anklicken. **Normal** gilt in beide Richtungen, **Directed** vom ersten zum zweiten, **Exclusive** verhindert gleichzeitige Freischaltung und öffnet keinen Pfad. Für gegenseitig ausschließende Gruppen jedes Paar verbinden. Verbindungen dürfen Felder überspringen.
- **Check plan** zeigt grundlegende Lücken. Das ersetzt keine vollständige Simulation von Freischaltbedingungen und Ausschlüssen.
- Spielerbeschreibungen sind optional und lösen keine Warnung aus. Bei selbsterklärenden Skills wie „10% more experience“ genügt der Name; Beschreibungen erläutern besondere Mechaniken. Fehlende technische Wirkungen werden weiterhin geprüft.
- **Save JSON** exportiert eine zusätzliche Sicherung. **Implementation brief** erzeugt das vollständige Umsetzungsdokument. Beide Formate mit **Open** wieder öffnen.

## Notizen, Listen und Icons

**Tree design notes** beschreibt die Absicht für den gesamten ausgewählten Baum: Thema, Spielweise, Balancegrenzen, Wechselwirkungen. Beispiel: „Defensiver Schildpfad, Rüstung und Blocken, keine Magieboni“. Diese Notizen sind Vorgaben für die Umsetzung, keine Spielerbeschreibung oder automatische Freischaltbedingung. **Overall design notes** gilt für alle Bäume; **Points / progression** beschreibt Punktevergabe, Grenzen und Zurücksetzen.

Die Skillliste ist alphabetisch und zeigt jeden Namen im aktuellen Baum einmal mit Instanzzahl. Der Filter durchsucht Namen und Spielerbeschreibungen. Erneutes Anklicken eines Listeneintrags wechselt zur nächsten Instanz und zentriert diese. Die Liste füllt die verbleibende Höhe der linken Spalte mit kompakten Zeilen; Planoptionen und Hilfe sind eingeklappt. Rechts stehen Name, Icon und Boni oben; Sondertexte, Kosten und Instanzdaten sind eigene aufklappbare Bereiche. [Designentscheidungen](skill-planner-design.md) erläutert die Überarbeitung.

## Namen und Instanzen

Der Skillname ist der eindeutige Schlüssel innerhalb des gesamten Plans. Groß-/Kleinschreibung bleibt relevant; äußere Leerzeichen zählen nicht. Neue Skills bekommen einen freien Platzhalternamen wie „New skill (2)“. Ein bereits verwendeter Name kann nicht eingegeben werden, um zwei unabhängige Skills zusammenzuführen: Das Feld wird rot mit Hinweis, Tab und Klick außerhalb werden abgefangen, nach Fokusverlust erhält es wieder den Fokus. Export und Kontextwechsel bleiben gesperrt, bis der Name korrigiert wird. Die ungültige Eingabe selbst wird trotzdem lokal gespeichert und beim Öffnen wiederhergestellt.

Ausnahme: **New skill** ist immer ein unabhängiger Entwurf, auch mit anderer Großschreibung oder Nummer wie „New skill (2)“. Platzhalter werden beim Kopieren nicht verknüpft und bleiben getrennt bearbeitbar. Eingabe von „New Skill“ löst keine Namenskollision aus; der Editor vergibt eine freie Platzhalternummer. Wird eine benannte gemeinsame Instanz so umbenannt, wird nur dieser Knoten mit einer eigenen Inhaltskopie herausgelöst. Alte gemeinsam gespeicherte Platzhalter werden beim Laden getrennt, ohne Knoten-IDs, Werte oder Verbindungen zu verlieren.

Für denselben Skill an weiteren Positionen **Copy skill** verwenden. Umbenennen ändert den gemeinsamen Namen aller Instanzen. **Delete** entfernt nur den ausgewählten Knoten mit seinen Verbindungen; die gemeinsame Definition verschwindet erst mit der letzten Instanz. Spielerfreischaltungen im Mod bleiben pro Knoten-ID eigenständig: vier Instanzen sind vier separat erwerbbare Knoten mit demselben Inhalt.

Das Planformat ist jetzt Version 2: `definitions` speichert gemeinsame Inhalte einmal, `trees[].skills` enthält nur `id`, `name`, `q`, `r`, `root`. Version-1-Dateien und Browserstände werden gelesen und automatisch migriert. Gleiche Namen mit gleichem Inhalt werden zusammengefasst; unterschiedliche Inhalte erhalten Variantenamen, ohne Werte, IDs oder Verbindungen zu verwerfen. Varianten werden im Umsetzungsdokument unter Migration notes protokolliert. Vor Überschreiben eines alten Cache hält `.v1-backup` die ursprüngliche Eingabesicherung und `.v1-plan-backup` die ursprüngliche Planquelle. Neue Version-2-Exporte sind für die alte Editorversion nicht lesbar.

**Native bonuses** sortiert sämtliche Attributnamen gemeinsam alphabetisch, unabhängig von ihrer Herkunft.

Der Katalog enthält 50 Einträge: alle 42 Attribute der installierten Pufferfish's Attributes 0.8.3 und acht ausgewählte Vanilla-Attribute. Das ist kein vollständiges Attributinventar des Modpacks. Ars Nouveau, Iron's Spellbooks, Apothic Attributes und weitere Mods besitzen zusätzliche Attribute, die hier noch nicht auswählbar sind. Solche Boni unter **Technical implementation request** beschreiben; vor Umsetzung müssen Registrierung, Spielerzuordnung und Wirkung geprüft werden. Pufferfishs 42 Attribut-IDs wurden am 06.10.2026 erneut gegen die API-Klasse und die englischen Namen der installierten JAR geprüft.

**Color** hat zusätzlich ein Textfeld für **#RRGGBB**. Kopieren und Einfügen funktionieren mit den normalen Tastenkürzeln. Sechs Hexziffern mit oder ohne `#` werden angenommen und vereinheitlicht; Textfeld, Farbwähler und Knotenfarbe bleiben synchron. Unvollständige oder ungültige Texteingaben bleiben im Cache erhalten, während der letzte gültige Farbwert den Knoten färbt. Beide Farbsteuerungen können die Eingabe korrigieren.

**Item icon** ist ein Combo-Dropdown mit integriertem Filter und lokalen Vorschauen für 1.333 Vanilla-Items. Tippen durchsucht beliebige Teiltexte in Namen und IDs ohne Beachtung der Großschreibung, etwa „SWor“ für Iron Sword und Golden Sword. Pfeiltasten und Enter wählen; Esc, Tab oder Klick außerhalb schließen. Ein bloßer Suchtext verändert den Skill nicht. Bei vielen Treffern zeigt das Dropdown die ersten 80 und fordert zum Eingrenzen auf. Mod-IDs stehen im Bereich **Custom item ID**. Ohne verfügbare Vorschau bleibt ein Symbol im Knoten. 3D-Blöcke, animierte oder mehrschichtige Items können im Spiel anders aussehen.

## Tastenkürzel

- `+`, Numpad-`+` oder `N`: Add-Modus; danach ein freies Feld anklicken.
- `Ctrl+D`: ausgewählten Skill kopieren, anschließend freie Hexfelder anklicken.
- `Delete` / `Entf`: ausgewählten Skill und Verbindungen nach Bestätigung löschen. Unveränderte, unverbundene „New skill“-Platzhalter benötigen keine Bestätigung. Der Name allein reicht nicht, wenn bereits Inhalte oder Boni bearbeitet wurden.
- `Esc`: Select-Modus und begonnene Verbindung abbrechen.
- `Ctrl+Z`, `Ctrl+Y` beziehungsweise `Ctrl+Shift+Z`: rückgängig / wiederholen.
- `Ctrl+S`: JSON-Datei exportieren.

In Eingabefeldern bleiben normale Textbearbeitungstasten aktiv. Bis zu 100 Änderungen werden sitzungsgebunden gespeichert. Eingaben innerhalb von 800 ms im selben Feld bilden einen Rückgängig-Schritt. Mausrad und Zoomleiste zoomen; **Fit tree** zentriert. Verbindungen anklicken und bestätigen oder rechts mit **×** entfernen.

## Sofortiges Autosave

Jede Eingabe wird sofort synchron im Browsercache gespeichert, ohne Fokuswechsel oder Speicherknopf. Änderungen an Skills, Verbindungen, Bäumen und Effekten ebenfalls. Beim Öffnen werden Plan, ausgewählter Baum und Skill, Ansicht und Skillfilter wiederhergestellt.

Unvollständige Eingaben, etwa ein vorübergehend leeres Zahlenfeld, bleiben separat von gültigen Plandaten erhalten und werden beim Öffnen wieder angezeigt. Markierte Felder vor Export oder Kontextwechsel vervollständigen, damit kein älterer gültiger Wert exportiert oder offene Eingabe verworfen wird.

Der ursprüngliche Schlüssel `trialforged.skill-plan.v1` bleibt als Speicherort erhalten und enthält nach dem nächsten Speichern das neue Planformat. `.draft` und `.backup` halten Eingabestand und vorherige gültige Kopie. Beschädigte Einträge werden gegen alternative Kopien geprüft. Mehrere bearbeitende Fenster werden gewarnt, aber nicht zusammengeführt.

Dateiexporte sind Zusatzfunktionen. Cache bleibt an Browser, Profil und Speicherumgebung gebunden. Gelöschte Browserdaten, private Fenster, deaktivierter Speicher, Speichergrenzen oder Verschieben des Editorordners können Wiederherstellung beeinträchtigen. Schreibfehler werden angezeigt. Für unabhängige Sicherungen gelegentlich exportieren.

## Modbezug und Übergabe

Die `.skillplan.md` enthält Spielertexte, technische Aufträge, Positionen, IDs, Verbindungen und die vollständige JSON-Quelle. Codex diese Datei oder ihren Pfad nennen. Änderungen nur am lesbaren Teil beeinflussen Rückimport nicht; maßgeblich ist die eingebettete Quelle.

Der Export ist ein Auftrag, kein fertiges Datapack. Startskills sind verfügbare Einstiegspunkte, keine automatisch kostenlos erworbenen Skills. `exclusive_root` sperrt andere Einstiegspunkte nach erster Wahl; normale Pfade können sie später erreichbar machen. IDs beibehalten, weil Freischaltungen darüber gespeichert werden.

Grundlage vom 06.10.2026: Skills 0.19.1 und Attributes 0.8.3, Minecraft 1.21.1 / NeoForge. Attributregistrierungen und Operationen `add_value`, `add_multiplied_base`, `add_multiplied_total` wurden in installierten JARs geprüft. 5 % ergibt Rewardwert 0.05. Verbindungstypen entsprechen normalen/exklusiven und bidirektionalen/unidirektionalen Gruppen. Gerichtete Ausschlüsse oder andere Ausschlussschwellen als Auftrag beschreiben.

Layout: pointy-top Hexgitter, axial q/r, Radius 52, Mod-x/y gerundet. Farbe ist Editorhilfe. Vor Modumsetzung Bestand erneut prüfen und Item-IDs, Modwechselwirkungen, Rücksetzen, Login und Multiplayer im isolierten Client verifizieren. Tiefe Eingriffe vorab gemäß AGENTS.md klären.

Referenzen: [Definitionen](https://puffish.net/skillsmod/docs/creators/configuration/definition), [Startpunkte](https://puffish.net/skillsmod/docs/creators/configuration/skill), [Verbindungen](https://puffish.net/skillsmod/docs/creators/configuration/connection), [Attribute](https://puffish.net/skillsmod/docs/creators/configuration/rewards/built-in/attribute).

## Prüfung und Wartung

`node --test tests/skill-planner.spec.cjs tests/skill-planner-cache.spec.cjs tests/skill-planner-ui.spec.cjs` prüft Modell, Speicher und Controller, einschließlich gemeinsamer Boni über Bäume, Namenssperre, Instanzlöschung, Migration mit Sicherungen, Undo, Combo-Tastaturbedienung, alphabetischer Attribute und SVG-Iconzuordnung. Controllerprüfungen laden produktive Skripte und ersetzen DOM-/Speicherabhängigkeiten; sie beweisen keine tatsächliche Browserdarstellung.

Auswahlfehler: Pointer-Capture begann bei pointerdown auf der ganzen SVG-Fläche und konnte Klicks vom Skill auf den Canvas umlenken. Capture beginnt jetzt nach der Drag-Schwelle. Frühere Eingaben auf change wurden erst bei Fokusverlust gespeichert; jetzt verwenden sie input mit sofortiger Cache-Schreibung.

Der echte Browserprüflauf unter `tests/skill-planner-browser.cjs` ist um die Regressionen erweitert. Der ursprüngliche Edge-Lauf scheiterte am Browserstart in der eingeschränkten Agentumgebung; der integrierte Browser blockiert file-Seiten. Tatsächliche Darstellung bleibt ungeprüft.

`tests/build-skill-icon-catalog.py <vorhandene-client-jar> tools/skill-planner/icons.js` erzeugt den Katalog aus lokalen Namen, Modellen und Texturen. Keine Downloads oder Installationen. Modkonfigurationen und Weltstände bleiben unberührt.
