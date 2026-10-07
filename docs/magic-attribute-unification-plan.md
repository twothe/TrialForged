# Implementationsplan: gemeinsame Magieboni auf Apotheosis-Gems und -Affixen

Stand: 06.10.2026. Status: native Umsetzung beauftragt und umgesetzt; technische Analyse und ursprüngliche Empfehlungen folgen unten. Maßgeblicher aktueller Stand: [Implementierung und Prüfung](magic-attribute-unification.md). Der Nutzer hat die bisherigen IDs samt Wirkung auf vorhandene Items ausdrücklich bestätigt. Eigene Modinstallation, Attributspiegelung und tiefe Kampfeingriffe bleiben ausgeschlossen.

## Ziel und Umfang

Apotheosis-Gems und -Affixe sollen verständliche, möglichst gemeinsam nutzbare Boni für Schaden, maximales Mana und Manaregeneration erhalten. Feste Schadenspunkte und Prozentboni bleiben unterschiedliche Bonusarten. Andere Magieboni erhalten kurze Wirkungskennzeichnungen: `Ars`, `Iron's`, `Malum`; bei tatsächlich modübergreifender Mechanik eine Wirkungsbeschreibung.

Normale Moditems, Skills, Rezepte, Zauberformeln, Manaverbrauch und persönliche Progression sind nicht Bestandteil der Umstellung. Ein auf einer Modrüstung vorhandener Apotheosis-Bonus ist allerdings weiterhin betroffen. Multiplayer, Ausrüstungswechsel, Wiederbeitritt und Persistenz gehören zur Abnahme.

### Bestätigte Balancevorgabe des Nutzers

Trialforged soll starke Charakterentwicklung bis in absurde Wertebereiche ermöglichen. Hohe Schadenswerte und starke Bonuskombinationen sind beabsichtigt. Kleine Unterschiede zwischen den Magiesystemen und fehlende mathematische Gleichwertigkeit sind akzeptiert, solange die Umstellung nicht einseitig vollständig eskaliert oder technische Fehler erzeugt.

Ars-Prozentboni werden mit ihren vorhandenen Zahlen und Qualitätskurven auf Pufferfish übernommen. Keine neue Kurve, Referenzkalibrierung oder vorsorgliche Absenkung dieser Werte. Der native Grundschaden darf mit verstärkt werden; er ist bei sehr hohen Schadenszuschlägen relativ klein. Dies ist eine bewusste Änderung des Wirkungsbereichs. Die Zahlen 5 Grundschaden und 1.000 Bonusschaden aus dem Gespräch illustrieren das gewünschte Verhältnis, sie sind keine einzustellenden Packwerte.

Balanceprüfung bedeutet einen groben Vergleich repräsentativer Builds und Mechaniken. Keine exakte Angleichung von Schaden, Manavorräten oder Nachfüllzeiten zwischen Mods verlangen. Weiterhin Fehler verhindern: Doppelanwendung desselben Bonus, Bonusreste, Endlosschleifen, ungültige Werte, falsche Spielerzuordnung oder irreführende Tooltips. Gewolltes natives Stapeln und hohe Werte sind für sich genommen keine Fehler.

## Belegstand und reproduzierbarer Bestand

- [Bestandssnapshot](magic-bonus-inventory-2026-10-06.json): vollständige passende Definitionen mit Attributen, Operationen, Werten, Ressourcenpfaden und SHA-256 der Quellen.
- [Prüfwerkzeug](../tests/inspect-magic-bonuses.py): liest installierte JARs ohne Änderungen an Spielressourcen. Benötigt Python 3.11 oder neuer, keine zusätzlichen Pakete.
- Geprüfte Kernversionen: Apotheosis 8.9.0, Pufferfish's Attributes 0.8.3, Ars Nouveau 5.13.3, Iron's Spells 'n Spellbooks 3.16.3, Lodestone 1.8.2, Malum 1.8.2.
- Bonusquellen: Apothic Compats 0.2.5.5, Iron's Apothic 2.2.6, Kaelos Gems 1.2.0, Kaelos Curios 1.0.1 und Ace's Spell Utils 1.2.7.3.
- Erweiterter Snapshot: 228 nach den geprüften Bedingungen zulässige Magiedefinitionen, davon 27 Gems, 113 Affixe und 88 native `extra_gem_bonuses`, mit 49 unterschiedlichen Magieattributen. 180 weitere Definitionen sind durch geprüfte Bedingungen ausgeschlossen. Es gibt keine unbekannte Bedingung im erfassten zulässigen Bestand. Die ursprüngliche Analyse mit 140 Definitionen übersah die separate Zusatzbonus-Registry; diese ist nun erfasst und umgesetzt.
- Kaelos-Konfiguration: Häufigkeit `RARE`, Mindestqualität `COMMON`, Resonanz aktiv, Schwellen 3/5. Es zählt daher je Familie die Variante `_rare_common`, nicht jede der neun gelieferten Varianten.
- Die Bedingungen werden statisch ausgewertet. Der Snapshot belegt weder das erfolgreiche Laden aller Ressourcen noch die tatsächlich aktiven Weltdatapacks. Weltlokale Packs, externe Ressourcenpriorität, eingebettete Mods und im Java-Code erzeugte Boni sind keine vollständigen Bestandteile dieses Inventars.

Erneute Bestandsaufnahme vor Umsetzung:

```powershell
& 'C:\Users\Two\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' tests/inspect-magic-bonuses.py --output docs/magic-bonus-inventory-2026-10-06.json
```

