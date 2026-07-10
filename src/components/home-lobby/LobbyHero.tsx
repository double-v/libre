import Link from 'next/link';
import RotatingWord from '@/components/RotatingWord';
import LobbySteps from './LobbySteps';

// Accroche : le mot défile sur des achats « loisir » devenus normaux qu'on paie
// sans broncher — plusieurs registres pour parler à plein de monde : gaming (un
// season pass), accès payant (un coupe-file), fitness (un abo à la salle),
// lifestyle (un brunch le dimanche). Toujours des catégories génériques, JAMAIS
// une app concurrente ni une marque déposée (on reste safe). On glisse le vrai
// coût annuel de la concurrence (240 €/an), une vanne (les yeux de la tête), puis
// le twist chaleureux — le seul truc qui mérite ton argent, c'est le vrai resto
// du date, pas l'appli — avant la punchline d'origine. Un seul anglicisme assumé
// (« season pass »), le reste FR — décision #240 (repris de l'ancienne home).
const HERO_WORDS = [
  'un abonnement',
  'un season pass',
  'un coupe-file',
  'un abo à la salle',
  'un brunch le dimanche',
  '240 € par an',
  'les yeux de la tête',
  'le resto de ton premier date',
  'un rond',
];

const TRUST_CHIPS = [
  { icon: '💳', label: 'Gratuit' },
  { icon: '🚫', label: 'Sans pub' },
  { icon: '🔒', label: 'Sans revente' },
  { icon: '🛡️', label: 'Modération humaine' },
];

interface LobbyHeroProps {
  /** Compteur d'utilisateurs (SSR) — repris de l'ancienne home (preuve sociale). */
  userCount?: number;
  /** Panneau latéral droit. Défaut : « Comment ça marche » (#247). Override possible. */
  sidePanel?: React.ReactNode;
}

/**
 * HERO de la landing « lobby » (#246, épic #243).
 *
 * Titre à mot rotatif (`RotatingWord`, déjà reduced-motion-safe : cycle JS coupé
 * et crossfade figé à 80ms sous `prefers-reduced-motion` ; un seul `<h1>`, pas de
 * spam lecteur d'écran). Blobs décoratifs `lobbyPulse` figés par le bloc global
 * reduced-motion. Copy FR (« Rencontrer », pas « Matcher »). Grille 2 colonnes
 * (texte / panneau) qui repasse en 1 colonne en mobile. Styles `.lobby-hero*`.
 */
export default function LobbyHero({ userCount, sidePanel }: LobbyHeroProps) {
  return (
    <section className="lobby-hero">
      <span className="lobby-blob lobby-blob--a" aria-hidden="true" />
      <span className="lobby-blob lobby-blob--b" aria-hidden="true" />

      <div className="lobby-hero__inner">
        <div className="lobby-hero__col">
          <p className="lobby-hero__eyebrow">✦ Ouvert, gratuit, pour toustes</p>

          <h1 className="lobby-hero__title">
            Rencontrer devrait <span className="lobby-hero__accent">pas</span> coûter{' '}
            <RotatingWord
              words={HERO_WORDS}
              intervalMs={4200}
              className="lobby-hero__accent"
            />
            <span className="lobby-hero__accent">.</span> 🫶
          </h1>

          <p className="lobby-hero__subtitle">
            Pas de swipe compulsif, pas de score de désirabilité, pas de carte bleue
            à chaque niveau. Juste de vraies personnes, et la liberté de choisir
            comment aller plus loin.
          </p>

          <ul className="lobby-hero__chips">
            {TRUST_CHIPS.map((chip) => (
              <li key={chip.label} className="lobby-hero__chip">
                <span aria-hidden="true">{chip.icon}</span> {chip.label}
              </li>
            ))}
          </ul>

          {userCount && userCount > 0 ? (
            <p className="lobby-hero__count">
              <span aria-hidden="true">👥</span>{' '}
              {userCount.toLocaleString('fr-FR')} célibataires ont déjà rejoint
            </p>
          ) : null}

          <div className="lobby-hero__ctas">
            <Link href="/register" className="lobby-hero__cta">
              Rejoindre la bande
            </Link>
            <Link href="/login" className="lobby-hero__cta lobby-hero__cta--ghost">
              Se connecter
            </Link>
          </div>
        </div>

        <div className="lobby-hero__aside">{sidePanel ?? <LobbySteps />}</div>
      </div>
    </section>
  );
}
