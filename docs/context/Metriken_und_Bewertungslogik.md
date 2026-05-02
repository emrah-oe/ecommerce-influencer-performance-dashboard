# Metriken und Bewertungslogik

## Zweck dieser Seite

Diese Seite beschreibt, welche Kennzahlen im Shopify Influencer Dashboard betrachtet werden und wie sie fachlich einzuordnen sind.

Sie definiert keine technische Implementierung, sondern das fachliche Bewertungsmodell hinter dem Dashboard.

---

## Ausgangspunkt

Das Projekt soll Influencer-Kooperationen nicht nur nach Umsatz, sondern belastbarer bewerten.

Wichtig sind dabei insbesondere:

- Umsatz
- Retouren
- Attributionsunsicherheit
- geschätzte Kosten
- Grenzen der Aussagekraft

---

## Grundprinzipien der Bewertung

### 1. Umsatz allein reicht nicht

Ein hoher Bruttoumsatz ist noch kein Beleg für eine wirtschaftlich gute Kooperation.

Retouren, unsichere Attribution und Kosten können die Bewertung deutlich verändern.

### 2. Attribution muss sichtbar bleiben

Nicht alle Bestellungen sind gleich belastbar zuordenbar.

Die Trennung zwischen

- `clean_influencer`
- `mixed_code`
- `unknown`

ist daher zentral für jede Kennzahleninterpretation.

### 3. Bereinigte Sicht ist wichtiger als Rohsicht

Für die wirtschaftliche Einordnung sind bereinigte Kennzahlen wichtiger als reine Rohwerte.

### 4. Unsicherheit nicht verstecken

Kennzahlen mit unsicherer Attribution sollen nicht wie saubere Referenzwerte behandelt werden.

---

## Kennzahlenebenen

### Ebene 1: Rohkennzahlen

Diese Kennzahlen zeigen die ungefilterte Ausgangssicht.

Beispiele:

- Anzahl Bestellungen
- Bruttoumsatz
- Anzahl Bestellungen mit Rabattcode
- Anzahl Bestellungen ohne Rabattcode
- Anzahl Retourenfälle
- Refund-Summe

Nutzen:

- erste Größenordnung
- Basis für weitere Bereinigung

Grenze:

- allein nicht ausreichend für die Leistungsbewertung

---

### Ebene 2: Bereinigte Kennzahlen

Diese Kennzahlen berücksichtigen Rückabwicklungen und Statuslogik.

Beispiele:

- Nettoumsatz nach Refunds
- Retourenquote nach Bestellanzahl
- Retourenquote nach Umsatzwert
- Umsatz nur aus `clean_influencer`
- Umsatz aus `mixed_code`
- Anteil `unknown`

Nutzen:

- realistischere Sicht auf tatsächlichen wirtschaftlichen Beitrag

---

### Ebene 3: Bewertungskennzahlen

Diese Kennzahlen dienen der eigentlichen Einordnung von Influencern.

Beispiele:

- geschätzter wirtschaftlicher Beitrag
- Verhältnis von Umsatz zu Retourenlast
- Stabilität der Zuordnung
- Qualität der Kooperation trotz Unsicherheit

Wichtig:

Diese Ebene ist stärker interpretationsabhängig und muss sauber dokumentiert werden.

---

## Kernmetriken

### 1. Anzahl Bestellungen

#### Definition

Anzahl der Orders, die einem Influencer oder einer Statusgruppe zugerechnet werden.

#### Sinnvolle Sichten

- Gesamtzahl aller Orders
- Orders je Influencer
- Orders je Attributionsstatus
- Orders je Retourenstatus

#### Nutzen

- Grundaktivität sichtbar machen
- Basis für Quoten und Vergleiche

---

### 2. Bruttoumsatz

#### Definition

Summe der Bestellwerte vor Abzug von Refunds.

#### Nutzen

- zeigt Reichweite und Umsatzvolumen
- einfache Ausgangsgröße

#### Grenze

- kann wirtschaftlich täuschen, wenn Retouren hoch sind

---

### 3. Refund-Summe

#### Definition

Summe der refundierten Beträge aus Teil- oder Vollretouren.

#### Nutzen

- macht wirtschaftliche Rückabwicklung sichtbar
- notwendige Basis für Nettosicht

---

### 4. Nettoumsatz nach Refunds

#### Definition

`Bruttoumsatz - Refund-Summe`

#### Nutzen

- wichtigere Kennzahl als Bruttoumsatz für die wirtschaftliche Einordnung
- reduziert Verzerrung durch hohe Retouren

Hinweis:

- genaue steuerliche oder buchhalterische Netto-Logik ist hier nicht gemeint
- gemeint ist eine fachliche Bereinigung auf Order-Ebene

---

### 5. Retourenquote nach Bestellanzahl

#### Definition

Anteil der Orders mit `partial_return` oder `full_return` an allen betrachteten Orders.