Wenn der Bestand später geändert wurde, einen neuen datierten Snapshot erstellen und diesen Plan entsprechend aktualisieren. Weltlokale Daten und wirksame Serverkonfigurationen zusätzlich prüfen; die Instanzkonfiguration allein ist nicht maßgeblich für jede vorhandene Welt.

## Nachgewiesene Mechanik

### Pufferfish-Schaden

`puffish_attributes:magic_damage` ist ein dynamisches Attribut. In der installierten Version berechnet `DynamicModificationImpl.applyTo` den Schaden aus den tatsächlich vorhandenen Modifikatoren. Der normale Attributwert ist kein verlässlicher Messwert: `EntityAttributeInstanceMixin` liefert für dynamische Werte `NaN`; direkte Änderungen des Basiswertes sind kein Ersatz für echte Modifikatoren.

`LivingEntityMixin.modifyVariableAtDamage` verändert das Schadensargument am Anfang von `LivingEntity.hurt`, bevor die reguläre Verarbeitung einschließlich Schadensminderung folgt. Es verlangt einen lebenden Verursacher aus `DamageSource.getEntity`. Projektile mit korrekt eingetragenem Besitzer können profitieren; eine Schadensquelle ohne lebenden Besitzer erhält keinen Spielerbonus. Für Beschwörungen wird deren eigenes Magieattribut gelesen, nicht automatisch das des Besitzers. Für besitzbare Kreaturen gibt es zusätzlich den separaten Pufferfish-Bonus `tamed_damage` des Besitzers.

`DamageKind.isMagic` erkennt Vanilla-Magie und die Tags `c:is_magic`/`neoforge:is_magic`. Ars liefert passende Einträge für spell, frost, flare, crush und windshear; Iron's für seine neun Kernschulen. Das belegt die statische Erkennung, nicht jeden Zauber, jede Erweiterung oder jeden Schaden über Zeit.

Für ausschließlich positive Schadensboni, vor anschließender Begrenzung:

```text
D1 = D0 + Summe(feste Zuschläge)
D2 = D1 * (1 + Summe(add_multiplied_base))
D3 = D2 * Produkt(1 + jeder add_multiplied_total)
```

Wichtig: Auch `add_multiplied_base` arbeitet bei diesem dynamischen Attribut auf dem bereits um feste Zuschläge erhöhten Schaden. Die tatsächliche Formel ist im installierten Bytecode belegt; nicht aus der gewöhnlichen Minecraft-Basiswertformel ableiten. Weitere gleichzeitig beteiligte Pufferfish-Attribute werden im selben Rechenlauf verarbeitet.

Beispiele: 20 Schaden + 5 Punkte + 20 % ergibt 30. Zwei Basisprozentboni von 20 % ergeben mit denselben 5 Punkten 35; zwei Gesamtmultiplikatoren von 20 % ergeben 36. Ein Punkt Schaden entspricht einem halben Herz, bevor Schadensminderung folgt.

Empfehlung: gewöhnliche Ausrüstungsprozente künftig als `add_multiplied_base` additiv stapeln. `add_multiplied_total` bleibt für ausdrücklich als eigene Multiplikatoren entworfene Boni unterstützt. Das präzisiert die frühere Chat-Skizze, die Gesamtmultiplikatoren pauschal vorgeschlagen hatte. Nicht still alle vorhandenen Operationen ersetzen: pro Bonus eine Umrechnungsentscheidung dokumentieren.

### Ars-Schaden

`PerkAttributes.SPELL_DAMAGE_BONUS` hat Basiswert 0. `IDamageEffect.attemptDamage` addiert dessen aktuellen Wert zur Schadensmenge und löst anschließend das Ars-Schadensereignis aus. Feste Ars-Punkte sind daher grundsätzlich passende Kandidaten für feste Pufferfish-Punkte, aber der Zeitpunkt relativ zu Ars-Ereignislistenern und Zusatzeffekten ändert sich.

Die vorhandenen Ars-Prozentboni multiplizieren diesen Zuschlag. Ohne einen festen Zuschlag bleibt 0 * 1,2 = 0. Ein Wechsel auf Pufferfish macht daraus einen Multiplikator auf den gesamten Treffer. Das ist eine reale Balanceänderung; gleiche Tooltipprozente sind keine wirkungsgleiche Umrechnung.

Der Nutzer akzeptiert diesen Unterschied ausdrücklich: Zahlenwerte und Qualitätskurven bleiben erhalten. Der Zaubergrundschaden ist bereits Teil des eintreffenden Schadens D0 und wird nicht nochmals als zusätzlicher Pufferfish-Modifikator angelegt.

### Iron's-Schaden

`AbstractSpell.getSpellPower` kombiniert allgemeinen Zauberkraftfaktor, Schulfaktor, Zauberlevel und Zauberkonfiguration. Der allgemeine Faktor ist keine ausschließlich für Schaden reservierte API. `HealSpell.onCast` verwendet ihn nachweislich für seine Heilmenge. Die Umstellung eines Gems auf Pufferfish entfernt deshalb dessen Unterstützung dieser skalierenden Heilung und gegebenenfalls weiterer Zauberwirkungen.

Ein bisheriger Bonus p auf die allgemeine Basiszauberkraft P wirkt bei anderen vorhandenen Zauberkraftboni S vereinfacht wie `P + S + p*P`. Ein nachgeschalteter Schadensbonus wirkt wie `(P + S)*(1+p)`. Bei P=1, S=1 und p=0,2 stehen 2,2 gegen 2,4. Selbst unveränderte 20 % sind für einen ausgebauten Charakter nicht wirkungsgleich. Festgelegte Castwerte und später nachgelesene Attribute müssen getrennt getestet werden.

### Mana und Regeneration

