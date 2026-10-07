# Lokales Skill Studio

Der Editor liegt unter `tools/skill-planner`. Zum Starten `Start-Skillatelier.cmd` doppelklicken oder `index.html` direkt im Browser öffnen. Keine Installation und kein Internet nötig. Alle Editor-Dateien zusammen behalten.

Oberfläche, Systemmeldungen, Attributnamen und Exporttexte sind Englisch. Bestehende Pläne bleiben lesbar; selbst geschriebene Texte werden nicht übersetzt.

## Bedienung

- **Add first skill** legt den ersten Startskill an. **+ Add skill** aktiviert das Setzen auf leere Hexfelder. **Select / move** erlaubt Auswählen und Verschieben. Freie Fläche ziehen verschiebt die Ansicht.
- **Copy skill** übernimmt den ausgewählten Inhalt als Vorlage. Danach auf freie Hexfelder klicken, um unabhängige Kopien zu setzen; **Esc** beendet den Kopiermodus. Neue IDs, keine übernommenen Verbindungen und kein Einstiegspunkt-Status. Änderungen an Kopien verändern die Vorlage nicht.
- Rechts Spielerbeschreibung, Kosten, Voraussetzungen und Effekte bearbeiten. **Native bonuses** erlaubt mehrere Attribute. Beispiel: **Sprinting Speed**, **Percent of total**, **5** = +5 % Sprinttempo. **Maximum health**, **Flat bonus**, **2** entspricht einem Herz. Basisprozente addieren sich auf den Basiswert; Gesamtprozente können sich miteinander multiplizieren.
- **Technical implementation request** beschreibt Sondermechaniken: Auslöser, Bedingungen, Werte, Dauer, Cooldown, Zurücksetzen. Kann native Boni ergänzen. **Acceptance criteria / edge cases** beschreibt gewünschte Prüfkriterien.
- **Connect**: zuerst Ausgangsskill, dann Zielskill anklicken. **Normal** gilt in beide Richtungen, **Directed** vom ersten zum zweiten, **Exclusive** verhindert gleichzeitige Freischaltung und öffnet keinen Pfad. Für gegenseitig ausschließende Gruppen jedes Paar verbinden. Verbindungen dürfen Felder überspringen.
- **Check plan** zeigt grundlegende Lücken. Das ersetzt keine vollständige Simulation von Freischaltbedingungen und Ausschlüssen.
- Spielerbeschreibungen sind optional und lösen keine Warnung aus. Bei selbsterklärenden Skills wie „10% more experience“ genügt der Name; Beschreibungen erläutern besondere Mechaniken. Fehlende technische Wirkungen werden weiterhin geprüft.
- **Save JSON copy** exportiert eine zusätzliche Sicherung. **Implementation brief** erzeugt das vollständige Umsetzungsdokument. Beide Formate mit **Open plan** wieder öffnen.

## Notizen, Listen und Icons

**Tree design notes** beschreibt die Absicht für den gesamten ausgewählten Baum: Thema, Spielweise, Balancegrenzen, Wechselwirkungen. Beispiel: „Defensiver Schildpfad, Rüstung und Blocken, keine Magieboni“. Diese Notizen sind Vorgaben für die Umsetzung, keine Spielerbeschreibung oder automatische Freischaltbedingung. **Overall design notes** gilt für alle Bäume; **Points / progression** beschreibt Punktevergabe, Grenzen und Zurücksetzen.

Die Skillliste ist immer alphabetisch nach englischer Sortierung angeordnet. Der Filter durchsucht Namen und Spielerbeschreibungen im aktuellen Baum. Trefferzahl und ausdrücklicher Hinweis bei leerem Ergebnis zeigen die Wirkung. Ein Listeneintrag wählt den Skill und zentriert ihn.

**Native bonuses** sortiert sämtliche Attributnamen gemeinsam alphabetisch, unabhängig von ihrer Herkunft.

Der Katalog enthält 50 Einträge: alle 42 Attribute der installierten Pufferfish's Attributes 0.8.3 und acht ausgewählte Vanilla-Attribute. Das ist kein vollständiges Attributinventar des Modpacks. Ars Nouveau, Iron's Spellbooks, Apothic Attributes und weitere Mods besitzen zusätzliche Attribute, die hier noch nicht auswählbar sind. Solche Boni unter **Technical implementation request** beschreiben; vor Umsetzung müssen Registrierung, Spielerzuordnung und Wirkung geprüft werden. Pufferfishs 42 Attribut-IDs wurden am 06.10.2026 erneut gegen die API-Klasse und die englischen Namen der installierten JAR geprüft.

**Color** hat zusätzlich ein Textfeld für **#RRGGBB**. Kopieren und Einfügen funktionieren mit den normalen Tastenkürzeln. Sechs Hexziffern mit oder ohne `#` werden angenommen und vereinheitlicht; Textfeld, Farbwähler und Knotenfarbe bleiben synchron. Unvollständige oder ungültige Texteingaben bleiben im Cache erhalten, während der letzte gültige Farbwert den Knoten färbt. Beide Farbsteuerungen können die Eingabe korrigieren.

