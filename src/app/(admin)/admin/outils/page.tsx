import Link from 'next/link';

/**
 * Outils du bureau (spec 012, US8 ; #568, DESIGN.md « Coque du bureau »).
 *
 * Un index des pages qui n'ont pas leur entrée dans la navigation : elles
 * gardent leur adresse, on les atteint en deux gestes depuis l'accueil. Le
 * Guide de modération s'y ajoutera avec le reste de l'US8 (#545).
 */
const GROUPES: Array<{ titre: string; liens: Array<{ href: string; libelle: string }> }> = [
  {
    titre: 'Modération',
    liens: [
      { href: '/admin/logs', libelle: 'Historique des actions' },
      { href: '/admin/square', libelle: 'La Place' },
      { href: '/admin/circle/alerts', libelle: 'Alertes Cercle' },
    ],
  },
  {
    titre: 'Site',
    liens: [
      { href: '/admin/journal', libelle: 'Journal public' },
      { href: '/admin/features', libelle: 'Fonctionnalités' },
      { href: '/admin/appearance', libelle: 'Apparence' },
    ],
  },
  {
    titre: 'Technique',
    liens: [
      { href: '/admin/rate-limits', libelle: 'Limites de requêtes' },
      { href: '/admin/retention', libelle: 'Rétention' },
    ],
  },
];

export default function AdminOutilsPage() {
  return (
    <div className="mx-auto grid max-w-wide gap-4">
      <h1 className="text-[22px] font-semibold leading-tight text-content">Outils</h1>
      <div className="grid gap-4 min-[640px]:grid-cols-2 min-[900px]:grid-cols-3">
        {GROUPES.map((g) => (
          <section key={g.titre} className="rounded-card border border-hairline bg-surface px-2 pb-2 pt-4">
            <h2 className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{g.titre}</h2>
            <ul className="m-0 list-none p-0">
              {g.liens.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-[48px] items-center justify-between gap-2 rounded-control px-3 text-sm font-medium text-content hover:bg-fill-subtle focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    {l.libelle}
                    <span aria-hidden="true" className="text-muted">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
