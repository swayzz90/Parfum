# Duftfinder – Prototyp v6

Parfüm-Empfehlung nach Charakter, Anlass, Jahreszeit und Budget. Reine Web-App (HTML, CSS, JavaScript), kein Server nötig.

## Auf GitHub Pages bringen
1. Neues Repository anlegen, z. B. `duftfinder` (öffentlich).
2. Alle Dateien aus dieser ZIP hochladen (Add file → Upload files). Es gibt keine Unterordner.
3. Settings → Pages → Source: „Deploy from a branch“, Branch `main`, Ordner `/ (root)` → Save.
4. Nach 1–2 Minuten läuft die App unter `https://<dein-name>.github.io/duftfinder/`.
5. Am Handy: im Browser öffnen → „Zum Home-Bildschirm“.

## Dateien
- `data.js` – 20 Charakterzüge, Anlässe, Budgets und 178 Düfte. Hier pflegst du neue Düfte ein.
- `duftbilder.js` – ein Satz pro Duft, wie er sich anfühlt. Bei neuen Düften hier einen Satz ergänzen.
- `match.js` – Matching-Logik (Kosinus-Ähnlichkeit Charakter ↔ Akkorde, plus Anlass, Jahreszeit, Intensität). Berechnet auch „Ähnliche Duftrichtung“, die Regler (frisch/warm, süß/herb, dezent/laut) und den Duftverlauf.
- `app.js` – Oberfläche. Die Shop-Suchlinks stehen oben in `SHOPS`.
- `style.css`, `index.html` – Aussehen und Grundgerüst.
- `feed.json` – Bilder und Preise aus den Affiliate-Feeds (aktuell leer, siehe unten).
- `impressum.html`, `datenschutz.html` – Rechtstexte als Vorlage. Gelb markierte Platzhalter vor der Veröffentlichung ausfüllen.
- `ROADMAP.md` – was später kommt (Sprachen, Länder, weitere Einnahmen).
- `manifest.json`, `sw.js`, `*.png` – App-Installation und Offline-Cache.

## Neuen Duft anlegen
In `data.js` einen Eintrag in `DUEFTE` kopieren und anpassen:
- `fuer`: `m`, `w` oder `u` (Unisex)
- `preis`: 1 = bis 40 €, 2 = 40–80 €, 3 = 80–150 €, 4 = über 150 € (übliche kleine Flasche)
- `int`: Intensität 1–5
- `akk`: Akkord-Stärken 0 bis 1, nur Schlüssel aus `AKKORDE`

## Nach einer Änderung
In `sw.js` die Zeile `const CACHE = "duftfinder-v6"` hochzählen (v7, v8 …), damit installierte Handys die neue Version laden.

## Bilder und Preise (feed.json)
Sobald die Awin-Feeds da sind, schreibt der Feed-Job pro Duft-ID einen Eintrag in `feed.json`:
```json
{ "dior-sauvage": { "bild": "https://…/sauvage.jpg", "preis": 89.9, "shop": "Douglas", "link": "https://…" } }
```
Mit `bild` zeigt die Karte das Produktfoto statt des gezeichneten Flakons. Lädt das Foto nicht, erscheint wieder der Flakon. Nur Bilder aus Partner-Feeds verwenden, keine Fotos von fremden Seiten kopieren.

## Hinweise
- Preisklassen sind Richtwerte. Echte Preise kommen in Phase 2 aus den Awin-Produktfeeds.
- Die Shop-Links sind einfache Suchlinks ohne Provision. Nach der Awin-Freischaltung werden sie durch Partner-Links ersetzt.
- Merkliste und 👍/👎-Feedback werden nur lokal im Browser gespeichert (`localStorage`).

## Merkliste, Preisalarm, Wunschliste (v4)
- **Preisalarm:** In der Merkliste pro Duft einschaltbar, optional mit Wunschpreis. Beim Öffnen der App vergleicht sie die Preise aus `feed.json` mit den zuletzt gesehenen. Ohne Wunschpreis meldet sie jede Senkung, mit Wunschpreis erst, wenn der Preis darunter fällt. Dann erscheinen ein Hinweis auf der Startseite und ein roter Punkt am ♡.
- Der Alarm funktioniert nur, wenn man die App öffnet. Echte Push-Nachrichten oder E-Mails brauchen später einen kleinen Server (z. B. mit der Play-Store-App oder einem Newsletter-Tool).
- **Bester Preis:** Hat ein Duft in `feed.json` `preis` und `link`, steht im Shop-Bereich oben „Bester Preis“ als gekennzeichneter Partner-Link.
- **Wunschliste teilen:** Erzeugt einen Link wie `…/#liste=dior-sauvage,byredo-gypsy`. Wer ihn öffnet, sieht die Düfte, kann Preise vergleichen und sie übernehmen. Gespeichert wird dabei nichts auf einem Server.

## Duft-Suche, Zählung, Dunkelmodus (v5)
- **„Du magst schon einen Duft?“** auf der Startseite: Suche nach Marke oder Name, dann drei Düfte in ähnlicher Richtung (bekannte Marke, Nische, günstiger) plus weitere. Logik in `match.js` (`aehnlicheDuefte`, `sucheDuft`).
- **Anonyme Klickzählung mit GoatCounter:** ist aus, solange in `app.js` oben `const ZAEHLER = ""` leer ist. Einschalten: kostenlos auf goatcounter.com anmelden, Code eintragen (z. B. `"duftfinder"`). Gezählt werden u. a. Quiz-Ergebnisse, Suchen, Shop- und Probe-Klicks pro Duft, Merken, Preisalarm, 👍/👎. Datenschutzerklärung Abschnitt 4 dann anpassen.
- **Dunkelmodus:** folgt automatisch der Handy-Einstellung. Farben stehen in `style.css` oben unter `prefers-color-scheme: dark`.

## Neue Einstiege, Wirkung, Preis-Regler (v6)
- **Drei Wege auf der Startseite:** „Nach Duftwelt“ (Standard, 1–3 Bilder wie „Kaminfeuer an einem Winterabend“), „Ich mag schon einen Duft“ und „Nach Persönlichkeit“ (das alte Quiz). „Als Geschenk finden“ nutzt den Persönlichkeits-Weg.
- **Statt „Wofür“:** Wirkung (1–2 aus 6), Regler „Wie nah darf er kommen?“ (hautnah bis füllt den Raum), Tagsüber/Abends/Beides, Jahreszeit und Schalter „Soll im Büro okay sein“.
- **Preis-Regler** von 20 € bis 500 € plus „unbegrenzt“, dazu ein Zahlenfeld für jeden Betrag. Ohne echte Preise schätzt die App den typischen Preis der Preisklasse (`PREIS_TYPISCH` in `data.js`).
- Duftwelten, Wirkungen, Nähe-Texte und Preisstufen stehen in `data.js` und lassen sich dort ändern.

### feed.json mit mehreren Shops
Pro Duft ist auch eine Liste von Angeboten möglich. Die App zeigt das günstigste als „Bester Preis“, bis zu drei weitere darunter, dann Suchlinks zu den übrigen Shops und Idealo ganz unten:

```json
{ "dior-fahrenheit": { "bild": "https://…", "angebote": [
  { "shop": "Notino", "preis": 64.5, "link": "https://…" },
  { "shop": "Douglas", "preis": 79.95, "link": "https://…" } ] } }
```
Das alte Format mit `preis`, `shop`, `link` funktioniert weiter.
