import Link from 'next/link';

/**
 * Pied de page de la landing « lobby » (#250, épic #243).
 *
 * La landing publique s'adresse à des visiteurs **non connectés** : les liens
 * légaux ne peuvent pas vivre dans `/settings` (règle app shell de DESIGN.md).
 * Ce footer les préserve donc — CGU, confidentialité, mentions légales, FAQ —
 * plus le social (TikTok), le code source ouvert et le contact presse, à
 * l'identique de l'ancienne home (aucune régression légale/SEO). Style via
 * classes `.lobby-footer*` (tokens `--lobby-*`, zéro hex inline).
 */
const LEGAL_LINKS = [
  { href: '/cgu', label: 'Conditions générales d’utilisation' },
  { href: '/confidentialite', label: 'Politique de confidentialité' },
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/faq/session-expiree', label: 'FAQ' },
];

export default function LobbyFooter() {
  return (
    <footer className="lobby-footer">
      <div className="lobby-footer__inner">
        <div className="lobby-footer__brand">
          <span className="lobby-footer__logo" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7.5-4.6-10-9.3C.4 8.1 2 4 6 4c2.2 0 3.8 1.3 6 3.7C14.2 5.3 15.8 4 18 4c4 0 5.6 4.1 4 7.7C19.5 16.4 12 21 12 21z" />
            </svg>
          </span>
          <span className="lobby-footer__wordmark">Libre</span>
        </div>

        <nav className="lobby-footer__links" aria-label="Liens légaux">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="lobby-footer__link">
              {link.label}
            </Link>
          ))}
        </nav>

        <a
          href="https://tiktok.com/@getlibre_fr"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Suivez Libre sur TikTok"
          className="lobby-footer__social"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-2.78a8.27 8.27 0 005.58 2.17v-3.43a4.85 4.85 0 01-3.77-1.78V6.69h3.77z" />
          </svg>
        </a>

        <p className="lobby-footer__meta">
          Code source ouvert, usage non commercial :{' '}
          <a
            href="https://github.com/double-v/libre"
            target="_blank"
            rel="noopener noreferrer"
            className="lobby-footer__meta-link"
          >
            github.com/double-v/libre
          </a>
        </p>
        <p className="lobby-footer__meta">Presse &amp; médias : contact@getlibre.fr</p>
      </div>
    </footer>
  );
}