Pufferfish 0.8.3 registriert weder maximales Mana noch Manaregeneration. Keine erfundenen `puffish_attributes:max_mana`-/`mana_regen`-IDs verwenden. Für diese beiden Ziele ist eine gemeinsame Bonusdefinition mit zwei nativen Attributen die einfachste Lösung.

Ars `ManaUtil.calcMaxMana` setzt den aus Konfiguration, Buchstufe und Glyphen berechneten Vorrat als nativen additiven Modifikator ein. `getManaRegen` macht dasselbe mit der berechneten Regenerationsrate. Beide Attribute starten selbst bei 0. Iron's maximales Mana startet bei 100, sein Regenerationsattribut bei 1 und ist ein Faktor. Ars-Regeneration ist eine Rate; Iron's `+0,5` auf diesen Faktor ist nicht `+0,5 Mana/s`.

Zusätzlicher belegter Balanceunterschied: Iron's `MagicManager.regenPlayerMana` regeneriert je Intervall `MaxMana * Regenfaktor * 0,01 * Configmultiplikator`. Mehr Max Mana erhöht damit bereits die absolute Regeneration. Ars berechnet seine Rate separat aus Buchstufe, Glyphen und Konfiguration. Ein gemeinsamer Bonus mit +20 % Mana und +20 % Regeneration erhöht Iron's absolute Regeneration bei isolierter Betrachtung um 44 %, Ars' Rate um 20 %. Gemeinsame Tooltipzahlen garantieren daher keine identische Nachfüllzeit oder Stärke.

Ein gleicher prozentualer Max-Mana-Bonus muss daher auf den effektiven Vorrat wirken: `add_multiplied_total` auf beide nativen Attribute. `add_multiplied_base` auf Ars mit Basiswert 0 würde nicht den errechneten Vorrat erhöhen. Für gemeinsame Regenerationsprozente gilt dasselbe. Mehrere solche Gesamtmultiplikatoren multiplizieren sich; bei diesen beiden Bonusarten ist das ohne neue Integrationsschicht die bewusste native Stapelregel.

Apotheosis bietet bereits:

- Gems: `apotheosis:multi_attribute`, mit `gem_class`, `modifiers` und `desc`.
- Affixe: `apotheosis:multi_attr`, mit `definition`, `categories`, `modifiers` und `desc`.
- Jedes Element in `modifiers` enthält `attribute`, `operation` und `values`. Gemwerte sind nach Purity, Affixwerte nach Rarity/StepFunction definiert. Alle Affixmodifikatoren benötigen dieselbe Menge unterstützter Raritäten und verwenden denselben Affix-Level für ihren Wurf.

Nicht zwei gewöhnliche Gem-Boni für dieselbe Kategorie nebeneinander eintragen: `Gem` bildet die Kategorien auf einen Bonus ab; ein späterer Eintrag ersetzt den früheren im Laufzeitpfad. Stattdessen vorhandene Multi-Boni erweitern oder einen Multi-Bonus bilden. Kaelos benutzt diesen nativen Typ bereits.

## Zielzuordnung und Wertentscheidungen

| Bestehender Bonus | Empfohlenes Ziel | Behandlung der Werte |
|---|---|---|
| Ars feste Spell Power | Pufferfish Magic Damage, `add_value` | Zunächst Punkte beibehalten; Ereignisreihenfolge und Mehrfachtreffer prüfen. |
| Ars prozentuale Spell Power | Pufferfish Magic Damage, gewöhnlich `add_multiplied_base` | Vorhandene Zahlen und Qualitätskurven unverändert übernehmen; Verstärkung des Grundschadens ist akzeptiert. |
| Iron's allgemeine Spell Power | Pufferfish Magic Damage, gewöhnlich `add_multiplied_base` | Vorhandene Prozentkurve übernehmen; Verlust der Heilskalierung dokumentieren, Stapeln auf grobe Ausreißer prüfen. |
| Beide Max-Mana-Attribute, feste Punkte | Ein Multi-Bonus, `add_value` auf beide | Gleiche Punktezahl ist verständlich, aber nicht gleicher Nutzen. Anfangswerte pro Familie erhalten und gegen Vorräte/Kosten prüfen. |
| Max Mana, prozentual | Ein Multi-Bonus, `add_multiplied_total` auf beide | Prozentkurve kann zunächst bleiben; Stapelregel und Ars-Rundung prüfen. |
| Beide Regenerationsattribute, prozentual | Ein Multi-Bonus, `add_multiplied_total` auf beide | Prozentwert als Kandidat erhalten; Ars-Basis muss schon nativ berechnet sein. |
| Ars Regeneration, feste Rate | Optional Umgestaltung zu gemeinsamem Regenerationsprozentbonus | Keine feste zustandsunabhängige Umrechnung; getrennt neu bewerten. Sonst `Mana Regen (Ars)` behalten. |
| Ars Mana-Regen-Statuseffekt | Native Mechanik mit Zusatz `Ars` | Keine Umleitung nur durch Attributtausch. |
| Schulspezifische Iron's-/Ace's-Attribute, Cooldowns, Casttempo, Summon Damage | Native Attribute, Zusatz `Iron's` | Werte und Mechanik erhalten. |
| Lodestone Magic Proficiency | Zusätzlicher Kandidat für Pufferfish Magic Damage, `add_multiplied_base` | Schon modübergreifend; Prozentkurve zunächst übernehmen, separate Stapelachse und Eingriffszeitpunkt ändern sich. Nach der Kernprobe entscheiden. |
| Warding, Malum-Funktionen, Lodestone-Zusatztreffer/-Resistenz | Native Attribute, kurze wahre Wirkungsbeschreibung | Keine Umwandlung in allgemeinen Zauberschaden oder allgemeine Resistenz. |

