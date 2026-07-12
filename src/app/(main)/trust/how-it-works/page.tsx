import type { Metadata } from 'next';
import Link from 'next/link';
import { TrustBadge } from '@/components/TrustBadge';
import type { TrustBand } from '@/lib/trust/compute-level';

export const metadata: Metadata = {
  title: 'Comment marche la confiance',
  description:
    'Comprendre les niveaux de confiance sur Libre, ce qu’ils veulent dire et comment les faire progresser.',
  robots: { index: true, follow: true },
};

// Les 4 bandes et leurs seuils — miroir de `bandFor()` dans
// src/lib/trust/compute-level.ts. Si les seuils bougent là-bas, mettre à jour ici.
const BANDS: { band: TrustBand; label: string; range: string; blurb: string }[] = [
  {
    band: 'newcomer',
    label: 'Nouveau',
    range: '0 – 19',
    blurb: 'Tu débutes sur Libre. Rien à prouver : la confiance se construit au fil du temps.',
  },
  {
    band: 'member',
    label: 'Membre',
    range: '20 – 49',
    blurb: 'Ton compte est établi. Email vérifié, premiers pas faits.',
  },
  {
    band: 'trusted',
    label: 'Fiable',
    range: '50 – 79',
    blurb: 'Ton identité est vérifiée et ton ancienneté parle pour toi.',
  },
  {
    band: 'anchor',
    label: 'Ancre',
    range: '80 et +',
    blurb: 'Un pilier de la communauté : vérifié, ancien, entouré d’un Cercle.',
  },
];

// Facteurs de score — miroir de `scoreFactors()` / `factorsToDisplay()`.
const POSITIVE_FACTORS: { label: string; points: string; how: string }[] = [
  { label: 'Vérifier ton email', points: '+10', how: 'Depuis tes paramètres, confirme ton adresse.' },
  { label: 'Vérifier ton selfie', points: '+20', how: 'La vérification photo — le facteur le plus fort.' },
  { label: 'Ancienneté du compte', points: '+10 / +10 / +10', how: 'À 30, 90 puis 365 jours.' },
  { label: 'Réagir sur La Place', points: '+5', how: 'Participe au fil commun au moins une fois.' },
  { label: 'Un match validé', points: '+5', how: 'Une vraie rencontre confirmée.' },
  { label: 'Trois matchs validés', points: '+5', how: 'Cumulé avec le précédent (+10 au total).' },
  { label: 'Déclarer ton Cercle', points: '+10', how: 'Ajoute au moins un contact de confiance.' },
];

const NEGATIVE_FACTORS: { label: string; points: string; how: string }[] = [
  { label: 'Signalement actif', points: '−15', how: 'Un signalement reçu non résolu pèse sur ton score.' },
  { label: 'Compte banni', points: '−30', how: 'Une exclusion fait chuter le niveau.' },
];

export default function TrustHowItWorksPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-content">
          Comment marche la confiance
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sur Libre, la confiance n’est pas une note qu’on te colle : c’est un repère qui se
          construit doucement, pour que chacun·e sache à qui il ou elle parle. Aucun classement,
          aucune compétition — juste des signaux qui rassurent.
        </p>
      </header>

      {/* Les 4 niveaux */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-content">
          Les quatre niveaux
        </h2>
        <ul className="space-y-3">
          {BANDS.map(({ band, label, range, blurb }) => (
            <li
              key={band}
              className="flex items-center gap-4 rounded-xl bg-blush p-4 dark:bg-coral/10"
            >
              <TrustBadge band={band} size="md" />
              <div className="min-w-0">
                <p className="font-semibold text-coral-dark dark:text-coral-light">
                  {label} <span className="font-normal text-muted">· {range}</span>
                </p>
                <p className="text-sm text-muted">{blurb}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Comment monter */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-content">
          Faire grandir ta confiance
        </h2>
        <ul className="divide-y divide-sand rounded-xl border border-sand dark:divide-gray-800">
          {POSITIVE_FACTORS.map(({ label, points, how }) => (
            <li key={label} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-content">{label}</p>
                <p className="text-xs text-muted">{how}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-coral-dark dark:text-coral-light">
                {points}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Deux situations font baisser le niveau : un{' '}
          <span className="font-medium">signalement actif</span> ({NEGATIVE_FACTORS[0].points}) et un{' '}
          <span className="font-medium">compte banni</span> ({NEGATIVE_FACTORS[1].points}).
        </p>
      </section>

      {/* Cercle de confiance */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-content">
          Le Cercle de Confiance
        </h2>
        <p className="text-sm text-muted">
          Ton Cercle, ce sont les personnes que tu choisis comme contacts de confiance. Le déclarer
          renforce ton niveau et pose un filet de sécurité : tu n’es jamais seul·e derrière l’écran.
          Tu gardes la main — tu ajoutes et retires qui tu veux, quand tu veux.
        </p>
      </section>

      <div className="rounded-xl border border-coral/20 bg-coral/5 p-4 text-center dark:border-coral/30 dark:bg-coral/10">
        <Link
          href="/settings/trust"
          className="text-sm font-semibold text-coral-dark underline decoration-coral/40 underline-offset-2 hover:decoration-coral dark:text-coral-light"
        >
          Voir mon niveau et mon Cercle
        </Link>
      </div>
    </div>
  );
}
