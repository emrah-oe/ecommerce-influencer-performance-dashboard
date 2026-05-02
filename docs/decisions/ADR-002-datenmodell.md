# ADR-002: Datenmodell

## Status

Akzeptiert (2026-04-22)

## Kontext

Das Datenmodell bildet die fachliche Kernlogik des Systems ab: Influencer, Rabattcodes, Bestellungen, Retouren. Es muss die Attribution-Statuslogik (`clean_influencer`, `mixed_code`, `unknown`) und die Retourensicht auf Order-Ebene unterstützen.

Das Modell aus dem Testprojekt dient als Referenz, wird aber nicht 1:1 übernommen. Das Realprojekt benötigt ein robusteres Schema mit klarer Trennung von Rohdaten und abgeleiteten Statuswerten sowie einer Struktur, die spätere Erweiterungen nicht ausschließt.

Die fachliche Grundlage ist in [docs/context/Datenmodell_Synthetische_Bestellungen.md](../context/Datenmodell_Synthetische_Bestellungen.md) dokumentiert.

## Entschiedene Punkte

### Drei Kernobjekte

**Entschieden:** `Influencer`, `DiscountCode` und `Order` sind die drei Kernobjekte des Modells.

Beziehungen:
- Ein Influencer hat genau einen primären Rabattcode
- Ein Rabattcode gehört fachlich zu genau einem Influencer
- Eine Bestellung kann einen Rabattcode enthalten oder keinen
- Eine Bestellung ist einem Influencer eindeutig, unsicher oder gar nicht zugeordnet

### Attribution-Status als explizites Feld

**Entschieden:** `attribution_status` wird als abgeleitetes, explizit gespeichertes Feld an der Order geführt.

Mögliche Werte:
- `clean_influencer` – belastbare Zuordnung
- `mixed_code` – Rabattcode nicht exklusiv für Influencer-Kontext interpretierbar
- `unknown` – keine belastbare Zuordnung

**Begründung:** Der Status muss nach der Berechnung persistent gespeichert werden, damit er ohne erneute Ableitung abgefragt und im Dashboard gefiltert werden kann. Er ist Teil des fachlichen Kerns, nicht nur ein UI-Hilfswert.

### Rohdaten werden separat gespeichert und nicht überschrieben

**Entschieden:** Tags, Metafields und der rohe Order-Payload werden in separaten Feldern gespeichert und bei Updates nicht überschrieben.

Felder:
- `raw_tags`
- `raw_metafields`
- `raw_order_payload`

**Begründung:** Rohdaten sind die Grundlage für spätere Nachvollziehbarkeit, Debugging und Modell-Erweiterungen. Abgeleitete Statuswerte dürfen Rohdaten nicht ersetzen.

### `sync_runs`-Tabelle

**Entschieden:** Sync-Läufe (ob synthetisch oder Shopify-basiert) werden als eigenes Objekt protokolliert.

**Begründung:** Nachvollziehbarkeit der Datenbasis ist Grundvoraussetzung für belastbare Auswertungen.

### Attribution-Status für `DiscountCode` (`is_mixed`)

**Entschieden:** Rabattcodes erhalten ein explizites `is_mixed`-Flag, das signalisiert, ob der Code auch außerhalb des Influencer-Kontexts (z.B. in Meta Ads) verwendet wird.

**Begründung:** `mixed_code`-Orders entstehen nicht zufällig, sondern sind auf eine strukturelle Eigenschaft des Codes zurückzuführen. Das Flag ermöglicht die Ableitung von `attribution_status` ohne wiederholte Regelauswertung.

## Retourensicht

### `return_status` auf Order-Ebene ist festgelegt

**Entschieden:** Jede Order trägt einen `return_status`.

Mögliche Werte:
- `no_return`
- `partial_return`
- `full_return`

`refund_amount` wird ebenfalls auf Order-Ebene gespeichert.

**Begründung:** Für den aktuellen Scope (synthetische Daten, Dashboard) ist eine kompakte Retouren-Sicht auf Order-Ebene ausreichend und handhabbar.

### Feinere Refund- und Return-Modellierung ausgeklammert

**Entschieden:** Ein separates Return-Objekt (z.B. für mehrere Refund-Ereignisse pro Order) wurde nicht implementiert. Die aggregierte `refund_amount` auf Order-Ebene deckt den aktuellen Analysebedarf vollständig ab.

Rohdaten (`raw_tags`, `raw_metafields`, `raw_order_payload`) sind so gespeichert, dass eine spätere Erweiterung um ein separates Return-Objekt keine vollständige Datenmigration erzwingt.

## Bewusst ausgeklammert

Die folgenden Punkte liegen außerhalb des aktuellen Projektumfangs und sind nicht implementiert:

| Punkt | Begründung |
|---|---|
| Separates Return-/Refund-Objekt | Order-Ebene ausreichend für aktuellen Scope |
| Kostenfelder (Warenkosten, Fulfillment, Provision) | Nicht Teil der aktuellen Metrikenberechnung |
| Währungsfeld | Einheitliche EUR-Basis, kein Multi-Currency-Bedarf |
| Historisierung / Snapshots | Kein Zeitreihen-Bedarf auf Datensatz-Ebene |
| Produkt- oder Positionsdaten je Order | Keine SKU-Analyse im Dashboard |

## Konsequenzen

**Positiv:**
- Abgeleitete Status (`attribution_status`, `return_status`) sind direkt abfragbar ohne erneute Regelauswertung
- Rohdaten ermöglichen Reprocessing bei Regeländerungen
- Ausgeklammerte Punkte sind explizit dokumentiert, nicht implizit vereinfacht

**Zu beachten:**
- Spätere Erweiterungen um ein separates Refund-Objekt sind möglich, erfordern aber eine Migration
- `is_mixed` am DiscountCode muss gepflegt werden (im Datengenerator bzw. als Konfigurationstabelle bei Shopify-Integration)
