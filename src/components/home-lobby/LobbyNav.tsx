import Link from 'next/link';
import HeartMark from '@/components/ui/HeartMark';

/**
 * Barre de navigation sticky de la landing « lobby » (#245, épic #243).
 *
 * Marque (pastille coral + cœur) → `/`, liens réels (`/manifesto`, `/login`) et
 * CTA `/register`. **Pas de sélecteur de thème** ici : la landing s'adresse aux
 * visiteurs non connectés et présente le **thème par défaut du site** (impression
 * de marque cohérente) ; la personnalisation vit dans l'app connectée (Paramètres).
 * Style via classes `.lobby-nav*` de `globals.css` (tokens `--lobby-*`, focus ring
 * coral, cibles ≥ 44px, `overflow-x:auto` en mobile). A11y : marque et liens =
 * vrais `<a>` (Next `Link`).
 */
export default function LobbyNav() {
  return (
    <nav className="lobby-nav" aria-label="Navigation principale">
      <Link href="/" aria-label="Accueil Libre" className="lobby-nav__brand">
        <span className="lobby-nav__logo" aria-hidden="true">
          <HeartMark width={18} height={18} />
        </span>
        <span className="lobby-nav__wordmark">Libre</span>
      </Link>

      <div className="lobby-nav__links">
        <Link href="/manifesto" className="lobby-nav__link">
          Manifesto
        </Link>
        <Link href="/login" className="lobby-nav__link">
          Se connecter
        </Link>
      </div>

      <div className="lobby-nav__actions">
        <Link href="/register" className="lobby-nav__cta">
          Créer un compte
        </Link>
      </div>
    </nav>
  );
}