Die gemeinsame Schadensanzeige sollte `Magic Damage` heißen: Der Pufferfish-Bonus erfasst getaggten Magieschaden, nicht ausschließlich Zauber. `Spell Damage (all mods)` würde ungetaggte oder besitzerlose Quellen und Beschwörungen zu weitgehend versprechen. Gemeinsame Manaanzeigen dürfen `Max Mana (Ars + Iron's)` und `Mana Regen (Ars + Iron's)` lauten; es wird kein gemeinsamer Manapool eingeführt.

### Konkrete Ausgangswerte und Kandidaten

Die Reihenfolge der Gemwerte lautet cracked/chipped/flawed/normal/flawless/perfect. Die Übernahme der vorhandenen Ars-Prozentkurven ist als Planentscheidung bestätigt. Für übrige Boni bleiben vorhandene Zahlen ebenfalls der Ausgangspunkt; technische Umrechnung unterschiedlicher Einheiten und Ausnahmen werden separat ausgewiesen. Die Umsetzung wurde anschließend beauftragt; aktuelle Entscheidungen und Ergebnisse stehen in der verlinkten Implementationsdokumentation.

| Familie/Bonus | Belegter Bestand | Vorschlag |
|---|---|---|
| Kaelos Glyph of Power, Waffe | Ars feste Punkte: 0,3 / 0,525 / 0,75 / 1,05 / 1,5 / 2,025 | Dieselben festen Punkte auf Pufferfish; Erweiterung auf andere Magie bleibt ein Buff. |
| Kaelos Glyph of Power, Helm | 0,15 / 0,3 / 0,45 / 0,675 / 0,9 / 1,2 | Punkte erhalten. |
| Kaelos Glyph of Power, übrige Rüstung | 0,15 / 0,225 / 0,3 / 0,45 / 0,6 / 0,825 plus Ars Mana | Schaden umstellen; Mana als Paar erweitern, nicht Nebenbonus entfernen. |
| Golem's Onyx, Iron's-Stab/-Buch | 1 / 2 / 4 / 6 / 8 / 10 % allgemeine Zauberkraft | Dieselbe Prozentkurve auf Pufferfish als erster Testkandidat. |
| Kaelos Archon Focus, Waffe | 3,75 / 6 / 9 / 12,75 / 18 / 23,25 % allgemeine Zauberkraft plus Evocation | Nur allgemeinen Anteil umstellen; Schule bleibt `Iron's`. Kumulation prüfen. |
| Ars-Mana-Gem, Beine/Stiefel | 15 / 25 / 30 / 45 / 75 / 125 % auf Ars-Schadenszuschlag | Unverändert 15 / 25 / 30 / 45 / 75 / 125 % auf Pufferfish übernehmen. Keine Absenkung auf die Onyx-Kurve. |
| Ars Curio-Affix Spell-Damaged | common 1–2 %, mythic 5–6 % auf Ars-Zuschlag | Vorhandenes Zahlenband übernehmen; keine Kalibrierung zur bisherigen Zuschlagswirkung. |
| Kaelos Manaheart, Mana | 48 / 90 / 150 / 210 / 300 / 420 Punkte Iron's | Zunächst beide Vorräte mit dieser Kurve prüfen, kein automatischer Endwert. Vergleich mit Source Heart erforderlich. |
| Kaelos Source Heart, Mana | 12 / 21 / 30 / 42 / 57 / 75 Punkte Ars | Beide Vorräte als Paar; Familien dürfen unterschiedliche Stärken behalten, wenn Nebenboni und Seltenheit dies rechtfertigen. |
| Kaelos Source Heart, Rüstungsregeneration | +0,3 / 0,45 / 0,675 / 0,9 / 1,2 / 1,5 Ars-Rate | Entweder als Ars-Spezialbonus belassen oder neue Prozentkurve wählen. |
| Kaelos Manaheart, Rüstungsregeneration | 6 / 10,5 / 15 / 21 / 28,5 / 37,5 % Iron's-Faktor | Kandidat für beide nativen Raten/Faktoren als Gesamtmultiplikator. |

Für eine feste Ars-Regenerationsrate r ist `p_neu = r / R_Referenz` lediglich eine Referenzkalibrierung. Die lokale Ars-Grundlage beträgt laut Instanzkonfiguration 5 plus Buchstufe*1 plus Glyphen*0,33, bevor weitere Einflüsse folgen. +1,5 entsprechen bei Rate 5 etwa 30 %, bei Rate 15 nur 10 %. Die tatsächlich wirksame Weltkonfiguration und Ausrüstung bestimmen den Referenzzustand.

Die Regenerationsformel erklärt einen Einheitenunterschied; sie ist kein Auftrag zur exakten Feinregulation. Eine einfache, grob passende Umgestaltung oder der gekennzeichnete native Spezialbonus genügen.

Repräsentative frühe und weit entwickelte Builds grob vergleichen, ergänzt um eine besonders trefferdichte Mechanik. Treffer-/Castschaden und Mana-/Regenerationswirkung dienen zum Erkennen einseitiger Eskalation, nicht zur Angleichung aller Systeme. Nur bei deutlichen Problemen weiter vermessen oder Werte verändern. Unterschiedliche Gemfamilien dürfen deutlich verschiedene Stärken behalten. Feste Punkte nicht auf +5 aufrunden, nur weil dies im Chat ein Beispiel war.

### Vollständige Auswahl der sechs allgemeinen Attribute

Die JSON-Quelle enthält sämtliche Slots, Nebenboni, Operationen und Qualitätskurven. Zu bearbeiten sind insbesondere:

