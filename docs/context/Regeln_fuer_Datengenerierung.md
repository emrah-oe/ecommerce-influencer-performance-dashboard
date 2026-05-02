# Regeln für Datengenerierung

## Zweck

Diese Seite beschreibt, nach welchen Regeln die synthetischen Bestellungen erzeugt werden sollen.

Sie beantwortet nicht die Frage, welche Datenfelder existieren, sondern wie die Daten plausibel verteilt und mit Sonderfällen angereichert werden.

---

## Feste Szenarioanker

Für die Datengenerierung gelten aktuell folgende Rahmenbedingungen:

- ca. 8.000 Bestellungen pro Monat
- ca. 30 Influencer
- jeder Influencer hat einen eigenen Rabattcode
- ein Teil der Rabattcodes wird zusätzlich in Meta Ads genutzt
- Retouren werden über Tags oder Metafields dargestellt

---

## Grundregeln

### 1. Plausibilität vor Gleichverteilung

Die Daten sollen fachlich glaubwürdig wirken.
Sie sollen nicht gleichmäßig oder rein zufällig verteilt sein.

### 2. Heterogenität ist Pflicht

Influencer unterscheiden sich in

- Bestellvolumen
- Umsatzniveau
- Retourenverhalten
- Attributionssicherheit

### 3. Unsicherheit muss sichtbar sein

Die Datensimulation soll nicht nur saubere Fälle erzeugen.
Sie muss bewusst auch problematische und unsichere Fälle enthalten.

### 4. Reproduzierbarkeit

Die Generierung soll mit Seed oder klaren Regeln wiederholbar sein.

---

## Erzeugungslogik in Schritten

### Schritt 1: Zeitraum festlegen

- Simulationsmonat oder Simulationszeitraum festlegen
- Seed dokumentieren
- Gesamtzielmenge definieren

---

### Schritt 2: Influencer-Basis erzeugen

Für jeden Influencer anlegen:

- eindeutige ID
- Name oder Alias
- primärer Rabattcode
- Kennzeichnung `exclusive` oder `mixed_with_meta_ads`
- Performance-Profil
- Retouren-Profil

Ziel:

- nicht alle Influencer gleich stark machen
- später unterschiedliche Ergebnisbilder im Dashboard erzeugen

---

### Schritt 3: Influencer in Volumenklassen einteilen

Empfohlene Struktur:

- wenige starke Influencer
- einige mittlere Influencer
- mehrere kleinere Influencer

Ziel:

- realistischer Long-Tail statt Gleichverteilung

---

### Schritt 4: tägliches oder wöchentliches Ordervolumen verteilen

Das monatliche Gesamtvolumen soll zeitlich verteilt werden.

Einbauen:

- normale Tage
- ruhigere Phasen
- einzelne Peaks
- Unterschiede im Aktivitätsmuster einzelner Influencer

Nicht gewünscht:

- komplett flache Tagesverteilung
- identisches Aktivitätsmuster für alle Influencer

---

### Schritt 5: Bestellwerte erzeugen

Bestellwerte sollen streuen und nicht konstant sein.

Einbauen:

- normale Warenkörbe
- kleinere Orders
- einzelne höhere Ausreißer

Nicht festgelegt:

- exakter Durchschnitt
- exakte Streuung

---

### Schritt 6: Rabattcode-Nutzung erzeugen

Bestellungen sollen nicht alle gleich aussehen.

Mögliche Gruppen:

- Bestellung mit eindeutigem Influencer-Code
- Bestellung mit gemischtem Code
- Bestellung ohne Rabattcode
- Bestellung mit unklarer Zuordnung

Hinweis:

- nicht jede Bestellung muss einen Rabattcode enthalten
- nicht jeder verwendete Rabattcode darf automatisch als sauberer Influencer-Fall gelten

---

### Schritt 7: Attributionsstatus vergeben

Jede Bestellung soll einem der folgenden Status zugeordnet werden:

- `clean_influencer`
- `mixed_code`
- `unknown`

Regellogik:

- Bestellungen mit exklusivem, klar interpretierbarem Rabattcode können `clean_influencer` sein
- Bestellungen mit als gemischt markiertem Rabattcode sind Kandidaten für `mixed_code`
- Bestellungen ohne belastbare Zuordnung werden `unknown`

Wichtig:

- die Verteilung dieser Gruppen soll bewusst gesteuert werden
- keine reine Zufallsverteilung ohne fachliche Logik

---

### Schritt 8: Retouren und Refunds erzeugen

Jede Bestellung erhält einen Retourenstatus:

- `no_return`
- `partial_return`
- `full_return`

Zusätzlich:

- Refund-Betrag setzen
- Erfassungsquelle als Tag oder Metafield markieren

Ziel:

- Influencer mit unterschiedlichen Retourenprofilen erzeugen
- wirtschaftlich problematische Konstellationen sichtbar machen

Einbauen:

- Influencer mit niedriger Retourenquote
- Influencer mit auffälliger Teilretourenquote
- einzelne Vollretouren
- Fälle mit hoher Bestellsumme und hoher Rückabwicklung

---

### Schritt 9: Sonderfälle einbauen

Pflicht-Sonderfälle:

- Bestellung mit Code und widersprüchlicher Retourenmarkierung
- Bestellung ohne Code und ohne klare Zuordnung
- hoher Bestellwert mit Vollretoure
- Influencer mit viel Volumen, aber schwacher Wirtschaftlichkeit
- selten genutzte Codes
- einzelne auffällige Ausreißer

Ziel:

- nicht nur Standardfälle testen
- Dashboard und Logik gegen Grenzfälle absichern

---

### Schritt 10: Validieren

Nach der Generierung prüfen:

- Gesamtzahl der Bestellungen erreicht
- Anzahl Influencer korrekt
- jeder Influencer hat einen primären Rabattcode
- Statuswerte nur aus erlaubten Mengen
- Sonderfälle wirklich enthalten
- Verteilungen grob plausibel
- Seed und Annahmen dokumentiert

---

## Mindestanforderungen an die Ergebnisdaten

Die Ergebnisdaten sollen mindestens ermöglichen:

- Umsatz pro Influencer
- Retourenquote pro Influencer
- Trennung von `clean_influencer`, `mixed_code` und `unknown`
- Identifikation wirtschaftlich problematischer Influencer-Fälle
- Testbarkeit des Dashboards bei größerem Volumen

---

## Was diese Seite bewusst offen lässt

- exakte Prozentwerte
- konkrete Generator-Implementierung
- Shopify Importmechanik
- Datenbankdesign im technischen Sinn
- reale Marketingkosten je Influencer
