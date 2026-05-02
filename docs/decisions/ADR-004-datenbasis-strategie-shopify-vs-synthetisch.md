# ADR-004: Zwei-Datenbasis-Strategie – Shopify Dev Store als Integrationsnachweis, Supabase als analytische Datenbasis

## Status

Akzeptiert (2026-04-25)

## Kontext

Das Dashboard hat zwei klar getrennte Anforderungen, die sich mit einer einzigen Datenquelle nicht gleichzeitig erfüllen lassen:

| Anforderung | Problem mit echten Shopify-Daten | Problem mit rein synthetischen Daten |
|---|---|---|
| Wirtschaftliche Aussagekraft (Metriken, Charts, Filter) | 6 Shopify-Orders liefern keine sinnvollen Aggregate | — |
| Nachweis realer Shopify-Integration (API, Mapping, Sync) | — | Kein echter API-Aufruf, kein reales Webhook-/Payload-Format |
| Attributionsstatus-Verteilung (alle 3 Klassen belegt) | 6 Orders: Klassen nicht zuverlässig repräsentiert | Vollständig kontrolliert möglich |
| Retourenverteilung statistisch belastbar | 6 Orders: ein Ausreißer verzerrt alles | Deterministisch generierbar |

Das Projekt demonstriert zwei technische Pfade:
1. Shopify Admin API kann angesprochen, der Response geparst und ins relationale Modell überführt werden.
2. Supabase skaliert für eine realistische analytische Datenbasis (vier- bis fünfstellige Order-Zahlen).

## Entscheidung

**Zwei Datenquellen mit klar getrennten Rollen:**

### 1. Shopify Dev Store – Integrationsnachweis

Der Shopify Dev Store liefert einen repräsentativen Stichproben-Datensatz. Er beweist, dass folgende technische Pfade funktionieren:

- Authentifizierung gegen die Shopify GraphQL Admin API
- Pagination über Order-Endpunkte
- Mapping von Shopify-Feldnamen auf das interne Datenmodell (via `src/sync/`)
- Upsert-Logik mit Erhalt von `raw_order_payload` / `raw_tags`
- Protokollierung im `sync_runs`-Objekt

Die Shopify-Daten erscheinen **nicht** im Haupt-Dashboard (ADR-003), sind aber in der Datenbank enthalten und über Prisma Studio oder einen dedizierten Sync-Status-Bereich prüfbar.

### 2. Synthetische Datenbasis (Supabase) – analytische Datenbasis

30 Influencer, 24.000 Orders, generiert mit deterministischem Seed:

- Alle drei `attribution_status`-Klassen proportional belegt
- Retouren-Quoten nach fachlicher Spezifikation verteilt
- Umsatzverteilung realistisch (rechtsschief, Ausreißer eingeschlossen)
- Vollständig reproduzierbar (`npm run generate`)

Diese Datenbasis ist der einzige Inhalt des Haupt-Dashboards und aller Metriken.

## Shopify-Stichprobe

Zielgröße: **150 Orders** insgesamt. Der codebasierte Anteil (~125 Orders) wird über alle 30 im Dev Store vorhandenen Rabattcodes verteilt; ~25 Orders bleiben bewusst code-los (`unknown`).

### Rahmenbedingungen

- **Keine neuen Discount Codes.** Die 30 bestehenden Codes werden unverändert verwendet.
- **Keine CSV als Datenquelle.** Die Codes werden zu Laufzeit per Shopify GraphQL Admin API gelesen (`discountNodes`-Query oder `codeDiscountNodes`), nicht aus einer lokalen Datei.
- **Keine manuelle Massenerfassung.** Alle 150 Orders werden programmatisch per `orderCreate`-Mutation erzeugt.
- **Kein Produktionskatalog erforderlich.** `orderCreate` erlaubt custom line items ohne bestehende Produkt-IDs im Dev Store.

### Verteilungen

Die Verteilungen orientieren sich am bestehenden Supabase-Seed (synthetischer Datengenerator), damit die Stichprobe repräsentativ und konsistent mit der analytischen Datenbasis ist:

| Parameter | Zielwert | Orientierung am Supabase-Seed |
|---|---|---|
| Orders gesamt | 150 | — |
| Discount Codes genutzt | 30 (alle vorhandenen) | Alle 30 Codes werden mehrfach genutzt; `unknown`-Orders bleiben bewusst code-los |
| `clean_influencer`-Orders | ~105 (70 %) | Entspricht der Generator-Quote für eindeutige Attributionen |
| `mixed_code`-Orders | ~20 (13 %) | Entspricht dem `is_mixed`-Anteil im Generator |
| `unknown`-Orders (kein Code) | ~25 (17 %) | Entspricht dem Code-losen Anteil im Generator |
| Retouren gesamt | ~20 Orders (~13 %) | Entspricht Retourenquote im Generator |
| davon `partial_return` | ~12 | Proportional zum Generator-Split |
| davon `full_return` | ~8 | Proportional zum Generator-Split |
| Zeitraum (fiktive `created_at`) | 90 Tage | Gleichmäßig verteilt, analog zur Generator-Zeitachse |
| Umsatz-Bandbreite pro Order | 30–250 € | Entspricht der Generator-Verteilung (rechtsschief) |

### Umsetzungsweg

1. **Codes per API laden:** GraphQL-Query gegen den Dev Store – `codeDiscountNodes`-Endpunkt liefert alle aktiven Rabattcodes inklusive Typ (`PERCENTAGE` / `FIXED_AMOUNT`) und Code-String. Die Influencer-Zuordnung wird aus dem Rabattcode selbst abgeleitet (z. B. `MARIO25` → `influencer_mario`), nicht aus dem Discount-Titel. Ergebnis: Array mit 30 Code-Objekten inkl. abgeleiteter Influencer-ID.
2. **150 Order-Definitionen generieren:** Script verteilt Orders gemäß den obigen Quoten auf die 30 Codes; `unknown`-Orders erhalten keinen Code; Retouren werden als Flags mitgeführt.
3. **`orderCreate`-Mutationen ausführen:** Script `scripts/shopify-seed-orders.ts` ruft sequenziell (Rate Limit beachten) je eine Mutation pro Order auf; `discountCode` aus Schritt 1.
4. **Sync ausführen:** Bestehender Sync-Lauf überträgt die 150 Orders nach Supabase und belegt den vollständigen technischen Pfad API → Mapping → DB.

### Was dieser Datensatz nachweist

- Shopify GraphQL Admin API: Query (`codeDiscountNodes`) **und** Mutation (`orderCreate`) in einem Script
- Mapping-Schicht (`src/sync/`): reale Shopify-Payload-Struktur für alle 3 Attributionspfade verarbeitet
- Attribution-Logik: alle 3 Statusklassen aus programmatisch erzeugten, aber API-konformen Shopify-Orders abgeleitet
- Verteilungskonsistenz: Shopify-Stichprobe und synthetische Supabase-Datenbasis folgen denselben fachlichen Quoten
- `sync_runs`-Protokoll: dokumentiert Lauf mit Zeitstempel, Anzahl verarbeiteter Orders, Fehlerrate

## Begründung

1. **Trennungsprinzip:** Integrationsnachweis und analytische Aussagekraft sind orthogonale Qualitätsdimensionen. Eine gemeinsame Datenbasis würde beide verwässern.
2. **Skalierungsnachweis für Supabase:** 24.000 synthetische Orders bei sub-500ms Query-Zeit (mit Prisma, kein Raw-SQL) demonstriert, dass das Datenmodell und die Query-Struktur produktionstauglich sind.
3. **Kontrolle über Demo-Narrative:** Synthetische Daten ermöglichen eine präzise gesteuerte Darstellung aller Szenarien ohne Abhängigkeit von tatsächlichem Kaufverhalten im Dev Store.
4. **Ehrlichkeit:** ADR-003 dokumentiert explizit, was im Dashboard zu sehen ist und was nicht. Ein Reviewer, der die ADRs liest, erkennt die bewusste Entscheidung – kein implizites Verstecken.

## Konsequenzen

- Der Shopify-Integrationspfad ist über die `sync_runs`-Tabelle oder Prisma Studio nachvollziehbar (Zeitstempel, verarbeitete Orders, Fehlerrate).
- Langfristig (produktiver Betrieb): Entscheidung revidieren, synthetischen Datensatz durch Produktionsdaten ersetzen und Ausschluss-Filter entfernen (vgl. ADR-003, Konsequenzen).