- Ars-Schaden: `apothic_compats:ars_nouveau/mana`, `kaelos_gems:kaelos/glyph_of_power_rare_common`, `apothic_compats:curios/attribute/spell_damaged`.
- Iron's-Schaden: `irons_apothic:core/golems_onyx`, `kaelos_gems:kaelos/archon_focus_rare_common`, `irons_apothic:elemental/school_none/attribute`, `kaelos_curios:jewelry/attribute/attuned`.
- Ars-Max-Mana: zusätzlich `kaelos_gems:kaelos/source_heart_rare_common`, `apothic_compats:armor/attribute/mana`, `apothic_compats:curios/attribute/mana`.
- Iron's-Max-Mana: `irons_apothic:core/void_umbalite`, `irons_apothic:external/sirens_aquamarine`, `kaelos_gems:kaelos/manaheart_rare_common`, `irons_apothic:magic_weapons/attribute/capacity`, `kaelos_curios:jewelry/attribute/wellspring`.
- Ars-Regeneration: Mana-Gem, Source Heart und `apothic_compats:curios/attribute/regenerative`.
- Iron's-Regeneration: Siren's Aquamarine, Manaheart, `irons_apothic:magic_weapons/attribute/restorative`, `kaelos_curios:jewelry/attribute/flowing`.

Zusätzlicher sinnvoller Schadenskandidat: die beiden Magic-Proficiency-Affixe `apothic_compats:armor/attribute/adept` und `apothic_compats:curios/attribute/adept`. Diese können nach derselben Bewertungsmethode wie Iron's allgemeine Zauberkraft untersucht werden. Sie gehören nicht zu Mana und ersetzen nicht den Lodestone-Zusatztreffer.

Bei Änderungen der Kaelos-Häufigkeit oder Mindestqualität auch die dann aktive Variante bearbeiten. Eine spätere automatisierte Generierung darf Varianten nicht allein anhand von Dateinamen erraten; die vorhandenen Bedingungen sind maßgeblich.

## Sonderfälle und Probleme

### Kaelos-Resonanz ist ein separater Bonuspfad

`FamilyTable` und `GemFamilies` erzeugen temporäre Attributmodifikatoren aus festen Java-Definitionen. Betroffen sind unter anderem Glyph of Power (Ars-Schaden, Schwellenwerte 0,75/1,75), Archon Focus (Iron's-Zauberkraft 3/7 %), Source Heart (Ars-Mana 25/60) und Manaheart (Iron's-Mana 50/120). Die native Konfiguration lässt diese Resonanz aktuell zu.

Ein Datapacktausch der Gemattribute ändert diese Resonanzen nicht. Empfohlene einfache Variante: reguläre Sockelboni vereinheitlichen, Resonanz zunächst als getrennten Spezialbonus mit `Ars`/`Iron's` ausweisen. Das ist eine dokumentierte Ausnahme, keine vollständige Vereinheitlichung. Vor Umsetzung prüfen, ob sich die vorhandene Resonanzanzeige wahrheitsgemäß und nur für Apotheosis erweitern lässt.

Alternative über native Konfiguration: Resonanz insgesamt abschalten. Das beträfe auch physische und andere Gemfamilien und ist deshalb keine automatisch anzuwendende Lösung. Eine gezielte Umleitung der Resonanz erfordert weitere Modintegration, Nachweis des Lebenszyklus und einen gesonderten Auftrag nach Erklärung der Risiken. Keine tickweise Spiegelung aller Ars-/Iron's-Attribute: Das würde normale Moditems und native Fortschrittsboni mit übernehmen und gegebenenfalls doppelt zählen.

### Lodestone ist nicht gleich Malum-Zauberschaden

Lodestone `magic_damage` erzeugt in `LodestoneAttributeEventHandler.triggerMagicDamage` einen zusätzlichen Vanilla-Magietreffer für Quellen im Tag `c:can_trigger_magic_damage`. Lodestone selbst trägt dort `minecraft:player_attack` ein. Es ist kein ausschließlich auf Malum-Zauber begrenzter Bonus. Darum passt `Bonus Magic Damage (on hit)` besser als eine pauschale Malum-Kennzeichnung.

`magic_proficiency` und `magic_resistance` arbeiten auf `c:is_magic`. Das installierte Ars Hex 5.0.4b erweitert diesen Tag um `#neoforge:is_magic`; damit sind statisch auch die zentralen Ars-/Iron's-Schadensarten eingeschlossen. Malum trägt zusätzlich eigene Schadensarten ein und erweitert die Quellen für Zusatztreffer um seine Sensenangriffe. Eine alleinige Kennzeichnung `Malum` wäre hier falsch. Die Tagbeiträge sind im Snapshot enthalten; tatsächliche geladenen Mengen vor Umsetzung prüfen.

Das Bibliothekslabel `Lodestone` allein erklärt Spielern keinen Wirkungsbereich. `Magic Damage` ist ein Zusatztreffer, `Magic Proficiency` verstärkt klassifizierte Magietreffer, `Magic Resistance` schützt gegen solche Treffer. Proficiency startet bei 1 und ist der zusätzliche sinnvolle Umstellungskandidat aus der Tabelle. Bei Vereinigung zweier bisher unabhängiger Stapelachsen kann aus `(1+p)*(1+q)` ein gemeinsames `1+p+q` werden; auch hier ist eine unveränderte Prozentzahl keine generelle Gleichwertigkeit. Der zusätzliche Vanilla-Magietreffer kann seinerseits vom Pufferfish-Magieschaden profitieren; dies ist ein eigener Stapeltest.

### Weitere Prüfrisiken

