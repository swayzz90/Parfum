# Duftfinder – Roadmap und Notizen

Stand: v6 (Deutschland-Version, Test auf GitHub Pages). Hier steht, was wir später machen und warum noch nicht.

## Grundsatz
Erst Deutschland fertig und mit echten Nutzern getestet, dann ausbauen. Bevor etwas Neues gebaut wird, muss die deutsche Version zeigen, dass Nutzer klicken und Provision fließt.

## 1. Ausbau Sprache und Region (später)
Auslöser: Die deutsche Version läuft im Play Store, es gibt erste Klicks und erste Provisionen.

Reihenfolge:
1. Deutschland (läuft)
2. Österreich und Schweiz: gleiche Sprache, andere Shops, in der Schweiz Franken
3. Englisch (UK/US): größerer Markt, aber viel Konkurrenz (Fragrantica, Parfumo)

Vorbereitung, die vor dem Ausbau erledigt werden sollte (ca. ein halber Tag):
- [ ] Alle Oberflächentexte aus `app.js`, `index.html` und `match.js` in eine Sprachdatei (`texte.de.js`) auslagern
- [ ] Charakterzüge, Anlässe, Jahreszeiten, Budgets in `data.js` mit Sprach-Schlüsseln versehen
- [ ] Duftbilder pro Sprache getrennt halten (`duftbilder.de.js`, später `duftbilder.en.js`), nicht wörtlich übersetzen, sondern neu schreiben
- [ ] Preise und Shop-Daten pro Land: `feed.de.json`, `feed.at.json`, `feed.ch.json`, …
- [ ] Preisformat und Währung über eine Ländereinstellung steuern (heute fest EUR/de-DE)

Checkliste pro neuem Markt:
- [ ] Affiliate-Programme und Shops für das Land (Awin-Programme, Amazon-Partnernetzwerk des Landes)
- [ ] Impressum und Datenschutz nach dortigem Recht prüfen
- [ ] Formulierung „ähnliche Duftrichtung“ rechtlich prüfen (Markenrecht kann sich unterscheiden)
- [ ] Texte von einer Muttersprachlerin oder einem Muttersprachler gegenlesen
- [ ] Play-Store-Eintrag in der Landessprache
- [ ] Preise und Verfügbarkeit der Düfte im Land prüfen (nicht alle Düfte sind überall erhältlich)

## 2. Weitere Einnahmequellen (später)
- Push-Nachrichten oder E-Mail für den Preisalarm (braucht kleinen Server oder Newsletter-Tool)
- Website mit Suchmaschinen-Seiten wie „Düfte ähnlich wie …“
- Premium für ca. 2–3 € (Duftschrank, unbegrenzte Alarme)
- Gekennzeichnete Platzierungen für Nischenmarken, erst mit echtem Traffic
- Nicht tun: eigene Abfüllungen verkaufen, Nutzerdaten verkaufen

## 3. Offene Punkte
- Preisklassen in `data.js` sind Schätzungen, bis die Feeds echte Preise liefern
- Noten von rund 160 Düften stammen aus eigenem Wissen und sollten stichprobenartig geprüft werden
- Proben- und Shop-Links sind Suchlinks, bis die Awin-Links da sind
- Impressum und Datenschutz liegen als Vorlage bereit (v5): Platzhalter ausfüllen und prüfen lassen, bevor die App öffentlich ist
- GoatCounter-Code in `app.js` eintragen, sobald Testerinnen und Tester dabei sind

## 4. Erledigt
- v4: Merkliste, Preisalarm mit Wunschpreis, „Bester Preis“, Wunschliste teilen
- v5: Duft-Suche „Du magst schon einen Duft?“, Rechtstext-Vorlagen, anonyme Klickzählung (vorbereitet), Dunkelmodus
- v6 (nach Tester-Feedback): drei Einstiege (Duftwelt, ähnlicher Duft, Persönlichkeit), Wirkung + Nähe-Regler + Tag/Abend + Büro statt Anlass, Preis-Regler bis 500 €/unbegrenzt mit Zahlenfeld, Partner-Preise oben und Idealo nach unten

## 5. Preisvergleich und Idealo
- Solange keine Feeds da sind, bleibt Idealo oben als einziger echter Preisvergleich.
- Mit Feeds: eigene Partner-Preise oben („Preise bei unseren Partner-Shops“), Idealo ganz unten. Nicht „vollständiger Preisvergleich“ versprechen, weil nur Partner-Shops enthalten sind.
- [ ] Im Awin-Konto prüfen, ob es ein offenes Idealo-Partnerprogramm für Deutschland gibt. Wenn ja, Idealo-Link durch Partner-Link ersetzen.
- [ ] Beim Feed-Job festlegen, welche Flaschengröße als Preis zählt (Vorschlag: günstigster Preis, umgerechnet auf 50 ml)

## 6. Ideen für die deutsche Version (wenn Tester danach fragen)
- „Neu mischen“ und Ausschlüsse (z. B. „nicht süß“)
- Zwei Düfte nebeneinander vergleichen