**Item icon** bietet 1.333 Vanilla-Items mit englischen Namen; das Filterfeld durchsucht beliebige Teiltexte in Namen und IDs ohne Beachtung der Großschreibung. Beispielsweise findet „SWor“ Iron Sword und Golden Sword. Nicht passende ausgewählte Icons bleiben im Skill erhalten, erscheinen aber nicht als Suchtreffer. Mod-Item-IDs können direkt eingegeben werden. Vorschau und Hexknoten zeigen eine lokale Textur; ohne verfügbare Vorschau bleibt ein Symbol im Knoten. 3D-Blöcke, animierte oder mehrschichtige Items können im Spiel anders aussehen.

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

Der ursprüngliche Schlüssel `trialforged.skill-plan.v1` bleibt kompatibel. `.draft` und `.backup` halten Eingabestand und vorherige gültige Kopie. Beschädigte Einträge werden gegen alternative Kopien geprüft. Mehrere bearbeitende Fenster werden gewarnt, aber nicht zusammengeführt.

Dateiexporte sind Zusatzfunktionen. Cache bleibt an Browser, Profil und Speicherumgebung gebunden. Gelöschte Browserdaten, private Fenster, deaktivierter Speicher, Speichergrenzen oder Verschieben des Editorordners können Wiederherstellung beeinträchtigen. Schreibfehler werden angezeigt. Für unabhängige Sicherungen gelegentlich exportieren.

## Modbezug und Übergabe

Die `.skillplan.md` enthält Spielertexte, technische Aufträge, Positionen, IDs, Verbindungen und die vollständige JSON-Quelle. Codex diese Datei oder ihren Pfad nennen. Änderungen nur am lesbaren Teil beeinflussen Rückimport nicht; maßgeblich ist die eingebettete Quelle.

Der Export ist ein Auftrag, kein fertiges Datapack. Startskills sind verfügbare Einstiegspunkte, keine automatisch kostenlos erworbenen Skills. `exclusive_root` sperrt andere Einstiegspunkte nach erster Wahl; normale Pfade können sie später erreichbar machen. IDs beibehalten, weil Freischaltungen darüber gespeichert werden.

Grundlage vom 06.10.2026: Skills 0.19.1 und Attributes 0.8.3, Minecraft 1.21.1 / NeoForge. Attributregistrierungen und Operationen `add_value`, `add_multiplied_base`, `add_multiplied_total` wurden in installierten JARs geprüft. 5 % ergibt Rewardwert 0.05. Verbindungstypen entsprechen normalen/exklusiven und bidirektionalen/unidirektionalen Gruppen. Gerichtete Ausschlüsse oder andere Ausschlussschwellen als Auftrag beschreiben.

Layout: pointy-top Hexgitter, axial q/r, Radius 52, Mod-x/y gerundet. Farbe ist Editorhilfe. Vor Modumsetzung Bestand erneut prüfen und Item-IDs, Modwechselwirkungen, Rücksetzen, Login und Multiplayer im isolierten Client verifizieren. Tiefe Eingriffe vorab gemäß AGENTS.md klären.

Referenzen: [Definitionen](https://puffish.net/skillsmod/docs/creators/configuration/definition), [Startpunkte](https://puffish.net/skillsmod/docs/creators/configuration/skill), [Verbindungen](https://puffish.net/skillsmod/docs/creators/configuration/connection), [Attribute](https://puffish.net/skillsmod/docs/creators/configuration/rewards/built-in/attribute).

## Prüfung und Wartung

`node --test tests/skill-planner.spec.cjs tests/skill-planner-cache.spec.cjs tests/skill-planner-ui.spec.cjs` führt Modell-, Speicher- und Controllerprüfungen aus, einschließlich Kopiermodus, unabhängiger Boni, Löschabfragen, alphabetischer Attribute, Teiltextsuche und SVG-Iconzuordnung. Controllerprüfungen laden produktive Skripte und ersetzen DOM-/Speicherabhängigkeiten; sie beweisen keine tatsächliche Browserdarstellung.

Auswahlfehler: Pointer-Capture begann bei pointerdown auf der ganzen SVG-Fläche und konnte Klicks vom Skill auf den Canvas umlenken. Capture beginnt jetzt nach der Drag-Schwelle. Frühere Eingaben auf change wurden erst bei Fokusverlust gespeichert; jetzt verwenden sie input mit sofortiger Cache-Schreibung.

Der echte Browserprüflauf unter `tests/skill-planner-browser.cjs` ist um die Regressionen erweitert. Der ursprüngliche Edge-Lauf scheiterte am Browserstart in der eingeschränkten Agentumgebung; der integrierte Browser blockiert file-Seiten. Tatsächliche Darstellung bleibt ungeprüft.

`tests/build-skill-icon-catalog.py <vorhandene-client-jar> tools/skill-planner/icons.js` erzeugt den Katalog aus lokalen Namen, Modellen und Texturen. Keine Downloads oder Installationen. Modkonfigurationen und Weltstände bleiben unberührt.