| Risiko | Konsequenz / Gegenmaßnahme |
|---|---|
| Viele Treffer, Strahlen, Fläche, Ketten | Feste Punkte gelten pro Schadensaufruf und Ziel, nicht einmal pro Cast. Keine ungeprüfte gleiche Caststärke behaupten. |
| Schaden über Zeit / Feuer / Gift | Besitzer und Schadentag entscheiden; mehrere Pfade können unterschiedlich profitieren. |
| Beschwörungen, Automaten, FakePlayer | Kein automatisches Durchreichen des Besitzerattributs. Keine tiefe Besitzerauflösung ohne gesonderten Auftrag. |
| Nullschaden | Der Pufferfish-Handler schließt negative Werte aus, aber nicht ausdrücklich 0. Feste Punkte können einen qualifizierten Null-Schadensaufruf erhöhen; realen Schadenspfad prüfen. |
| Abgebrochener Treffer, Schild, Immunität, Trefferpause | Pufferfish läuft am Anfang von hurt; anschließende Abwehr und Zusammenfassung können den rechnerischen Zuschlag ändern/verhindern. |
| Gehaltene Waffe | Pufferfish nimmt Schwert-/Axt-/Dreizack-/Keulenattribute vor der Schadensklassifikation hinzu; entsprechende Boni können auch Magietreffer beeinflussen. |
| Heilung | Pufferfish `healing` würde empfangene Heilung verändern, kein sauberer Ersatz für gewirkte Iron's-Heilzauber. Nicht als Ausgleich pauschal hinzufügen. |
| Allgemeine + schulspezifische Zauberkraft | Die nachgeschalteten gemeinsamen Schadensprozente verstärken bereits schulverstärkten Schaden; neue Kombinationen messen. |
| Doppelte Affixpools | Beide früheren Systeme können denselben allgemeinen Bonus rollen. Slotzahlen, Gewichte und Ausschlussgruppen gemeinsam prüfen; Spezialisierungsvielfalt erhalten. |
| Zahlreiche Curios/Sockel | Feste Punkte und Prozentprodukte können deutlich stärker werden; vollständig bestückte Ausrüstung testen. |
| Native Grenzen/Rundung | Pufferfish sanitisiert das Ergebnis; Ars Max-Mana wird ganzzahlig. Grenzen nicht durch Scripts umgehen. |
| Modupdate | Änderungen an IDs, Codecs, Tags, Klassen oder Resonanzen machen Teile dieses Plans ungültig; Snapshot und Tests erneuern. |

## Tooltipplan mit begrenztem Änderungsumfang

Kein globaler Austausch von `ars_nouveau.perk.*` oder `attribute.irons_spellbooks.*`: Das würde entgegen dem Auftrag auch gewöhnliche Moditems und andere Anzeigen umbenennen.

Bevorzugt eigene `trialforged`-Beschreibungsschlüssel in nativen Multi-Gem-/Multi-Affix-Beschreibungen verwenden. Sie können einen gemeinsamen Bonus kurz erklären und Spezialboni markieren. Bei Gems ist ein Multi-Bonus mit einem Modifikator und eigenem `desc` ebenfalls technisch vorgesehen. Mehrere Modifikatoren liefern formatierte Komponenten und Zahlen als Übersetzungsargumente; deren genaue Reihenfolge und Formatierung im Client prüfen.

Eine native Multi-Affix-Beschreibung ersetzt nicht automatisch jede separat gesammelte Attributzeile: `MultiAttrAffix.gatherModifierTooltips` ruft weiterhin `Attribute.toComponent` auf. Auch kombinierte Ausrüstungszeilen können Beiträge des Grunditems und von Apotheosis zusammenfassen. Deshalb die Tooltipabnahme vor großer Datenumstellung durchführen.

Falls native Beschreibungen nicht reichen: eine schmale clientseitige Anpassung ausschließlich für nachgewiesene Apotheosis-Bonuskomponenten prüfen. Formatierte Komponenten, Zahlen, Farben und Übersetzungsargumente erhalten. Keine pauschale Zeichenkettenersetzung im gesamten Tooltip und keine Markierung allein nach Item-Modnamespace. Wenn Bonusherkunft in einer zusammengefassten Zeile nicht mehr trennbar ist, separate kurze Quellenzeile verwenden oder eine explizite Entscheidung zum erweiterten Umfang einholen. Eine benötigte eigene Clientmod oder tiefe Modintegration ist ein gesonderter Umsetzungsschritt mit vorheriger Erklärung und Nutzerauftrag.

Kurze Spezialtexte: `Fire Spell Power (Iron's)`, `Warding (Ars)`, `Charge Capacity (Malum)`. Hydro/Technomancy aus Ace's gehören zur Iron's-Integration und erhalten ebenfalls `Iron's`. Ars-/Iron's-/Malum-Statuseffekte und automatisch ausgelöste Zauber sind separat zu kennzeichnen, auch wenn sie keine Attribute sind. Keine vollständig allgemeine Manaanzeige versprechen, solange ein Teil eines Multi-Bonus weiterhin nur ein System unterstützt.

## Umgang mit vorhandenen Items

Ein Override unter derselben Gem-/Affix-ID kann vorhandene Items bei erneuter Auflösung der Definition verändern. Kein eigener Migrationscode bedeutet nicht, dass die Wirkung alter Items erhalten bleibt. Sockelmods, temporäre Resonanzmodifikatoren, Definitionsreferenzen und gespeicherte Affix-Level müssen getrennt geprüft werden.

