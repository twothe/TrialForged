# Vanilla-Bosse über Infernal Mobs

Stand: 05.10.2026. Wither, Ender Dragon und Warden werden über die native Infernal-Mobs-Konfiguration immer Infernal. Zufällige Effekte und die modinternen Gesundheitsregeln sind ausdrücklich gewünscht.

## Konfiguration

In `config/infernalmobs.cfg` stehen `WitherBoss`, `EnderDragon` und `Warden` jeweils in `permittedentities` und `entitiesalwaysinfernal` auf `true`. Beide Schalter sind erforderlich. Die vorhandenen globalen Einstellungen für Effekte, Seltenheitsstufen, Gesundheit und Beute bleiben erhalten.

Das Skript `kubejs/server_scripts/vanilla_boss_profiles.js` und seine spezifischen Tests wurden entfernt. Es gibt keine festen 600/1.000/1.024-HP-Profile, fest vorgeschriebenen Modifikatorketten, zusätzlichen Angriffsmultiplikatoren oder skriptseitigen Apotheosis-Gegnertiers mehr. Apotheosis verwendet wieder seine native Tierzuordnung. Keine zusätzliche Skalierung nach Spielerzahl wurde eingebaut.

Die persönliche [Apotheosis-Progression](apotheosis-progression.md) und die vorhandenen [Boss-Ausschlüsse für Dynamic Difficulty](dynamic-difficulty.md) bleiben bestehen. Ein Sieg über Wither, Drachen oder Warden gewährt weiterhin Ascent, Summit beziehungsweise Pinnacle.

## Bereits gespeicherte Bosse

Die Umstellung verändert keine Weltdateien. Gespeicherte Infernal-Effekte, maximale HP und Apotheosis-Boni können an bestehenden Bossen erhalten bleiben. Ein Neustart setzt solche Daten nicht automatisch zurück. Die native Always-Infernal-Regel ist daher vor allem für neu erzeugte Bosse maßgeblich; es wurde bewusst kein weiteres Migrationsskript hinzugefügt.

## Prüfung

`node tests/check-pack-scripts.cjs` prüft die aktuelle Config und die bestehenden Progressions-/Levelbeuteskripte. Der isolierte Clientlauf `./tests/run-runtime-client.ps1` prüft neue Bosse auf native Infernal-Effekte, fehlende eigene Profilmarker, echten Kampf, Weltbeitritt und persönlichen Tieraufstieg. Variable HP und Effekte werden dabei nicht als feste Balancewerte vorausgesetzt. Laufzeitdetails stehen in [Minecraft-Laufzeittest](runtime-validation.md).

## Entscheidung

Native Modkonfiguration hat Vorrang. Tiefe KubeJS-Eingriffe benötigen nachgewiesene Notwendigkeit und einen ausdrücklichen Auftrag, nachdem Risiken und einfachere Alternativen erklärt wurden. Die frühere Profilimplementierung war für das gewünschte Ergebnis unnötig aufwendig.

## Historie der entfernten Profilimplementierung

Die folgenden Befunde dokumentieren die frühere Implementierung und ihre Fehlerursachen. Die dort beschriebenen Profil-Handler sind seit 05.10.2026 entfernt.

### KubeJS-Schnittstellenkorrektur vom 02.10.2026

Beim Schaden an einem Royal Enderman scheiterte die Seitenprüfung des Schadenshandlers an `event.getEntity().level()`. Die gemeldete Zeile 44 war das erneute Werfen des Fehlers durch `tfBossGuard`. Der Handler läuft auch für gewöhnliche Gegner; der Royal Enderman benötigte deshalb keine Änderung.

Die installierte KubeJS-Version `2101.7.2-build.377` blendet `Entity.level()` per `HideFromJS` aus. `EntityKJS.kjs$getLevel()` stellt stattdessen die Eigenschaft `entity.level` bereit. Sämtliche betroffenen Aufrufe in Bossprofilen und Progression verwenden jetzt diese Eigenschaft. Die Java-Annotationen und Getter wurden mit `javap` aus der installierten JAR geprüft.

Zudem benennt KubeJS den nativen NeoForge-Zugriff `getPersistentData()` in `getForgePersistentData()` um. Infernal-Zustand und alte `LEVEL`-Marker werden deshalb ausdrücklich über `getForgePersistentData()` bearbeitet; der eigene Profilmarker bleibt in `entity.persistentData`. Die Tests unterscheiden diese beiden Speicherbereiche und prüfen, dass KubeJS-Daten bei der Bereinigung erhalten bleiben.

Die früheren Schnittstellenfakes hatten `level` irrtümlich als Funktion und native Daten unter dem falschen Getter angeboten. Mit korrigierten Fakes reproduzierte der neue Fall für gewöhnlichen sowie Umweltschaden am Modgegner den ursprünglichen Fehler. Nach der Korrektur bestehen 36 Bossprofil-Fälle in Node und in Rhino `2101.2.7-build.85`.

Beim folgenden Beitritt um 19:40 Uhr trat ein weiterer Java-/KubeJS-Namensunterschied auf: `DamageSource.getEntity()` ist laut installiertem `DamageSourceMixin` als `getActual()` verfügbar. Boss-Schadenshandler und persönliche Progression verwenden jetzt `getActual()`, auch die Schnittstellenfakes bieten nur diesen Namen an. Vor der Änderung reproduzierten beide Testsuiten den Fehler, danach bestanden sie in Node und Rhino.

Die scheinbar minutenlange Terrain-Ladezeit war eine Fehlerkette: Serverstart 19:40:32, Spielerbeitritt 19:40:43, Skriptfehler 19:40:50 und sofortiger Serverstopp. `ApothEnchEvents.stopped(ServerStoppedEvent)` leert dabei `ENCHANTMENT_INFO`. Der weiterlaufende Client startete JEIs Rezeptregistrierung; ab 19:40:52 scheiterten dessen Ambossberechnungen an den bereits geleerten Daten. Bis 19:43:50 waren 10.235 Ambossfehler und rund 135 MB Log entstanden. Die Speicherung dieser Daten und die Ausnahmebedingung wurden im Bytecode von Apothic Enchanting 1.6.2 geprüft. JEI-/Apothic-Modwechsel oder reine Logunterdrückung beheben diesen auslösenden Skriptfehler nicht.

Der anschließende [echte Clienttest](runtime-validation.md) bestätigte Weltbeitritt, alle drei maximalen Boss-HP, vorhandene Infernal-Profile, gewöhnlichen Schaden, einen Warden-Angriff und Pinnacle nach einem Warden-Kill. Dabei wurden außerdem die explizite `removeModifier(net.minecraft.resources.ResourceLocation)`-Überladung und der Vergleich von Drachenphasen über `getId()` erforderlich; die vorherigen Aufrufe scheiterten im tatsächlichen KubeJS-Kontext.

