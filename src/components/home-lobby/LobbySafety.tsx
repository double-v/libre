/**
 * Section « Sécurité » de la landing lobby (#249, épic #243).
 *
 * Panneau centré (`--lobby-bg-elev` / bordure / radius-lg), patch tag gold,
 * bouclier SVG (teinte gold via `currentColor`), titre + copy. Aucune animation
 * → rien à figer côté reduced-motion. Styles `.lobby-safety*` (tokens `--lobby-*`).
 */
export default function LobbySafety() {
  return (
    <section className="lobby-section lobby-safety">
      <div className="lobby-safety__panel">
        <span className="lobby-safety__tag">
          <span aria-hidden="true">✦</span> Mis à jour cette semaine · modération
          humaine 24/7
        </span>

        <span className="lobby-safety__shield" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" />
            <path d="M9 12l2.2 2.2L15.5 10" />
          </svg>
        </span>

        <h2 className="lobby-section__title">Ta sécurité, tenue par des humains.</h2>
        <p className="lobby-safety__copy">
          Chaque profil vérifié à la main, chaque signalement lu par quelqu’un —
          pas un algorithme qui classe et qui vend. Zéro revente de données, point
          final.
        </p>
      </div>
    </section>
  );
}