Ursprüngliche Empfehlung vor der Bestandsfreigabe: neue `trialforged`-IDs für neue gemeinsame Bonusdefinitionen, alte Definitionen für bestehende Items erhalten und deren neue Generierung kontrolliert ausschließen. Native Affix-Blacklist für alte Affixe prüfen; bei Gems einen nachweislich gültigen Ausschluss aus den Lootgewichten/Quellen verwenden, ohne die alte Definition zu löschen. Nullgewicht oder leere Gewichte erst nach Codec- und Laufzeitbeleg verwenden. Neue IDs benötigen passende Gemmodelle, Übersetzungen und ggf. Kaelos-Familienzuordnung; die Resonanz zählt IDs/Familien und folgt einer Umbenennung nicht automatisch.

Neue Kaelos-IDs sind deshalb nicht blind als Ersatz einzuplanen: entweder ihre native Familienzuordnung nachweisen oder die betroffenen Familien bis zur gesonderten Entscheidung unangetastet lassen. Gewählte Umsetzung: Der Nutzer hat die einfacheren In-place-Overrides samt möglicher Änderung bestehender Items ausdrücklich bestätigt. Die IDs und die native Kaelos-Familienzuordnung bleiben erhalten. Keine weltweite Inventarbereinigung für diese normale Balanceänderung.

## Umsetzung in überprüfbaren Schritten

1. **Bestand und Zielvertrag einfrieren.** Snapshot erneuern; aktive Weltdatapacks/Serverconfigs, Kaelos-Konfiguration und native Tagmengen prüfen. Endgültige Stapelregeln, neue IDs versus Bestandswirkung und Resonanzausnahme festhalten. Akzeptanz: jede gemeinsame Bonusquelle besitzt eine Entscheidung und nachvollziehbare Ausgangswerte.
2. **Kleine native Machbarkeitsprobe nur unter `local`.** Ein fester Pufferfish-Gem, ein Prozentgem, ein Mana-Multi-Gem und ein Mana-/Regen-Multi-Affix. Codecs nativ laden, reale Modifier-IDs, Purity/Rarity-Werte, Slots und Tooltippfade prüfen. Keine produktiven Ressourcen vor erfolgreicher Probe ändern.
3. **Tooltipprobe vor Breitenumstellung.** Lose Gems, gesockelte Vanilla- und Moditems, Affixausrüstung, Curios, Multi-Boni, Shift/erweiterte Tooltips und Resonanz. Akzeptanz: Wirkungsbereich erkennbar, +Punkte und +Prozent eindeutig, normale Grunditemanzeigen nicht global umbenannt, keine abgeschnittenen/fehlenden Werte.
4. **Vorhandene Werttabellen übernehmen.** Ars-Prozentkurven unverändert verwenden; übrige Tabellen und notwendige Einheitenumrechnungen pro Slot/Purity/Rarity dokumentieren. Grobe Vergleichsläufe genügen. Vor der Datenumstellung abgleichen, ob gleiche universelle Affixe doppelt rollen können; gewolltes Stapeln zulassen, technische Doppelanwendung verhindern. Keine Ersatzkurven für zuvor wirkungslose Ars-Prozentboni berechnen.
5. **Datenumstellung.** Umgesetzt als dynamische native JSON-Overrides über `ServerEvents.generateData` und eigene Beschreibungsschlüssel über `ClientEvents.generateAssets`, damit Modupdates ihre Werte weiter liefern. Nur ausgewählte Boni ersetzen; Nebeneffekte, Bedingungen, Slots, Seltenheit und Lootconstraints bewusst erhalten. Bisherige IDs gemäß bestätigter Bestandsfreigabe beibehalten. Kein zusätzlicher Kampfhandler für die bereits native Pufferfish-Mechanik.
6. **Resonanz und schwer trennbare Tooltips separat abschließen.** Dokumentierte, gekennzeichnete native Ausnahmen sind die einfache Ausgangsvariante. Wird vollständige Vereinheitlichung verlangt, erst nach Erklärung der notwendigen Eingriffstiefe und gesondertem Nutzerauftrag weitergehen. Kein spontanes Deaktivieren aller Resonanzen.
7. **Integration und Regression.** Isolierter stummer Client ohne Mausübernahme nach [Laufzeitworkflow](runtime-validation.md), danach dedizierter Server mit zwei verbundenen Spielern für Netzwerk-/Ausrüstungszustand. Prüfskripte unter `tests`, Testwelten unter `local`. Nur tatsächlich getestete Punkte als erledigt markieren.
8. **Dokumentation und Abschluss.** Finalen Bestand/Werttabellen, Ausnahmen, Scope und Testergebnisse dokumentieren; Plan auf tatsächlich gewählten Weg aktualisieren. Diff auf fremde Änderungen und temporäre Artefakte prüfen.

## Abnahmematrix

