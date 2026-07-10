import Link from 'next/link';
import LobbyThemeSwitcher from './LobbyThemeSwitcher';
import type { LobbyThemeId } from './lobby-theme';

interface LobbyNavProps {
  /** Thème lobby actif (pour le switcher). */
  themeValue: LobbyThemeId;
  /** Changement de thème depuis le switcher. */
  onThemeChange: (id: LobbyThemeId) => void;
}

/**
 * Barre de navigation sticky de la landing « lobby » (#245, épic #243).
 *
 * Marque (pastille coral + cœur) → `/`, liens réels (`/manifesto`, `/login`),
 * switcher de thème (foundation #244) et CTA `/register`. Style via classes
 * `.lobby-nav*` de `globals.css` (tokens `--lobby-*`, focus ring coral, cibles
 * ≥ 44px, `overflow-x:auto` en mobile). A11y : marque et liens = vrais `<a>`
 * (Next `Link`), switcher = `<button>` `aria-pressed`.
 */
export default function LobbyNav({ themeValue, onThemeChange }: LobbyNavProps) {
  return (
    <nav className="lobby-nav" aria-label="Navigation principale">
      <Link href="/" aria-label="Accueil Libre" className="lobby-nav__brand">
        <span className="lobby-nav__logo" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7.5-4.6-10-9.3C.4 8.1 2 4 6 4c2.2 0 3.8 1.3 6 3.7C14.2 5.3 15.8 4 18 4c4 0 5.6 4.1 4 7.7C19.5 16.4 12 21 12 21z" />
          </svg>
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
        <LobbyThemeSwitcher value={themeValue} onChange={onThemeChange} />
        <Link href="/register" className="lobby-nav__cta">
          Créer un compte
        </Link>
      </div>
    </nav>
  );
}
