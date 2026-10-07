# Gemeinsame Apotheosis-Magieboni

Stand: 06.10.2026. Umsetzung des [Implementationsplans](magic-attribute-unification-plan.md). Der Nutzer hat In-place-Overrides ausdrücklich bestätigt: Die bisherigen Gem-/Affix-IDs bleiben erhalten, vorhandene Items dürfen die neuen Boni erhalten. Keine Inventarmigration und keine Modinstallation.

## Wirkung

| Bonus auf Gems/Affixen | Umsetzung |
|---|---|
| Ars-Schadenspunkte | Gleiche Punkte auf `puffish_attributes:magic_damage`, `add_value`. |
| Ars-/Iron's-Schadensprozente, Lodestone-Proficiency | Gleiche Zahlen auf Pufferfish, `add_multiplied_base`; gewöhnliche Ausrüstungsprozente addieren sich. |
| Max Mana | Ein nativer Multi-Bonus auf beide Ars-/Iron's-Attribute. Feste Punkte unverändert, Prozentboni als `add_multiplied_total`. |
| Prozentregeneration | Ein Multi-Bonus auf beide nativen Raten/Faktoren, `add_multiplied_total`. Ein fester Iron's-Faktorzuschlag wird ebenfalls als gleich großer Prozentzuschlag behandelt. |
| Feste Ars-Regeneration | Native Rate, mit `Ars` gekennzeichnet. Keine zustandsabhängige Umrechnungsformel. |
| Schulen, Warding, Casttempo, Malum usw. | Native Mechanik und Werte; kurze Kennzeichnungen. |
| Kaelos-Resonanz | Native Familien-/Schwellenmechanik, mit kurzem Herkunftshinweis. Reguläre Sockelboni sind vereinheitlicht, Resonanzen bleiben spezialisiert. |

Pufferfish besitzt hier keinen gemeinsamen Manavorrat. Der gemeinsame Bonus erhöht zwei getrennte Vorräte. Prozentregeneration wirkt auf die native Ars-Rate und den Iron's-Faktor; Iron's erhält durch mehr Max Mana zusätzlich mehr absolute Regeneration. Exakte gleiche Nachfüllzeiten sind kein Balanceziel.

Die vorhandene Ars-Schadenskurve bleibt unverändert, einschließlich +125 % beim perfekten Mana-Gem. Der Grundschaden wird bewusst mitverstärkt. Ein Beispiel mit 20 Grundschaden, +5 Punkten und +20 % ergibt 30 Schaden vor Abwehr. Zwei solche Basisprozente ergeben 35; zwei eigenständige Gesamtmultiplikatoren ergeben 36. Für normale umgestellte Ausrüstungsboni wird die additive Prozentachse verwendet; Pufferfish unterstützt weiterhin native Gesamtmultiplikatoren aus anderen Quellen.

Gemeinsamer Schaden wirkt auf von Pufferfish erkannte Magietreffer mit lebendem Verursacher. Besitzerlose Quellen und eigene Schadensattribute von Beschwörungen werden nicht künstlich dem Spieler zugerechnet. Feste Punkte können pro Treffer, Ziel und Schadensaufruf wirken, auch bei einem qualifizierten Null-Schadensaufruf. Iron's allgemeine Zauberkraft wird für diese Ausrüstungsboni zu Schaden; die bisherige Mitverstärkung von Heilzaubern entfällt. Spezialisierte Schulkraft und gewöhnliche Modausrüstung bleiben nativ.

## Ressourcen und Updates

- [Gemeinsame Transformation](../kubejs/startup_scripts/magic_bonus_unification.js): Werte aus den tatsächlich geladenen Modressourcen lesen; bekannte Attribute/Operationen umwandeln; unbekannte Bonusfelder und konkurrierende Attributpaare zurückweisen.
- [Servergenerierung](../kubejs/server_scripts/magic_bonus_unification.js): native Bedingungen auswerten, kompatible Overrides in KubeJS `after_mods` erzeugen und die geladene Apotheosis-Registry prüfen.
- [Clientbeschreibungen](../kubejs/client_scripts/magic_bonus_unification.js): Übersetzungen aus derselben Transformation erzeugen; modabhängige Affixe/Sockeleffekte mit Herkunftszeilen kennzeichnen.

Keine festen Kopien der Mod-JSONs, Dateinamen oder Qualitätskurven werden produktiv gepflegt. Der Leser verwendet NeoForges native Ressourcenpakete und Minecraft-Reader; auch eingebettete Modressourcen können dadurch erfasst werden. Kaelos-Varianten werden anhand ihrer nativen Bedingungen ausgewählt. Neue Werte und neue Definitionen mit denselben bekannten Attributen/Formaten werden bei Neustart übernommen. Mehrere Mods mit derselben Ressource sind mehrdeutig: dann wird kein eigener Override erzeugt.

Vor Ausgabe werden die generierten Multi-Bonusstrukturen mit den installierten nativen Codecs geprüft. Ihre Wertmaps sind für diese Strukturprobe leer, weil Apotheosis-Seltenheiten während KubeJS-Datengenerierung noch nicht gebunden sind. Tatsächliche Zahlen bleiben unverändert und werden regulär durch Apotheosis geladen; die Nachprüfung meldet fehlende Definitionen. Unbekannte Eingabeformate, Operationen, Zielattribute oder Bedingungen lassen die betroffene Umwandlung aus. Die originale Moddefinition bleibt dann maßgeblich.

