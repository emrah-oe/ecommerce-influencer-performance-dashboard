# Architekturübersicht

## Zweck

Dieses Dokument beschreibt das Schichtenmodell und den Datenfluss des Shopify Influencer Dashboards als operative Referenz für die Implementierung.

Es basiert auf den Erkenntnissen des Testprojekts ([docs/context/Architektur_und_Datenfluss.md](../context/Architektur_und_Datenfluss.md)) und beschreibt die Zielarchitektur des Realprojekts.

---

## Grundprinzip

Die Architektur folgt einer strikten Schichtenstruktur. Jede Schicht hat eine klar abgegrenzte Verantwortung. Businesslogik läuft nicht in der UI oder im Datenzugriff – sie ist in der Aufbereitungs- und Metrikschicht isoliert.

```
Datenquelle
    │
    ▼
Aufbereitungs- und Mapping-Schicht
    │
    ▼
Persistenz-Schicht (PostgreSQL via Supabase)
    │
    ▼
Metrik- und Logik-Schicht
    │
    ▼
Präsentations-Schicht (Next.js Dashboard)
    │
    ▼
(Betriebs- und Integrations-Schicht – Phase 2+)
```

---

## Schichten

### 1. Datenquellen-Schicht

**Verantwortung:** Eingang der Daten in das System.

**Phase 1 (synthetisch):**
- Datengenerator erzeugt strukturierte Testdaten nach konfigurierbaren Parametern
- Output: JSON-Dateien unter `data/synthetic/`
- Reproduzierbar durch festen Seed

**Phase 2 (Shopify):**
- Shopify Admin API liefert echte Orders, Rabattcodes und Retourensignale
- Tags und Metafields als Retourenquellen

**Verzeichnis:** `scripts/` (Generator), `data/` (Ausgabe)

---

### 2. Aufbereitungs- und Mapping-Schicht

**Verantwortung:** Rohdaten in auswertbare Struktur überführen.

Dies ist die fachlich wichtigste Schicht, weil hier die Interpretationslogik entsteht:

- Rabattcodes extrahieren und Influencer zuordnen
- `attribution_status` ableiten (`clean_influencer`, `mixed_code`, `unknown`)
- Retourensignale aus Tags und Metafields normalisieren
- `return_status` setzen (`no_return`, `partial_return`, `full_return`)
- Refund-Beträge verarbeiten
- Rohdaten (`raw_tags`, `raw_metafields`, `raw_order_payload`) erhalten

**Verzeichnis:** `src/sync/`

Zentrale Dateien (geplant):
- `src/sync/mapOrder.ts` – Order auf internes Modell mappen
- `src/sync/parseOrderTags.ts` – Retourentags auswerten
- `src/sync/syncOrders.ts` – Sync-Durchlauf koordinieren

---

### 3. Persistenz-Schicht

**Verantwortung:** Strukturierte Speicherung aufbereiteter Daten.

Datenbank: PostgreSQL via Supabase Managed.
Zugriff: Prisma ORM mit typsicherem Schema.

Kernobjekte:
- `influencers`
- `discount_codes`
- `orders`
- `sync_runs`

Die Trennung zwischen Rohdaten und abgeleiteten Statuswerten ist im Schema explizit:
- Rohfelder (`raw_tags`, `raw_metafields`, `raw_order_payload`) werden nie überschrieben
- Abgeleitete Felder (`attribution_status`, `return_status`, `attributed_influencer_id`) sind separate Spalten

**Verzeichnis:** `prisma/`

---

### 4. Metrik- und Logik-Schicht

**Verantwortung:** Kennzahlen und Bewertungslogik berechnen.

Getrennt von UI-Logik. Berechnet werden:
- Bruttoumsatz, Refund-Summe, Nettoumsatz
- Retourenquote
- Anteil `clean_influencer`, `mixed_code`, `unknown` pro Influencer
- Wirtschaftlicher Beitrag (Netto abzüglich geschätzter Kosten)

**Verzeichnis:** `src/metrics/`

Geplante Dateien:
- `src/metrics/orderMetrics.ts`
- `src/metrics/influencerMetrics.ts`
- `src/metrics/summaryMetrics.ts`

Zusätzlich für Attribution und Retouren:

**Verzeichnis:** `src/logic/`

Geplante Dateien:
- `src/logic/attribution.ts` – Attribution-Status ableiten
- `src/logic/returns.ts` – Retouren normalisieren

---

### 5. Präsentations-Schicht

**Verantwortung:** Kennzahlen verständlich darstellen.

Serverseitiges Datenladen via Next.js App Router. Metriken werden server-seitig aggregiert, nicht im Client berechnet.

Anforderungen an die Darstellung:
- Influencer-Vergleich mit KPIs
- `attribution_status`-Verteilung sichtbar
- `mixed_code`- und `unknown`-Anteile werden nicht versteckt
- Filterlogik: Zeitraum, Attribution-Status, Influencer

**Verzeichnis:** `src/app/`, `src/components/`

---

### 6. Betriebs- und Integrations-Schicht (Phase 2+)

**Verantwortung:** Produktionsnahe Betriebsfähigkeit.

Als mögliche Erweiterungen vorgesehen:

- Authentifizierung (Supabase Auth, interne Nutzer)
- Sync-Frequenz und Scheduling
- Fehlerbehandlung, Retries, partieller Sync
- Monitoring und Logging
- Deployment-Ziel (Vercel Phase 1, GCP offen)

---

## Datenfluss

### Phase 1 (synthetische Daten)

```
Datengenerator (scripts/generate-orders.ts)
    │ JSON-Ausgabe
    ▼
Mapping & Tag-Auswertung (src/sync/)
    │ attribution_status, return_status gesetzt
    ▼
Upsert in PostgreSQL via Prisma
    │
    ▼
Kennzahlenberechnung (src/metrics/, src/logic/)
    │
    ▼
Server-seitige Aggregation für Dashboard (src/app/)
    │
    ▼
Dashboard-Anzeige (src/components/)
```

### Phase 2 (Shopify Admin API)

```
Shopify Admin API (Orders, Discounts, Refunds)
    │ Shopify-Rohdaten
    ▼
Mapping & Normalisierung (src/sync/)
    │ Shopify-Feldnamen → internes Modell
    ▼
[wie Phase 1 ab Upsert]
```

Der Wechsel von synthetischen Daten auf echte Shopify-Daten betrifft ausschließlich die Datenquellen- und Mapping-Schicht. Metrik-, Persistenz- und Dashboard-Schicht bleiben unverändert.

---

## Abgrenzung: Testprojekt vs. Realprojekt

| Aspekt | Testprojekt | Realprojekt |
|---|---|---|
| Datenquelle | Statische Mock-Datei (`mockShopifyOrders.ts`) | Datengenerator (Phase 1), Shopify API (Phase 2) |
| Sync-Logik | Nicht vorhanden | Explizit, protokolliert in `sync_runs` |
| Fehlerbehandlung | Minimal | Explizit, keine stillen Fallbacks |
| Schema | Auf Showcase ausgelegt | Robustes Produktionsschema |
| UI | Proof-of-Concept | Unsicherheit explizit visualisiert, filterbar |
| Auth | Nicht vorhanden | Supabase Auth und rollenbasierte interne Nutzung |

Kein Code aus dem Testprojekt wird direkt portiert. Die Schichtenstruktur dient als konzeptionelles Vorbild.
