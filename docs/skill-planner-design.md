# Skill Studio: kompakte Arbeitsoberfläche

## Auftrag, Zielgruppe und Qualitätsmaßstab

Modpack-Autoren planen wiederkehrende Boni an vielen Stellen eines Skillbaums. Die Oberfläche soll den Zusammenhang zwischen gemeinsamem Skillinhalt und einzelnen Knoten zeigen, ohne Anleitungen dauerhaft über die Arbeitsfläche zu legen. Vorhandene englische Begriffe, lokale Bedienung, Hexgitter und Nutzerdaten bleiben erhalten. Der Auftrag und die berichteten Platzprobleme reichen als Grundlage für diese risikoarme Oberflächenüberarbeitung.

## 1. Visuelles System

Die bestehende dunkle Werkbank bleibt erhalten: grünliche Akzente für Auswahl und Aktionen, helle Texte und deutlich rote ungültige Eingaben. Systemschrift und lokale Itemtexturen benötigen kein Netzwerk. Ein 64-Pixel-Kopf und kompakte Seitenflächen geben der eigentlichen Planung mehr Platz. Desktopspalten trennen Bibliothek, Grid und Bearbeitung; kleinere Ansichten ordnen den Inspector unter das Grid ein.

## 2. Bedeutung der Zeichen

Der Hexknoten repräsentiert eine Instanz; sein Itemicon vermittelt die Art des Skills. Die Bibliothek repräsentiert gemeinsamen Inhalt und nennt die Instanzzahl. „Shared skill“ und „Selected instance“ unterscheiden gemeinsame Inhalte von Position, Einstiegspunkt und Verbindungen. Rot steht ausschließlich für eine zu korrigierende Eingabe. Farbcodes bleiben vom Nutzer gewählte Editorhilfen.

## 3. Gliederung

Links stehen Planname und Baumauswahl kompakt oberhalb der Bibliothek. Zusätzliche Planvorgaben liegen hinter „Plan & tree settings“. Rechts sind Name, Icon, Farbe und Boni direkt zugänglich; Beschreibung, Sondermechanik, Voraussetzungen und Instanzdaten haben getrennte aufklappbare Abschnitte. So bleibt der häufigste Ablauf kurz: auswählen, Bonus ändern, weitere Instanz setzen.

## 4. Unterstützende Details

Bibliothekszeilen verwenden kleine Farbmarken, einen Namen und eine knappe Instanz-/Kostenzeile. Die Liste wächst in die verbleibende Seitenhöhe, statt durch dauerhaft sichtbare Hilfetexte verdrängt zu werden. Das Icon-Dropdown enthält den Filter direkt, zeigt Vorschauen und unterstützt Tastaturauswahl. Kurze Statusmeldungen und Tooltip-Titel ersetzen lange Absätze. Hilfe bleibt abrufbar; fachliche Erläuterungen stehen in der Projektanleitung.

## 5. Zusammenspiel

Das Grid bleibt die größte Fläche. Mehrere Knoten desselben Skills sind sichtbar, während die Bibliothek diesen Namen nur einmal zeigt. Wiederholtes Anklicken führt zur nächsten Instanz. Gemeinsame Änderungen erscheinen sofort auf allen Knoten; die Anzeige nennt die planweite Instanzzahl. Eine Namenskollision wird direkt am Feld erläutert. Die neue normalisierte Speicherung verhindert auseinanderlaufende Kopien.

## 6. Prüfung und Grenzen

Codeprüfung bestätigt die Ursache der alten Listengröße: umfangreiche feste Inhalte und Hilfe beanspruchten die linke Spalte, während die Liste keine verbleibende Flexhöhe erhielt und zusätzlich auf 35 vh begrenzt war. Die neue Bibliothek erhält Flexhöhe, kompakte Zeilen und eingeklappte Zusatzfelder. Modell- und Controllerprüfungen belegen gemeinsame Bearbeitung, Migration, Namenssperre und Combo-Verhalten. Das ist kein Beleg für reale Pixelmaße oder Browser-Fokusverhalten. Ein tatsächlicher Rendervergleich bleibt wegen der bereits festgestellten Browserbeschränkung offen; der Browserprüfplan erfasst normale und schmale Ansichten. Visuelle Abnahme insbesondere bei 1366×768 und erhöhter Browser-Zoomstufe nachholen.
