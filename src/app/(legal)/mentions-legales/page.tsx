import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du site Libre (getlibre.fr) — conformément à la loi française.',
};

export default function MentionsLegalesPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Mentions légales</h1>
      <p className="text-sm text-muted">
        Dernière mise à jour : 1er juin 2026
      </p>

      <p>
        Conformément à l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance
        dans l&apos;économie numérique et à l&apos;article 3 de la loi n° 2009-222 du 23 mars 2009,
        les informations d&apos;identification du site sont les suivantes :
      </p>

      {/* ─── Éditeur ─── */}
      <h2>Éditeur du site</h2>
      <ul>
        <li><strong>Nom</strong> : Libre</li>
        <li><strong>Statut</strong> : Projet à but non lucratif (association en cours de constitution)</li>
        <li><strong>Responsable de la publication</strong> : Le collectif Libre</li>
        <li><strong>E-mail</strong> : <a href="mailto:contact@getlibre.fr">contact@getlibre.fr</a></li>
      </ul>

      {/* ─── Hébergeur ─── */}
      <h2>Hébergeur</h2>
      <ul>
        <li><strong>Société</strong> : Vercel Inc.</li>
        <li><strong>Adresse</strong> : 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
        <li><strong>Site web</strong> : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></li>
        <li><strong>Téléphone</strong> : +1 (844) 412-7426</li>
      </ul>

      {/* ─── Prestataires techniques ─── */}
      <h2>Prestataires techniques</h2>
      <ul>
        <li><strong>CDN et sécurité</strong> : Cloudflare Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis</li>
        <li><strong>Envoi d&apos;e-mails</strong> : Resend Inc., San Francisco, CA, États-Unis</li>
        <li><strong>Temps réel (WebSocket)</strong> : Pusher Ltd., London, Royaume-Uni</li>
        <li><strong>Stockage photos</strong> : Cloudflare R2 (mêmes coordonnées que Cloudflare)</li>
        <li><strong>Base de données</strong> : PostgreSQL hébergé via Vercel (Supabase)</li>
      </ul>

      {/* ─── Propriété intellectuelle ─── */}
      <h2>Propriété intellectuelle</h2>
      <p>
        Le site getlibre.fr, son logo, ses textes et ses éléments graphiques sont la propriété
        du projet Libre. Le code source est publié sous licence PolyForm Noncommercial 1.5.0
        (code source ouvert, usage non commercial).
      </p>
      <p>
        Toute reproduction, même partielle, des éléments du site sans autorisation est
        interdite conformément au Code de la propriété intellectuelle (art. L335-2 et suivants).
      </p>

      {/* ─── Données personnelles ─── */}
      <h2>Protection des données personnelles</h2>
      <p>
        Le traitement des données personnelles est détaillé dans la
        <a href="/confidentialite">Politique de confidentialité</a>.
      </p>
      <p>
        Conformément au RGPD (règlement UE 2016/679) et à la loi Informatique et Libertés
        (loi n° 78-17 du 6 janvier 1978 modifiée), vous disposez d&apos;un droit d&apos;accès,
        de rectification, d&apos;effacement et de portabilité de vos données.
      </p>
      <ul>
        <li><strong>Contact DPO</strong> : <a href="mailto:dpo@getlibre.fr">dpo@getlibre.fr</a></li>
        <li><strong>Réclamation CNIL</strong> : <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">cnil.fr/fr/plaintes</a></li>
      </ul>

      {/* ─── Cookies ─── */}
      <h2>Cookies</h2>
      <p>
        Le site utilise uniquement des cookies strictement nécessaires au fonctionnement du service.
        Consultez la <a href="/confidentialite">Politique de confidentialité</a> pour le détail des
        cookies déposés.
      </p>

      {/* ─── Crédits ─── */}
      <h2>Crédits</h2>
      <ul>
        <li>Conception et développement : collectif Libre</li>
        <li>Police d&apos;écriture : système (sans serif)</li>
        <li>Icônes : Emoji natifs du système</li>
      </ul>
    </article>
  );
}