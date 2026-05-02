# ADR-001: Tech Stack

## Status

Akzeptiert (2026-04-22)

## Kontext

Das Shopify Influencer Dashboard wird als eigenständiges Analyseprojekt neu aufgebaut. Der Stack (TypeScript, Next.js, PostgreSQL via Supabase, Prisma) hat sich fachlich bewährt und eignet sich für produktionsreifen Betrieb mit Supabase Auth.

Zielgruppe: interne Nutzung. Kein Multi-Tenant-Betrieb erforderlich.

## Entscheidungen

### Next.js 14+ (App Router) mit TypeScript

**Entschieden:** Next.js 14+ als Fullstack-Framework mit App Router.

**Begründung:**
- Vollstack: API-Routen, Datenbankzugriff und UI im selben Framework ohne separaten Backend-Service
- App Router ermöglicht serverseitige Datenaggregation direkt vor der UI-Schicht (Metriken-Berechnungen bleiben server-seitig)
- TypeScript erzwingt Typsicherheit über alle Schichten (Datenmodell, Metriken, UI)
- Aus dem Testprojekt bekannt und bewährt

### Supabase (Managed PostgreSQL + Auth)

**Entschieden:** Supabase als verwalteter PostgreSQL-Dienst inklusive Auth.

**Begründung:**
- Managed Service reduziert Betriebsaufwand (kein eigenes Datenbankmanagement)
- Supabase Auth deckt die Phase-1-Anforderung (interne Nutzer) ohne separate Lösung ab
- Relationale Datenstruktur (Influencer, Codes, Orders, Refunds) ist für PostgreSQL geeigneter als für NoSQL
- Prisma-Kompatibilität gegeben

**Firebase (Firestore) wurde nicht gewählt:** Firestore eignet sich weniger gut für relationale Datenmodelle mit Joins und Aggregationen, wie sie für die Metrikenberechnung benötigt werden.

### Prisma ORM

**Entschieden:** Prisma als ORM für Datenbankzugriff und Schema-Management.

**Begründung:**
- Typsichere Datenbankabfragen ohne manuelle SQL-Verwaltung
- Prisma Migrate für nachvollziehbare Schema-Migrationen
- Schema als Single Source of Truth für Datenmodell
- Aus dem Testprojekt bekannt, auf Supabase direkt anwendbar

### Tailwind CSS

**Entschieden:** Tailwind CSS für Styling.

**Begründung:**
- Kein eigenes Design-System nötig, konsistentes Utility-first Styling
- Ermöglicht schnelle Dashboard-Entwicklung ohne Frontend-Framework-Overhead

### Vercel (Phase 1 Deployment)

**Entschieden:** Vercel für das initiale Deployment in Phase 1.

**Begründung:**
- Zero-Config-Deployment für Next.js
- Preview Deployments für schnelle Iterationen
- Kein Infrastruktur-Setup erforderlich

**Langfrist-Deployment (GCP vs. Vercel) ist bewusst offen gehalten.** GCP kann für spätere Phasen relevant werden, insbesondere wenn Cloud Run oder andere GCP-Dienste genutzt werden sollen.

### Shopify Admin API (Phase 2)

**Entschieden:** Shopify Admin API als Datenquelle, aber erst ab Phase 2.

**Begründung:**
- In Phase 1 kein Shopify Dev Store verfügbar
- Synthetischer Datengenerator schafft kontrollierte Testdatenbasis für Phase 1
- Abstraktion in der Mapping-Schicht (`src/sync/`) ermöglicht späteren Austausch ohne Logik-Umbau
- REST vs. GraphQL-Entscheidung für die Shopify-Integration bleibt bewusst offen bis zur Shopify-Integrationsphase

## Konsequenzen

**Positiv:**
- Bekannter Stack, keine Einarbeitungszeit für Grundkomponenten
- Vollständige Typsicherheit durch TypeScript + Prisma
- Supabase Auth deckt Phase-1-Anforderung ohne zusätzlichen Aufwand ab

**Zu beachten:**
- Vercel hat Laufzeitlimits für Serverless Functions (relevant für Sync-Jobs in der Shopify-Integrationsphase)
- Bei großem Datenvolumen oder langen Sync-Runs muss das Deployment-Ziel (GCP) neu bewertet werden
- Shopify Admin API Rate Limits erfordern in der Shopify-Integrationsphase Exponential Backoff und Pagination

## Noch offen

| Punkt | Relevant ab |
|---|---|
| GCP vs. Vercel für Produktiv-Deployment | Betriebsphase |
| Shopify REST vs. GraphQL | Shopify-Integrationsphase |
| Monitoring- und Logging-Stack | Betriebsphase |
| Supabase Auth Konfiguration (Rollen, Policies) | Auth-Phase |
