# Datenmodell Synthetische Bestellungen

## Zweck

Diese Seite beschreibt die fachlichen Datenbausteine für die synthetische Bestellwelt im Shopify Influencer Dashboard.

Sie legt fest, welche Objekte, Felder und Statuswerte benötigt werden.
Sie legt noch nicht fest, mit welchen Wahrscheinlichkeiten oder Verteilungen diese Daten erzeugt werden.

---

## Modellgrenzen

Diese Seite beschreibt das fachliche Zielmodell für die Simulation.

Nicht Gegenstand dieser Seite:

- konkrete Generierungswahrscheinlichkeiten
- technische Implementierung des Generators
- echte Shopify API Felder im Detail
- Metriken und Bewertungslogik

---

## Zentrale Datenobjekte

### 1. Influencer

Ein Influencer ist die zentrale fachliche Zuordnungseinheit.

Pflichtfelder:

- `influencer_id`
- `influencer_name`
- `primary_discount_code`
- `code_usage_type`
- `performance_profile`
- `return_profile`
- `is_active`

Mögliche Werte:

- `code_usage_type`
  - `exclusive`
  - `mixed_with_meta_ads`

---

### 2. Rabattcode

Rabattcodes werden als eigener Datenbaustein modelliert und nicht nur als Textfeld an Orders geführt.

Pflichtfelder:

- `discount_code`
- `influencer_id`
- `is_mixed`
- `is_active`

Optionale Felder:

- `valid_from`
- `valid_to`
- `channel_note`

Hinweis:

- Im Testcase hat jeder Influencer einen eigenen Rabattcode
- Dieselben Codes können teilweise zusätzlich in Meta Ads verwendet werden

---

### 3. Bestellung

Die Bestellung ist das zentrale Analyseobjekt.

Pflichtfelder:

- `order_id`
- `order_date`
- `gross_revenue`
- `used_discount_code`
- `has_discount_code`
- `attribution_status`
- `return_status`
- `refund_amount`
- `raw_tags`
- `raw_metafields`
- `raw_order_payload`

Mögliche Werte:

- `attribution_status`
  - `clean_influencer`
  - `mixed_code`
  - `unknown`

- `return_status`
  - `no_return`
  - `partial_return`
  - `full_return`

Empfohlene Zusatzfelder:

- `attributed_influencer_id`
- `order_value_bucket`
- `is_edge_case`
- `notes`

---

### 4. Retouren und Refund-Sicht

Retouren müssen fachlich von der Bestellung unterscheidbar sein, auch wenn sie zunächst auf Order-Ebene mitgeführt werden.

Minimal benötigte Informationen:

- `return_status`
- `refund_amount`
- `return_source`
- `raw_tags`
- `raw_metafields`

Mögliche Werte:

- `return_source`
  - `tag`
  - `metafield`
  - `none`

Hinweis:

- Für den aktuellen Projektstand reicht eine kompakte Retouren-Sicht auf Order-Ebene
- Ein separates Return-Objekt ist nur nötig, wenn später mehrere Refund-Ereignisse pro Bestellung simuliert werden sollen

---

## Beziehungen

### Fachliche Beziehungen

- Ein Influencer hat im Testcase genau einen primären Rabattcode
- Ein Rabattcode gehört fachlich zu genau einem Influencer
- Eine Bestellung kann einen Rabattcode enthalten oder keinen
- Eine Bestellung kann einem Influencer klar, unsicher oder gar nicht zugeordnet sein
- Eine Bestellung kann keine, eine teilweise oder eine vollständige Retoure aufweisen

---

## Minimal notwendige Statuslogik

### Attribution

- `clean_influencer`
  - Bestellung ist eindeutig einem Influencer zuordenbar

- `mixed_code`
  - verwendeter Rabattcode ist nicht exklusiv für den Influencer-Kontext interpretierbar

- `unknown`
  - keine belastbare Zuordnung möglich

### Retoure

- `no_return`
  - keine Retoure erfasst

- `partial_return`
  - nur ein Teil der Bestellung wurde retourniert oder refundet

- `full_return`
  - Bestellung wurde wirtschaftlich vollständig rückabgewickelt

---

## Empfohlene Modellstruktur für die Notizen

### Kernobjekte

- Influencer
- Rabattcode
- Bestellung

### Ergänzende Rohdatenfelder

- Tags
- Metafields
- Rohpayload

### Abgeleitete Felder

- `attribution_status`
- `attributed_influencer_id`
- `return_status`

Hinweis:

Abgeleitete Felder bleiben Teil des Modells, auch wenn sie erst während der Generierung oder Vorverarbeitung befüllt werden.

---

## Nicht festgelegt

Diese Seite legt bewusst noch nicht fest:

- genaue Anzahl der Monate
- exakte Feldnamen einer Datenbank
- konkrete Shopify Importlogik
- exakte Kostenfelder
- Produkt- oder Positionsdaten je Order