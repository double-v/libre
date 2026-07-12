import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation',
  description: 'CGU de Libre — conditions d\'utilisation du service de rencontre gratuit.',
};

export default function CGUPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Conditions générales d&apos;utilisation</h1>
      <p className="text-sm text-muted">
        Dernière mise à jour : 1er juin 2026
      </p>

      {/* ─── 1. Objet ─── */}
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales d&apos;utilisation (ci-après &quot;CGU&quot;) encadrent l&apos;utilisation
        du service Libre (ci-après &quot;le Service&quot;), accessible à l&apos;adresse <strong>getlibre.fr</strong>,
        proposé par le projet Libre (ci-après &quot;l&apos;Éditeur&quot;).
      </p>
      <p>
        En créant un compte ou en utilisant le Service, vous acceptez les présentes CGU sans réserve.
        Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser le Service.
      </p>

      {/* ─── 2. Description du service ─── */}
      <h2>2. Description du Service</h2>
      <p>
        Libre est un service de rencontre en ligne <strong>100 % gratuit</strong>, sans abonnement,
        sans microtransaction et sans revente de données. Le Service propose notamment :
      </p>
      <ul>
        <li>Création de profil personnel</li>
        <li>Découverte de célibataires par géolocalisation</li>
        <li>Système de &quot;like&quot; et de match mutuel</li>
        <li>Messagerie chiffrée de bout en bout</li>
        <li>Espace communautaire &quot;Le Carré&quot;</li>
        <li>Vérification d&apos;identité par selfie</li>
        <li>Signalement et modération</li>
      </ul>
      <p>
        Le Service est fourni &quot;en l&apos;état&quot;. L&apos;Éditeur ne garantit pas une disponibilité
        permanente ni une absence totale de dysfonctionnements.
      </p>

      {/* ─── 3. Conditions d'accès ─── */}
      <h2>3. Conditions d&apos;accès</h2>
      <p>L&apos;utilisation du Service est soumise aux conditions suivantes :</p>
      <ul>
        <li><strong>Être âgé de 18 ans ou plus</strong>. Toute inscription d&apos;un mineur est strictement interdite et entraîne la suppression immédiate du compte.</li>
        <li>Fournir des informations exactes et à jour lors de l&apos;inscription.</li>
        <li>Disposer d&apos;une adresse e-mail valide.</li>
        <li>Ne pas avoir été précédemment banni du Service.</li>
      </ul>
      <p>
        L&apos;inscription est <strong>gratuite et illimitée</strong>. Aucune fonctionnalité n&apos;est
        réservée à une version payante.
      </p>

      {/* ─── 4. Compte utilisateur ─── */}
      <h2>4. Compte utilisateur</h2>
      <h3>4.1 Création</h3>
      <p>
        La création de compte nécessite un pseudo, une adresse e-mail et un mot de passe.
        Vous pouvez également vous inscrire via GitHub ou Google (OAuth). Lors de l&apos;inscription,
        vous devez accepter les CGU et la politique de confidentialité.
      </p>

      <h3>4.2 Sécurité du compte</h3>
      <p>
        Vous êtes responsible de la confidentialité de vos identifiants. Toute activité réalisée
        à partir de votre compte est réputée effectuée par vous. Vous devez signaler immédiatement
        toute utilisation non autorisée à <a href="mailto:contact@getlibre.fr">contact@getlibre.fr</a>.
      </p>

      <h3>4.3 Suppression</h3>
      <p>
        Vous pouvez supprimer votre compte à tout moment depuis les Paramètres.
        La suppression est <strong>irréversible</strong> et entraîne l&apos;effacement de toutes vos données,
        conformément au droit à l&apos;effacement (RGPD, art. 17).
      </p>

      {/* ─── 5. Règles de conduite ─── */}
      <h2>5. Règles de conduite</h2>
      <p>En utilisant Libre, vous vous engagez à :</p>
      <ul>
        <li>Respecter les autres utilisateurs (cours, respect, bienveillance)</li>
        <li>Ne pas usurper l&apos;identité d&apos;une autre personne</li>
        <li>Ne pas publier de contenu illégal, violent, haineux, sexiste, raciste, homophobe ou discriminant</li>
        <li>Ne pas harceler, menacer ou importuner un autre utilisateur</li>
        <li>Ne pas utiliser le Service à des fins commerciales, de prostitution ou de trafic</li>
        <li>Ne pas spammer le Carré ou les messageries privées</li>
        <li>Ne pas tenter de contourner les mesures de sécurité (anti-bot, vérification)</li>
        <li>Ne pas créer de faux profil ou de compte bot</li>
        <li>Respecter les lois françaises en vigueur</li>
      </ul>

      {/* ─── 6. Modération ─── */}
      <h2>6. Modération</h2>
      <p>
        Libre dispose d&apos;un système de modération communautaire et administrative :
      </p>
      <ul>
        <li><strong>Signalement</strong> : tout utilisateur peut signaler un comportement inapproprié</li>
        <li><strong>Blocage</strong> : tout utilisateur peut bloquer un autre utilisateur</li>
        <li><strong>Modération administrative</strong> : l&apos;équipe de modération peut avertir, bannir temporairement ou supprimer définitivement un compte</li>
        <li><strong>Vérification d&apos;identité</strong> : le badge vérifié permet de confirmer qu&apos;un profil est authentique</li>
      </ul>
      <p>
        Les décisions de modération peuvent être contestées par e-mail à
        <a href="mailto:contact@getlibre.fr">contact@getlibre.fr</a>.
      </p>

      {/* ─── 7. Propriété intellectuelle ─── */}
      <h2>7. Propriété intellectuelle</h2>
      <p>
        Le code source de Libre est publié sous licence PolyForm Noncommercial 1.5.0
        (code source ouvert, usage non commercial). Vous conservez l&apos;entière
        propriété des contenus que vous publiez (photos, bio, messages).
      </p>
      <p>
        En publiant des photos ou du contenu sur votre profil, vous accordez à Libre une licence
        non exclusive, gratuite et limitée à la fourniture du Service (affichage sur le profil
        et dans les résultats de découverte).
      </p>

      {/* ─── 8. Limitation de responsabilité ─── */}
      <h2>8. Limitation de responsabilité</h2>
      <p>
        Libre est un service gratuit fourni par des bénévoles. L&apos;Éditeur ne peut garantir :
      </p>
      <ul>
        <li>La pertinence ou la véracité des profils</li>
        <li>La disponibilité permanente du Service</li>
        <li>L&apos;absence de tout dysfonctionnement</li>
        <li>Le comportement des autres utilisateurs</li>
      </ul>
      <p>
        L&apos;Éditeur ne saurait être tenu responsable des rencontres ou interactions découlant de
        l&apos;utilisation du Service. Vous êtes seul responsable de vos actions et interactions.
      </p>

      {/* ─── 9. Données personnelles ─── */}
      <h2>9. Données personnelles</h2>
      <p>
        Le traitement de vos données personnelles est détaillé dans notre
        <a href="/confidentialite">Politique de confidentialité</a>, conformément au RGPD.
      </p>

      {/* ─── 10. Modifications ─── */}
      <h2>10. Modifications des CGU</h2>
      <p>
        L&apos;Éditeur se réserve le droit de modifier les présentes CGU. Toute modification
        substantielle sera notifiée au moins 15 jours avant son entrée en vigueur par :
      </p>
      <ul>
        <li>Notification par e-mail à l&apos;adresse associée à votre compte</li>
        <li>Bandeau d&apos;information visible sur le Service</li>
      </ul>
      <p>
        La poursuite de l&apos;utilisation du Service après l&apos;entrée en vigueur des modifications
        vaut acceptation de celles-ci.
      </p>

      {/* ─── 11. Résiliation ─── */}
      <h2>11. Résiliation</h2>
      <p>
        Vous pouvez résilier votre compte à tout moment, sans frais, depuis les Paramètres ou
        par e-mail à <a href="mailto:contact@getlibre.fr">contact@getlibre.fr</a>.
      </p>
      <p>
        L&apos;Éditeur se réserve le droit de suspendre ou supprimer un compte en cas de non-respect
        des CGU, après notification sauf urgence (menace pour la sécurité des utilisateurs).
      </p>

      {/* ─── 12. Droit applicable ─── */}
      <h2>12. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le droit français. En cas de litige, les parties
        s&apos;efforceront de trouver une solution amiable. À défaut, les tribunaux français
        compétents seront seuls compétents.
      </p>

      {/* ─── 13. Contact ─── */}
      <h2>13. Contact</h2>
      <p>
        Pour toute question relative aux CGU :
      </p>
      <ul>
        <li>E-mail : <a href="mailto:contact@getlibre.fr">contact@getlibre.fr</a></li>
        <li>DPO : <a href="mailto:dpo@getlibre.fr">dpo@getlibre.fr</a></li>
      </ul>
    </article>
  );
}