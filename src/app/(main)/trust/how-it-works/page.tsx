import type { Metadata } from 'next';
import Link from 'next/link';
import { TrustBadge } from '@/components/TrustBadge';
import type { TrustBand } from '@/lib/trust/compute-level';
import SiteShell from '@/components/ui/SiteShell';
import { getFeatures } from '@/lib/features-server';
import type { Feature } from '@/lib/features';

/**
 * La ligne La Place suit l'interrupteur `square` (#509) : la page est
 * régénérée au plus tard chaque minute, et tout de suite quand l'admin change
 * un interrupteur (`PUT /api/admin/features` → `revalidatePath`). Le check-in,
 * lui, n'est jamais évoqué ici, coupé ou non (#483) ; le Cercle reste, car il
 * compte dans le score quel que soit l'interrupteur.
 */
export const revalidate = 60;

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

// Facteurs de score — miroir de `scoreFactors()` / `loadFactors()`. Chaque
// `how` dit ce que le code compte vraiment, pas ce qu'on aimerait qu'il compte
// (#509) ; `feature` masque un geste devenu impossible quand l'interrupteur
// est coupé (le point déjà acquis, lui, reste compté).
const POSITIVE_FACTORS: { label: string; points: string; how: string; feature?: Feature }[] = [
  { label: 'Email vérifié', points: '+10', how: 'Acquis dès l’inscription, quand tu confirmes ton adresse.' },
  { label: 'Vérifier ton selfie', points: '+20', how: 'La vérification photo — le facteur le plus fort.' },
  { label: 'Ancienneté du compte', points: '+10 / +10 / +10', how: 'À 30, 90 puis 365 jours.' },
  { label: 'Réagir sur La Place', points: '+5', how: 'Réagis au moins une fois à un message du fil commun.', feature: 'square' },
  { label: 'Un premier match', points: '+5', how: 'Quand un intérêt devient réciproque.' },
  { label: 'Trois matchs', points: '+5', how: 'Cumulé avec le précédent (+10 au total).' },
  { label: 'Déclarer ton Cercle', points: '+10', how: 'Ajoute au moins un contact de confiance.' },
];

export default async function TrustHowItWorksPage() {
  const features = await getFeatures();
  const facteurs = POSITIVE_FACTORS.filter(({ feature }) => !feature || features[feature]);
  return (
    <SiteShell className="py-6 md:pb-section md:pt-11">
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
          {facteurs.map(({ label, points, how }) => (
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
          <span className="font-medium">signalement reçu</span> (<span>−15</span>), tant que la
          modération ne l’a pas classé sans suite, et un{' '}
          <span className="font-medium">compte banni</span> (<span>−30</span>).
        </p>
      </section>

      {/* Cercle de confiance */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-content">
          Le Cercle de Confiance
        </h2>
        <p className="text-sm text-muted">
          Ton Cercle, ce sont jusqu’à cinq membres de Libre que tu choisis comme contacts de
          confiance. Le déclarer renforce ton niveau. Tu gardes la main : tu ajoutes et retires qui
          tu veux, quand tu veux. Ajouter quelqu’un ne le prévient pas : pense à le lui dire
          toi-même.
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
    </SiteShell>
  );
}