| Vertragsbereich | Erforderlicher Nachweis |
|---|---|
| Feste Punkte / Prozente | Kontrollierter Magietreffer: 20 -> 25 mit +5; 20 -> 24 mit +20 %; kombiniert 30. Tatsächliche Produktionsmodifier verwenden. |
| Stapeln | Zwei Basisprozente plus Punkte ergeben 35; zwei Gesamtmultiplikatoren 36. Mit realen Sockeln, Affixen und anderen Pufferfish-Waffenboni gegenprüfen. |
| Ars / Iron's | Mindestens direkter Treffer und Projektil jedes Systems, mit und ohne native Zauberkraft-/Schulboni. Gesundheitsdifferenz und Schadensquelle protokollieren, nicht bloß Attributanzeigen. |
| Balanceziel | Vorhandene Ars-Prozentzahlen bleiben erhalten. Frühe und weit entwickelte Builds sowie trefferdichte Mechaniken grob vergleichen; hohe Werte und kleine Ungleichheiten akzeptieren, deutliche einseitige Eskalation untersuchen. Keine exakte Gleichwertigkeit als Abschlussbedingung. |
| Mehrfachpfade | Fläche, Mehrfachtreffer, Strahl, Gift/Feuer, Beschwörung, Besitzerlosigkeit, FakePlayer, sekundärer Lodestone-Treffer. Erwartete Ausnahmen ausdrücklich dokumentieren. |
| Abwehr | Rüstung, Magieresistenz, Schild, Immunität, Trefferpause, abgesagtes Schadensereignis und Nullschaden. |
| Mana | Beide nativen Vorräte und reale Regenerationsmenge über gemessene Ticks; frühe/späte Ars-Buch-/Glyphenstufe, volle/leere Vorräte, feste/prozentuale Boni und Rundung. Kein aktuelles Mana kostenlos auffüllen. |
| Lebenszyklus | An-/Ablegen, Handwechsel, Curios, Sockeln/Entfernen, Tod, Wiederbeitritt, Neustart und Dimensionswechsel; kein Bonusrest und kein Doppeleintrag. |
| Kaelos | 2/3/4/5 passende Gems, Aktivierung und Entfernung von Resonanz, gemischte Familien, neue IDs falls gewählt; regulärer Bonus und Resonanz getrennt nachweisen. |
| Generierung / Bestand | Neue Rolls und Reforging verwenden den gewünschten Pool; kontrolliert angelegte Altitems bleiben gemäß gewähltem Bestandsvertrag gültig. |
| Multiplayer | Zwei verbundene Spieler mit unterschiedlichen Boni; keine Übertragung auf den anderen Spieler, keine ungewollte Gruppenstärke; serverseitige Werte und Clientanzeige stimmen überein. |
| UI | Echte Clientdarstellung für Gems/Affixe und gesockelte Moditems; kurze Kennzeichnung korrekt, originale Grunditemtexte erhalten. |

Reine Rechenfakes sind kein Laufzeitbeleg. Für die Formelbeispiele zunächst einen echten kontrollierten Magieschadensaufruf ohne Rüstung und störende native Boni verwenden; danach echte Zauber testen. Ist ein Testclient oder dedizierter Testserver nicht ausführbar, den entsprechenden Bereich ausdrücklich offenlassen.

## Offene Entscheidungen und Abschlusskriterien

- **Empfohlen und nativ möglich:** gemeinsamer Magieschaden mit festen Punkten und zwei Prozentoperationen; gemeinsames Mana über native Attributpaare; gemeinsame Prozentregeneration über native Attributpaare.
- **Bestätigte Wertentscheidung:** Ars-Prozentschaden mit vorhandenen Zahlen übernehmen; Mitverstärkung des Grundschadens und kleine Balanceunterschiede sind akzeptiert. Hohe bis absurde Charakterwerte entsprechen dem Packziel.
- **Grobe Prüfung statt Feinregulation:** feste Ars-Regeneration benötigt ggf. eine Einheitenumrechnung; universelle Nutzbarkeit, Doppelrollen und Schaden statt allgemeiner Iron's-Zauberkraft auf technische Fehler und deutliche einseitige Eskalation prüfen. Keine mathematisch exakte Angleichung verlangen.
- **Native Ausnahme empfohlen:** Kaelos-Resonanz mit kurzem Wirkungslabel; feste Ars-Regeneration darf zunächst `Ars` bleiben. Keine vollständige Erfüllung behaupten, wenn diese Ausnahmen bestehen.
- **Abgeschlossen:** Bestandswirkung ist ausdrücklich freigegeben; bisherige IDs bleiben erhalten. Daher keine Ausschluss-/Migrationsschicht und keine neue Kaelos-Familienzuordnung. Native Gem-Beschreibungen und zusätzliche Affix-Herkunftszeilen begrenzen die Tooltipänderung auf Apotheosis-Boni.
- **Nicht Gegenstand des aktuellen Auftrags:** Modinstallation, Modupdate, globale Umbenennung normaler Moditems, eigener Manapool, Spiegelung aller nativen Attribute oder zusätzliche Spieler-/Gegnerskalierung.

## Technische Quellen

Primärbelege sind die oben genannten installierten JARs. Relevante Klassen: Pufferfish `LivingEntityMixin`, `DamageKind`, `DynamicModificationImpl`, `EntityAttributeInstanceMixin`; Ars `PerkAttributes`, `IDamageEffect`, `ManaUtil`; Iron's `AttributeRegistry`, `AbstractSpell`, `HealSpell`, `MagicManager`; Apotheosis `AffixRegistry`, `Gem`, `AttributeBonus`, `MultiAttrBonus`, `MultiAttrAffix`; Kaelos `GemVariantCondition`, `FamilyTable`, `GemFamilies`; Lodestone `LodestoneAttributeEventHandler`, `LodestoneDamageTypeTags`. Der Tag-Brückeneintrag kommt aus Ars Hex 5.0.4b.

Prüfung mit lokalem JDK, beispielsweise:

```powershell
& 'C:\Program Files\Java\jdk-21\bin\javap.exe' -classpath mods/Apotheosis-1.21.1-8.9.0.jar -c -p dev.shadowsoffire.apotheosis.socket.gem.bonus.MultiAttrBonus
```

Ergänzende Herstellerdokumentation: [Pufferfish-Attribute](https://puffish.net/attributesmod/docs/creators/added-attributes) beschreibt Magieklassifikation und dynamische Boni; [dynamische Attribute](https://puffish.net/attributesmod/docs/creators/dynamic-attribute) erklärt deren kontextabhängige Berechnung. Versionsabhängige Details dieses Plans beruhen auf der installierten 0.8.3, nicht auf unbesehen übernommenem aktuellem Repositorycode.