#### Formel

`Retourenquote_Anzahl = Retourenfaelle / Anzahl_Orders`

#### Nutzen

- zeigt, wie häufig Retouren in einem Influencer-Kontext auftreten

---

### 6. Retourenquote nach Umsatzwert

#### Definition

Anteil des refundierten Werts am Bruttoumsatz.

#### Formel

`Retourenquote_Wert = Refund-Summe / Bruttoumsatz`

#### Nutzen

- oft aussagekräftiger als reine Fallquote
- unterscheidet kleine von wirtschaftlich relevanten Retouren

---

### 7. Anteil sauberer und unsicherer Attribution

#### Definition

Verteilung der Orders oder Umsätze auf

- `clean_influencer`
- `mixed_code`
- `unknown`

#### Nutzen

- zeigt die Belastbarkeit der Zuordnung
- macht sichtbar, wie groß der unsichere Anteil je Influencer oder insgesamt ist

---

### 8. Umsatz aus sauberer Attribution

#### Definition

Bruttoumsatz oder Nettoumsatz nur aus Orders mit `clean_influencer`.

#### Nutzen

- wichtigste Referenzsicht für belastbar zuordenbare Leistung

---

### 9. Umsatz aus gemischter Attribution

#### Definition

Bruttoumsatz oder Nettoumsatz aus Orders mit `mixed_code`.

#### Nutzen

- zeigt potenziell relevante, aber unsichere Beiträge
- darf nicht gleich interpretiert werden wie `clean_influencer`

---

### 10. Unzugeordneter Anteil

#### Definition

Anteil von Orders oder Umsatz mit Status `unknown`.

#### Nutzen

- zeigt Grenzen der Messbarkeit
- verhindert Scheingenauigkeit

---

### 11. Geschätzter wirtschaftlicher Beitrag

#### Definition

Vorläufige Bewertungsgröße zur wirtschaftlichen Einordnung einer Kooperation.

#### Einfache Grundlogik

`geschaetzter_wirtschaftlicher_Beitrag = bereinigter_Umsatz - geschaetzte_Kosten`

Mögliche Basis:

- Nettoumsatz nach Refunds
- abzüglich pauschaler oder angenommener Influencer-Kosten

Wichtig:

- diese Kennzahl ist nur so belastbar wie die zugrunde liegenden Kostenannahmen
- fehlende Kostendetails müssen als Platzhalter oder Annahmen dokumentiert werden

---

## Bewertungslogik nach Attributionsstatus

### 1. `clean_influencer`

Bedeutung:

- beste verfügbare Referenzfälle
- am stärksten für Ranking und Vergleich geeignet

Empfohlene Nutzung:

- Hauptbasis für belastbare Auswertung
- bevorzugte Sicht im Dashboard

---

### 2. `mixed_code`

Bedeutung:

- Zuordnung ist fachlich relevant, aber nicht sauber exklusiv interpretierbar

Empfohlene Nutzung:

- separat ausweisen
- nicht ungeprüft in ein Ranking wie saubere Fälle übernehmen

---

### 3. `unknown`

Bedeutung:

- keine belastbare Zuordnung möglich

Empfohlene Nutzung:

- separat zeigen
- nicht einzelnen Influencern zuschlagen

---

## Empfohlene Dashboard-Sicht

### A. Überblick

- Gesamtzahl Orders
- Bruttoumsatz gesamt
- Nettoumsatz gesamt
- Refund-Summe gesamt
- Verteilung nach Attributionsstatus

### B. Influencer-Vergleich

Je Influencer sinnvoll:

- Anzahl Orders
- Bruttoumsatz
- Nettoumsatz
- Retourenquote Anzahl
- Retourenquote Wert
- Anteil `clean_influencer`
- Anteil `mixed_code`
- geschätzter wirtschaftlicher Beitrag

### C. Qualitäts- und Unsicherheitssicht

- Anteil unsicherer Zuordnung
- Influencer mit hohem `mixed_code` Anteil
- hoher Umsatz bei gleichzeitig hoher Retourenlast
- schwache Datenbasis trotz sichtbarer Aktivität

---

## Einfache Ranking-Logik

Eine sinnvolle Reihenfolge für erste Auswertungen ist:

### Stufe 1

Nach bereinigtem Umsatz sortieren

### Stufe 2

Retourenquote ergänzend betrachten

### Stufe 3

Attributionsqualität einbeziehen

### Stufe 4

geschätzte Kosten berücksichtigen

Hinweis:

Ein reines Endranking ohne Sicht auf Unsicherheit wäre fachlich zu grob.

---

## Was diese Seite bewusst nicht festlegt

- exakte Kostenannahmen
- finale Gewichtung für ein Gesamtscoring
- technische SQL- oder Code-Implementierung
- finale Visualisierung im UI
- externe Marketingdaten außerhalb des Testcases