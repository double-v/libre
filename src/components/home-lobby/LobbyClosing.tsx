import Link from 'next/link';

/**
 * Section « Closing » de la landing lobby (#249, épic #243).
 *
 * Dernière accroche + CTA d'inscription (vrai `<Link>` vers `/register`, cible
 * ≥ 52px). Ton « tu » (PRODUCT.md). Styles `.lobby-closing*` (tokens `--lobby-*`).
 */
export default function LobbyClosing() {
  return (
    <section className="lobby-section lobby-closing">
      <div className="lobby-section__inner">
        <h2 className="lobby-section__title">Libre grandit avec sa bande.</h2>
        <p className="lobby-closing__copy">
          Gratuit aujourd’hui, gratuit demain. Chaque retour compte, chaque
          personne rend la bande un peu plus grande.
        </p>
        <Link href="/register" className="lobby-closing__cta">
          Créer mon profil
        </Link>
      </div>
    </section>
  );
}
