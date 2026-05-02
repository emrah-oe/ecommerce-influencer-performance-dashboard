# Validierungslogik Synthetische Daten

## Zweck

Diese Seite beschreibt, wie die synthetisch erzeugten Bestelldaten fachlich und strukturell geprüft werden.

Ziel ist nicht nur, dass Daten vorhanden sind, sondern dass sie für Dashboard, Kennzahlen und Attributionslogik belastbar genug sind.

---

## Prüfziele

Die Validierung soll sicherstellen, dass

- das Szenario des Testcases glaubwürdig abgebildet wird
- die Daten intern konsistent sind
- die Statuslogik sauber eingehalten wird
- Sonderfälle bewusst enthalten sind
- die Daten für spätere Auswertungen nutzbar sind

---

## Pflichtprüfungen

### 1. Umfang und Grundstruktur

Prüfen:

- Zielgröße der Orders erreicht
- Anzahl der Influencer korrekt
- jeder Influencer hat genau einen primären Rabattcode
- jede Order hat eine eindeutige `order_id`
- jede Order hat ein gültiges `order_date`

---

### 2. Feldvollständigkeit

Pflichtfelder pro Order:

- `order_id`
- `order_date`
- `gross_revenue`
- `has_discount_code`
- `attribution_status`
- `return_status`
- `refund_amount`

Prüfen:

- keine leeren Pflichtfelder
- keine ungültigen Datentypen
- keine negativen Werte, wo sie fachlich ausgeschlossen sind

---

### 3. Gültige Statuswerte

Prüfen:

- `attribution_status` nur aus
  - `clean_influencer`
  - `mixed_code`
  - `unknown`

- `return_status` nur aus
  - `no_return`
  - `partial_return`
  - `full_return`

Fehlerfall:

- freie Textwerte
- Tippfehler
- nicht dokumentierte Statusvarianten

---

### 4. Konsistenz zwischen Rabattcode und Attribution

Prüfen:

- Order mit exklusivem Code darf nicht ohne Begründung `mixed_code` sein
- Order ohne Rabattcode darf nicht automatisch `clean_influencer` sein
- Order mit gemischtem Code soll nicht als sauberer Referenzfall behandelt werden
- `attributed_influencer_id` darf nur gesetzt sein, wenn die Zuordnung fachlich vertretbar ist

---

### 5. Konsistenz zwischen Retourenstatus und Refund

Prüfen:

- `no_return` darf keinen fachlich relevanten Refund tragen
- `full_return` soll wirtschaftlich plausibel hohen Refund haben
- `partial_return` soll einen Teilrefund tragen
- Return-Markierung in Tags oder Metafields muss zur abgeleiteten Logik passen

---

### 6. Plausibilität der Verteilungen

Prüfen:

- Volumen nicht gleichmäßig über alle Influencer verteilt
- Top-Influencer tragen sichtbar mehr Orders als schwache Influencer
- Anteil `clean_influencer`, `mixed_code` und `unknown` nicht extrem unausgewogen
- Retourenfälle vorhanden, aber nicht überall identisch verteilt
- Bestellwerte zeigen Streuung

Wichtig:

- keine vollständig flache Verteilung
- keine vollständig chaotische Zufallsverteilung

---

### 7. Zeitliche Plausibilität

Prüfen:

- Orders verteilen sich sinnvoll über den Zeitraum
- keine ungewollte Häufung auf nur wenige Tage
- Peaks nur dort, wo sie absichtlich erzeugt wurden
- Aktivität einzelner Influencer kann unterschiedlich ausfallen

---

### 8. Sonderfälle vorhanden

Pflichtprüfung:

- definierte Edge Cases sind tatsächlich im Datensatz enthalten
- Sonderfälle sind erkennbar markiert oder ableitbar
- nicht nur Standardfälle dominieren

Beispiele:

- hoher Bestellwert mit Vollretoure
- Order ohne Code und ohne klare Zuordnung
- Order mit gemischtem Code
- Order mit widersprüchlichen Rohmarkierungen
- Influencer mit hohem Volumen, aber schlechter Wirtschaftlichkeit

---

## Mindest-Checks auf Objektebene

### Influencer

Prüfen:

- eindeutige ID
- Name vorhanden
- primärer Rabattcode vorhanden
- Profilzuordnung vorhanden

### Rabattcode

Prüfen:

- Code ist eindeutig
- genau einem Influencer zugeordnet
- `is_mixed` sauber gepflegt

### Bestellung

Prüfen:

- eindeutige ID
- Datum vorhanden
- Umsatzwert plausibel
- Statuswerte gültig
- Rabattcode-Logik konsistent
- Refund-Logik konsistent

---

## Ergebnis der Validierung

Die Validierung sollte mindestens drei Ausgänge kennen:

- `bestanden`
- `bestanden_mit_hinweisen`
- `nicht_bestanden`

Optional:

- Fehlerliste
- Warnungsliste
- kurzer Prüfbericht