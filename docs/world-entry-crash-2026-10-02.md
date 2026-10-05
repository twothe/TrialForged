# Weltbeitrittsabbruch durch Iris/Sodium-Konflikt

Stand: 02.10.2026, ursprünglicher Crash um 19:26:25. Der Nutzer hat bestätigt, dass der Iris-Wechsel geholfen hat; inzwischen ist `iris-neoforge-1.8.14-beta.1+mc1.21.1.jar` installiert. Mods wurden durch diese Analyse nicht verändert. Der nachfolgende Fehler beim Schaden an einem Royal Enderman betrifft die [KubeJS-Bossprofile](vanilla-boss-profiles.md#kubejs-schnittstellenkorrektur-vom-02102026).

## Nachgewiesene Ursache

- Beim ursprünglichen Crash waren `iris-neoforge-1.8.12+mc1.21.1.jar` und `sodium-neoforge-0.8.13+mc1.21.1.jar` installiert. Die alte Iris-JAR deklariert intern `1.8.12-snapshot+mc1.21.1-local`.
- Beim Weltbeitritt initialisiert `SodiumWorldRenderer.initRenderer` den Renderer. Iris wendet dabei `mixins.iris.compat.sodium.json:MixinRenderSectionManager` an.
- Dieses Mixin greift in `iris$disableFogOcclusion` auf `SodiumGameOptions$PerformanceSettings.useFogOcclusion` zu. Die Klasse fehlt, deshalb scheitert die Transformation und der Client bricht ab. Belege: der eingefügte Crashbericht sowie `logs/latest.log`, zum Analysezeitpunkt Zeilen 5254 und 5304–5325. Das Log wird beim nächsten Start ersetzt.
- Die eingebettete Implementierungs-JAR von Sodium 0.8.13 enthält tatsächlich keine `SodiumGameOptions$PerformanceSettings.class`, sondern `SodiumOptions$PerformanceSettings.class`.
- Iris erlaubt in seinen Metadaten Sodium `[0.6,)`. Diese offene Versionsgrenze verhindert den inkompatiblen gemeinsamen Start nicht.

## Vom Nutzer bestätigte Korrektur

Iris durch **1.8.14-beta.1 für Minecraft 1.21.1 / NeoForge** ersetzen. Der [offizielle Versionshinweis](https://modrinth.com/mod/iris/version/1.8.14-beta.1%2B1.21.1-neoforge) nennt ausdrücklich die Anpassung an Sodium 0.8. Dies ist eine Beta; die Funktion im gesamten Pack muss anschließend beim Weltbeitritt geprüft werden.

Sodium nicht isoliert auf 0.6.13 zurücksetzen: Die lokal geprüften Metadaten von Reese's Sodium Options 2.2.4 verlangen exakt `[0.8.13+mc1.21.1]`, Sodium Extra 0.9.4 verlangt `[0.8.13+mc1.21.1,)`. Ein Downgrade würde daher weitere abgestimmte Versionsänderungen erfordern.

Modänderungen erfolgen gemäß Projektregel erst nach ausdrücklicher Entscheidung des Nutzers. Nach einem autorisierten Austausch nur eine Iris-Version aktiv halten, über den Launcher starten, eine Welt betreten und das neue Log auf Transformationsfehler prüfen. Der aktuelle Befund belegt einen Renderer-Konflikt; er bestätigt noch nicht die Fehlerfreiheit des restlichen Packs.
