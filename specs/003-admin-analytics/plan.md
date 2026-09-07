# Plan 003 — Dashboard admin analytics

Plan d’implémentation détaillé : `.claude/plans/dashboard-admin-analytics.md`.

Décisions clés :
- Enrichir `/admin` existant (pas de nouvelle route).
- 4 packs d’indicateurs : État des profils, Démographie, Engagement & rétention, Modération.
- Rendu en barres CSS natives, 0 librairie externe.

Fichiers concernés :
- `src/lib/admin-analytics.ts`
- `src/app/api/admin/stats/route.ts`
- `src/app/(admin)/admin/page.tsx`
- `src/components/admin/MetricCard.tsx`
- `src/components/admin/DistributionBar.tsx`
- `src/components/admin/AnalyticsSection.tsx`
- Tests API / page / lib
