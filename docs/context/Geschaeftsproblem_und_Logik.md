# Geschäftsproblem und Logik

## Zweck dieser Seite

Diese Seite beschreibt das fachliche Kernproblem des Shopify Influencer Dashboards und die grundlegende Logik, mit der Bestellungen interpretiert werden.

Sie erklärt, warum reine Umsatzsicht nicht ausreicht und weshalb das Projekt bewusst mit Unsicherheit, Retouren und vereinfachten Kostenannahmen arbeitet.

---

## Ausgangsproblem

Influencer-Kooperationen im E-Commerce werden häufig über Rabattcodes ausgewertet.

Das führt schnell zu einfachen Reports wie Umsatz pro Influencer. Diese Sicht greift jedoch zu kurz, wenn die wirtschaftliche Leistung einer Kooperation realistisch bewertet werden soll.

---

## Warum reine Umsatzsicht zu kurz greift

Ein reiner Umsatzreport blendet zentrale Punkte aus:

- Retouren reduzieren den tatsächlichen wirtschaftlichen Beitrag
- Rabattcodes beweisen keine Kausalität
- geteilte oder parallel genutzte Codes erzeugen Unsicherheit
- Kosten entscheiden mit darüber, ob eine Kooperation sinnvoll war

---

## Fachliche Leitfrage

Welche Influencer-Kooperationen leisten wirtschaftlich einen sinnvollen Beitrag, wenn nicht nur Umsatz, sondern auch Retouren, geschätzte Kosten und Attributionsunsicherheit berücksichtigt werden?

---

## Rolle der Attribution

Bestellungen werden im Projekt nicht einfach vollständig einem Influencer zugerechnet.

Stattdessen werden sie anhand der verfügbaren Informationen fachlich eingeordnet.

### Attributionsstatus

- `clean_influencer`  
  Eindeutige oder vergleichsweise belastbare Zuordnung zu einem Influencer

- `mixed_code`  
  Der verwendete Rabattcode läuft auch in anderen Kanälen und ist deshalb nur eingeschränkt interpretierbar

- `unknown`  
  Keine belastbare Zuordnung möglich

### Grundsatz

Diese Statuswerte sind keine absolute Wahrheit, sondern ein bewusstes Denkmodell für die Bewertung.

Ziel ist nicht, Unsicherheit zu verstecken, sondern sie sichtbar und auswertbar zu machen.

---

## Rolle der Retouren

Retouren sind nicht nur ein technisches Detail, sondern ein zentraler Teil der wirtschaftlichen Bewertung.

Wesentliche Folgen:

- Vollretouren können den wirtschaftlichen Beitrag stark reduzieren oder vollständig neutralisieren
- Teilretouren verringern den auswertbaren Umsatz
- ohne Retourenbereinigung wird die Wirkung einer Kooperation systematisch überschätzt

---

## Rolle der Kosten

Im Testprojekt wurden Kosten bewusst vereinfacht modelliert.

Berücksichtigt wurden pauschal angenommene Kostenbestandteile wie:

- Warenkosten
- Fulfillment
- Influencer-Provision

Ziel war nicht perfekte Kostenrechnung, sondern eine nachvollziehbare Annäherung an die wirtschaftliche Frage.

---

## Grundlogik der Bewertung

Eine Kooperation soll nicht nur nach Bruttoumsatz betrachtet werden.

Für eine sinnvollere Bewertung müssen mehrere Dimensionen zusammenkommen:

- Umsatz oder bereinigter Umsatz
- Retourenlast
- Attributionsqualität
- geschätzte Kosten

Die wirtschaftliche Bewertung ist damit immer eine fachliche Näherung und keine mathematisch exakte Wahrheit.

---

## Umgang mit Unsicherheit

### `clean_influencer`

Diese Fälle sind die besten verfügbaren Referenzfälle für Vergleiche.

### `mixed_code`

Diese Fälle sind fachlich relevant, aber nur eingeschränkt belastbar.
Sie sollen sichtbar bleiben und nicht ungeprüft wie saubere Influencer-Fälle behandelt werden.

### `unknown`

Diese Fälle markieren einen echten Blindbereich.
Sie sollen nicht stillschweigend einzelnen Influencern zugeschlagen werden.

---

## Prototypspezifische Vereinfachung

Im Testprojekt konnten einzelne Statusfälle intern unterschiedlich behandelt oder gewichtet werden.

Wichtig ist jedoch:

Diese Art der Gewichtung gehört zum Prototyp und ist kein allgemeiner fachlicher Grundsatz dieser Seite.

Die übergeordnete Logik lautet daher nicht, dass jedem Status ein fixer universeller Zahlenwert zugewiesen wird, sondern dass die Statusgruppen unterschiedlich belastbar sind und deshalb auch unterschiedlich interpretiert werden müssen.

---

## Wichtige fachliche Aussage

Rabattcode-Attribution ist ein Proxy, kein Beweis.

Das System soll daher nicht absolute Kausalität simulieren, sondern eine strukturiertere und realistischere Bewertung unter Unsicherheit ermöglichen.

---

## Bedeutung für das Gesamtprojekt

Der Wert des Projekts liegt nicht nur im späteren Dashboard, sondern bereits in der expliziten fachlichen Logik.

Wiederverwendbar sind insbesondere:

- die Leitfrage des Problems
- die Trennung zwischen Umsatzsicht und wirtschaftlicher Bewertung
- das Denkmodell aus `clean_influencer`, `mixed_code` und `unknown`
- die Pflicht zur Retourenbereinigung
- die Sichtbarkeit von Unsicherheit

---

## Abgrenzung zu anderen Seiten

Diese Seite beschreibt die fachliche Grundlogik.

Nicht Hauptgegenstand dieser Seite sind:

- konkrete Kennzahlendefinitionen
- finale Bewertungsmetriken
- Grenzen der Aussagekraft im Detail
- technische Architektur
- Generierungsregeln für synthetische Daten

Dafür sind insbesondere relevant:

- `Metriken_und_Bewertungslogik`
- `Grenzen_und_Annahmen`
- `Architektur_und_Datenfluss`
- `Synthetische_Datenstrategie`