Logpräfixe sind `[Trialforged magic]` und `[Trialforged magic UI]`. Meldungen nennen Ressourcen-ID, Quellmod samt Version, Fehlergrund und Prüfwerkzeug. Wiederholte gleiche Serverfehler werden zusammengefasst. Ein Clientfehler behält den nativen Tooltip und wird einmal je Scriptladung protokolliert. Fehler in den Originalressourcen einer Mod können weiterhin deren eigenen Loader betreffen; diese Integration repariert solche Fremdfehler nicht.

Semantische Änderungen in Java-Code lassen sich nicht vollständig durch JSON- oder Codecprüfungen erkennen. Insbesondere Änderungen der Pufferfish-Rechenformel, der Schadenstags, der Manaformeln oder der Kaelos-Resonanz benötigen nach Updates einen erneuten Laufzeittest. Höher priorisierte Welt-/Benutzerdatapacks dürfen die generierten Mod-Overrides nativ überschreiben. Eine Registry-Anwesenheitsprüfung allein beweist keine wirksame Priorität; die Laufzeitproben prüfen dafür ausgewählte tatsächlich geladene Definitionen.

Nach Modupdates vollständig neu starten. Ein Datapack-Reload erzeugt die Serverdaten erneut; Startup-Code, Clientübersetzungen und bereits angelegte Ausrüstungs-Caches werden dadurch nicht als vollständiger Neustart ersetzt.

## Tooltips

Gemeinsame Gem-Beschreibungen fassen native Attributpaare zu einem angezeigten Bonus mit `Ars + Iron's` zusammen. Zahlen, Operationen und Lokalisierung der Attributkomponenten stammen weiter aus den Mods. Spezialisierte Attribute erhalten `Ars`, `Iron's` oder `Malum`. Lodestone-Zusatzschaden trägt `on hit`, seine Resistenz `magic hits`, weil diese Mechaniken keinen einzelnen Zaubermod voraussetzen.

Auf Ausrüstung können Grunditem- und Affixattribute gemeinsam dargestellt werden. Daher zusätzliche Herkunftszeilen für die tatsächlich vorhandenen Apotheosis-Affixe verwenden, statt aggregierte Attributnamen global umzubenennen. Gewöhnliche Moditems ohne Apotheosis-Boni erhalten keine Zusatzzeilen. Native Sockel-Statuseffekte, modgebundene Verzauberungen und Kaelos-Resonanzen erhalten gesonderte Hinweise. Bei gesockelten Gems zählt der tatsächlich gewählte Bonus; lose Gems zeigen ihre möglichen Bonusquellen.

## Prüfung

- [Vertragstests](../tests/check-magic-bonuses.cjs): Produktionsumwandlung mit dem belegten Inventar; feste Punkte, Prozentoperationen, unveränderte Kurven, gekoppelte Werte, unveränderte Eingaben und Zurückweisung inkompatibler Formate.
- [Native Serverprobe](../tests/runtime-magic-probe.js): geladene Gem-/Affixdefinitionen, kontrollierte Ars-/Iron's-Schadensquellen, reale Sockelmodifier und Ausrüstungswechsel für beide Mana-/Regenattribute.
- [Native Clientprobe](../tests/runtime-magic-client-probe.js): normale/erweiterte Tooltips aus dem tatsächlichen Client und Herkunftszeilen für Affixausrüstung.
- [Laufzeitworkflow](runtime-validation.md): stummer isolierter Client, keine Mausübernahme, keine Änderung der Originalwelten. Der reguläre Prüflauf verlangt zusätzlich beide Magie-Ergebnisdateien.

Aktueller Bestand: 228 passende zugelassene Definitionen mit 49 unterschiedlichen Magieattributen. Davon werden 147 native Definitionen umgewandelt; übrige Spezialmechaniken behalten ihre Codecs und werden bei Darstellung gekennzeichnet. Snapshot, Originaldefinitionen und Werte stehen im [Inventar](magic-bonus-inventory-2026-10-06.json).

Die Erfassung umfasst `gems`, `affixes` und die eigene Apotheosis-Registry `extra_gem_bonuses`. Letztere ergänzt Gems etwa um Curios-, Malum-Stab- oder Sensenboni. Sie enthält 88 relevante Definitionen; die ursprüngliche Analyse hatte dieses Verzeichnis übersehen. Auch der zusätzliche perfekte Mana-Gem-Bonus für Curios ist nun +25 Mana für beide Systeme.

Abschließender isolierter Clientlauf vom 06.10.2026, 22:12–22:15 Uhr: 147 Overrides erzeugt, keine inkompatible Ressource ausgelassen, 147 Definitionen in den nativen Registries vorhanden. Alle 33 Serverprüfungen bestanden: Ars-/Iron's-Schadensformel, reale Sockelmodifier, native Zusatzbonuspaarung und Anlegen/Ablegen ohne Mana-/Regenerationsreste. Clientprüfungen für normale und erweiterte Gem-Tooltips, Affixherkunft, Curios +25 Mana für beide Systeme, Malum-Verzauberungshinweise und gewöhnliche Ars-Rüstung bestanden. Die Vertragstests und die bestehenden Packprüfungen bestanden ebenfalls.

Zwei tatsächlich verbundene Netzwerkspieler, alle Einzelzauber/Projektile, Tod, Dimensionswechsel und die vollständige Resonanzmatrix sind eigenständige offene Abnahmen. FakePlayer- und integrierte Serverprüfungen ersetzen diese nicht. Absolute Nachfüllzeiten und vollständige Builds wurden nicht gemessen; die Aussage zur groben Balance beruht auf erhaltenen Kurven und geprüfter Stapelrechnung.
