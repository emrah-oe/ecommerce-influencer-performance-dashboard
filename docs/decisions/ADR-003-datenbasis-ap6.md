# ADR-003: Datenbasis-Strategie – Dashboard nutzt ausschließlich synthetische Daten

## Status

Akzeptiert (2026-04-25)

## Kontext

In Supabase liegen zwei Datenquellen vor:

| Quelle | Influencer | Orders | Kennzeichen |
|---|---|---|---|
| Synthetischer Generator | 30 | 24.000 | keine `shopify_` / `inf_shopify_`-IDs |
| Shopify Admin API | 4 | 6 | Influencer-IDs: `inf_shopify_*`, Order-IDs: `shopify_*` |

Die synthetischen Daten decken alle fachlich relevanten Szenarien ab: alle drei Attributionsstatus-Klassen (`clean_influencer`, `mixed_code`, `unknown`), realistische Retourenquoten und Umsatzverteilungen. Die 6 Shopify-Orders sind ein technischer Fixture-Datensatz ohne inhaltliche Aussagekraft.

## Entscheidung

Das Hauptdashboard schließt Shopify-Testorders explizit aus seinen Queries aus.

Die Filterung nutzt die bestehenden ID-Konventionen:
- Influencer mit `id LIKE 'inf_shopify_%'` werden aus Dashboard-Aggregaten ausgeschlossen.
- Orders mit `orderId LIKE 'shopify_%'` werden ebenfalls ausgeschlossen.

Shopify-Daten bleiben in der Datenbank erhalten und dienen als Nachweis, dass der Sync-Kanal (Shopify → Supabase) korrekt funktioniert. Sie erscheinen nicht im Hauptdashboard.

## Begründung

1. **Statistische Aussagekraft:** 6 Orders über 4 Influencer liefern keine sinnvollen Metriken. Jede gemeinsame Visualisierung wäre irreführend.
2. **Fachliche Vollständigkeit:** Nur der synthetische Datensatz deckt alle Attributionsstatus-Klassen und Randszenarien planmäßig ab.
3. **Konsistenz der Demo-Aussage:** Das Dashboard soll eine wirtschaftlich plausible Kooperationsauswertung zeigen – das ist nur mit dem synthetischen Datensatz möglich.
4. **Trennung von Belangen:** Sync-Korrektheit und Dashboard-Inhalt sind separate Qualitätsdimensionen.

## Konsequenzen

- Dashboard-Queries enthalten einen expliziten Ausschluss-Filter auf Basis der ID-Präfixe.
- Kein Schema-Change erforderlich: Die ID-Konvention ist bereits implementiert.
- Optional kann später ein dediziertes `source`-Feld (`synthetic` / `shopify`) ergänzt werden, sobald weitere Datenquellen hinzukommen. Der Filter wäre dann expressiver, aber inhaltlich äquivalent.
- Sobald echte Shopify-Produktionsdaten in relevantem Umfang vorliegen, wird diese Entscheidung revidiert: der synthetische Datensatz wird dann durch Produktionsdaten ersetzt und der Ausschluss-Filter entfällt.
