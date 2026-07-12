import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité de Libre — traitement des données personnelles conformément au RGPD.',
};

export default function ConfidentialitePage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-muted">
        Dernière mise à jour : 1er juin 2026
      </p>

      <p>
        La présente politique de confidentialité décrit la manière dont Libre (&quot;nous&quot;, &quot;notre&quot;) collecte,
        utilise, conserve et protège vos données personnelles lorsque vous utilisez notre service accessible
        à l&apos;adresse <strong>getlibre.fr</strong>, conformément au Règlement Général sur la Protection des Données (RGPD)
        et à la loi Informatique et Libertés.
      </p>

      {/* ─── 1. Responsable du traitement ─── */}
      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données personnelles est :
      </p>
      <ul>
        <li><strong>Libre</strong></li>
        <li>Projet à but non lucratif</li>
        <li>Contact : <a href="mailto:contact@getlibre.fr">contact@getlibre.fr</a></li>
        <li>Contact DPO : <a href="mailto:dpo@getlibre.fr">dpo@getlibre.fr</a></li>
      </ul>
      <p>
        Libre n&apos;est pas encore immatriculé en tant qu&apos;association. Le projet est porté par des bénévoles
        agissant en leur nom personnel. Le responsable de facto peut être joint à l&apos;adresse ci-dessus.
      </p>

      {/* ─── 2. Données collectées ─── */}
      <h2>2. Données personnelles collectées</h2>

      <h3>2.1 Données fournies lors de l&apos;inscription</h3>
      <ul>
        <li>Adresse e-mail (identifiant de connexion)</li>
        <li>Pseudo (nom d&apos;affichage publique)</li>
        <li>Mot de passe (stocké sous forme de hash bcrypt, jamais en clair)</li>
      </ul>

      <h3>2.2 Données fournies dans le profil</h3>
      <ul>
        <li>Date de naissance</li>
        <li>Identité de genre</li>
        <li>Orientation sexuelle</li>
        <li>Type(s) de relation recherchée(s)</li>
        <li>Centres d&apos;intérêt et pratiques</li>
        <li>Liens sociaux (optionnel)</li>
        <li>Photos de profil</li>
        <li>Biographie courte</li>
      </ul>

      <h3>2.3 Données de localisation</h3>
      <ul>
        <li>Latitude et longitude (géolocalisation, uniquement si vous activez la fonctionnalité &quot;À proximité&quot;)</li>
        <li>Préférence de distance maximale de recherche</li>
      </ul>

      <h3>2.4 Données de communication</h3>
      <ul>
        <li>Messages envoyés dans les conversations (chiffrés de bout en bout — le serveur ne peut pas les lire)</li>
        <li>Messages publics dans le &quot;Carré&quot; (pseudonymes, contenu)</li>
      </ul>

      <h3>2.5 Données techniques</h3>
      <ul>
        <li>Identifiant d&apos;appareil (deviceId, stocké en localStorage)</li>
        <li>Jeton anti-robot Turnstile (Cloudflare, consulté puis supprimé)</li>
        <li>User-Agent (collecté uniquement lors d&apos;un signalement de bug via le formulaire de feedback)</li>
        <li>Adresses IP (traitées par Cloudflare et Vercel, pas stockées par Libre)</li>
      </ul>

      <h3>2.6 Données de modération</h3>
      <ul>
        <li>Signalements (raison, description)</li>
        <li>Demandes de vérification (selfie, statut)</li>
        <li>Favoris (likes), blocages, matchs</li>
        <li>Journal de modération (actions des administrateurs)</li>
      </ul>

      {/* ─── 3. Bases légales ─── */}
      <h2>3. Bases légales du traitement</h2>
      <table>
        <thead>
          <tr>
            <th>Catégorie de données</th>
            <th>Base légale (RGPD)</th>
            <th>Article</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Identifiants de compte (e-mail, pseudo, mot de passe)</td>
            <td>Exécution du contrat</td>
            <td>Art. 6(1)(b)</td>
          </tr>
          <tr>
            <td>Profil (bio, photos, preferences, localisation)</td>
            <td>Exécution du contrat</td>
            <td>Art. 6(1)(b)</td>
          </tr>
          <tr>
            <td>Communications (messages E2E, Carré)</td>
            <td>Exécution du contrat</td>
            <td>Art. 6(1)(b)</td>
          </tr>
          <tr>
            <td>Modération (signalements, vérifications)</td>
            <td>Intérêt légitime (sécurité des utilisateurs)</td>
            <td>Art. 6(1)(f)</td>
          </tr>
          <tr>
            <td>Anti-robot (Turnstile, deviceId)</td>
            <td>Intérêt légitime (prévention des abus)</td>
            <td>Art. 6(1)(f)</td>
          </tr>
          <tr>
            <td>Feedback (user-agent)</td>
            <td>Consentement</td>
            <td>Art. 6(1)(a)</td>
          </tr>
          <tr>
            <td>Cookies non essentiels</td>
            <td>Consentement</td>
            <td>Art. 6(1)(a)</td>
          </tr>
        </tbody>
      </table>

      {/* ─── 4. Finalités ─── */}
      <h2>4. Finalités du traitement</h2>
      <p>Nous traitons vos données personnelles pour les finalités suivantes :</p>
      <ul>
        <li><strong>Fournir le service</strong> : inscription, profil, découverte, match, messagerie chiffrée</li>
        <li><strong>Géolocalisation</strong> : afficher les célibataires à proximité (uniquement si activé)</li>
        <li><strong>Modération et sécurité</strong> : vérification d&apos;identité, signalement, anti-spam/anti-bot</li>
        <li><strong>Amélioration du service</strong> : feedback utilisateur (avec votre consentement)</li>
        <li><strong>Obligations légales</strong> : conservation des logs de modération si requis par la loi</li>
      </ul>
      <p>
        <strong>Nous n&apos;utilisons pas vos données à des fins publicitaires ou commerciales.</strong>
        Nous ne les vendons, ne les louons et ne les partageons jamais avec des tiers à des fins marketing.
      </p>

      {/* ─── 5. Durées de conservation ─── */}
      <h2>5. Durées de conservation</h2>
      <table>
        <thead>
          <tr>
            <th>Type de données</th>
            <th>Durée de conservation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compte actif (données de profil)</td>
            <td>Jusqu&apos;à suppression du compte par l&apos;utilisateur</td>
          </tr>
          <tr>
            <td>Messages (chiffrés E2E)</td>
            <td>Jusqu&apos;à suppression du compte ou de la conversation</td>
          </tr>
          <tr>
            <td>Logs de modération</td>
            <td>3 ans après la dernière action</td>
          </tr>
          <tr>
            <td>Tokens de vérification e-mail</td>
            <td>24 heures ou jusqu&apos;à utilisation</td>
          </tr>
          <tr>
            <td>Tokens de réinitialisation mot de passe</td>
            <td>1 heure ou jusqu&apos;à utilisation</td>
          </tr>
          <tr>
            <td>Demandes de vérification (selfies)</td>
            <td>Jusqu&apos;à résolution + 30 jours</td>
          </tr>
          <tr>
            <td>Feedback</td>
            <td>Jusqu&apos;à résolution + 1 an</td>
          </tr>
        </tbody>
      </table>

      {/* ─── 6. Destinataires ─── */}
      <h2>6. Destinataires des données</h2>
      <p>Vos données sont accessibles à :</p>
      <ul>
        <li><strong>L&apos;équipe Libre</strong> : administrateurs pour la modération (contenu du Carré, signalements, demandes de vérification)</li>
        <li><strong>Cloudflare</strong> : fournisseur de sécurité (Turnstile anti-bot, CDN). Politique de confidentialité : <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">cloudflare.com/privacypolicy</a></li>
        <li><strong>Vercel</strong> : hébergement. Politique de confidentialité : <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">vercel.com/legal/privacy-policy</a></li>
        <li><strong>Resend</strong> : envoi d&apos;e-mails transactionnels (vérification, réinitialisation). Politique : <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">resend.com/legal/privacy-policy</a></li>
        <li><strong>Pusher</strong> : notifications en temps réel (WebSocket). Politique : <a href="https://pusher.com/legal/privacy/" target="_blank" rel="noopener noreferrer">pusher.com/legal/privacy</a></li>
        <li><strong>Cloudflare R2</strong> : stockage des photos de profil. Même politique que Cloudflare ci-dessus.</li>
      </ul>
      <p>
        <strong>Aucune donnée n&apos;est transférée à des fins publicitaires ou commerciales.</strong>
        Aucun sous-traitant n&apos;accède à vos messages chiffrés de bout en bout.
      </p>

      {/* ─── 7. Transferts hors UE ─── */}
      <h2>7. Transferts de données hors Union européenne</h2>
      <p>
        Certains sous-traitants (Vercel, Cloudflare, Pusher) peuvent traiter des données en dehors de l&apos;Union européenne.
        Ces transferts sont encadrés par :
      </p>
      <ul>
        <li>Des clauses contractuelles types (SCC) approuvées par la Commission européenne</li>
        <li>Des garanties techniques (chiffrement en transit TLS 1.3, chiffrement au repos)</li>
        <li>Des évaluations d&apos;impact pour les transferts vers les États-Unis (sous le cadre EU-US Data Privacy Framework quand applicable)</li>
      </ul>

      {/* ─── 8. Sécurité ─── */}
      <h2>8. Mesures de sécurité</h2>
      <ul>
        <li><strong>Chiffrement de bout en bout (E2E)</strong> des messages : seuls l&apos;expéditeur et le destinataire peuvent les lire</li>
        <li><strong>Chiffrement en transit</strong> : TLS 1.3 sur toutes les communications</li>
        <li><strong>Chiffrement au repos</strong> : base de données chiffrée sur le serveur</li>
        <li><strong>Hashage des mots de passe</strong> : bcrypt avec coût 12</li>
        <li><strong>Accès administrateur restreint</strong> : seuls les administrateurs vérifiés peuvent accéder aux données de modération</li>
        <li><strong>Authentification</strong> : JWT avec clé secrète, tokens à durée limitée</li>
        <li><strong>Protection anti-robot</strong> : Cloudflare Turnstile</li>
      </ul>

      {/* ─── 9. Vos droits ─── */}
      <h2>9. Vos droits RGPD</h2>
      <p>
        Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :
      </p>
      <ul>
        <li><strong>Droit d&apos;accès</strong> (art. 15 RGPD) : obtenir une copie de vos données personnelles</li>
        <li><strong>Droit de rectification</strong> (art. 16) : modifier vos données inexactes ou incomplètes</li>
        <li><strong>Droit à l&apos;effacement</strong> (art. 17) : supprimer votre compte et vos données</li>
        <li><strong>Droit à la limitation</strong> (art. 18) : suspendre le traitement de certaines données</li>
        <li><strong>Droit à la portabilité</strong> (art. 20) : exporter vos données dans un format structuré (JSON)</li>
        <li><strong>Droit d&apos;opposition</strong> (art. 21) : vous opposer au traitement fondé sur l&apos;intérêt légitime</li>
        <li><strong>Droit de retirer votre consentement</strong> (art. 7(3)) : à tout moment, sans affecter la licéité du traitement antérieur</li>
        <li><strong>Droit de définir des directives post-mortem</strong> (art. 32 loi Informatique et Libertés)</li>
      </ul>
      <p>
        <strong>Comment exercer vos droits :</strong>
      </p>
      <ul>
        <li><strong>Accès, rectification, portabilité</strong> : directement depuis vos paramètres de compte (Paramètres &gt; Exporter mes données)</li>
        <li><strong>Effacement</strong> : depuis Paramètres &gt; Supprimer mon compte</li>
        <li><strong>Tout autre droit</strong> : par e-mail à <a href="mailto:dpo@getlibre.fr">dpo@getlibre.fr</a></li>
      </ul>
      <p>
        Nous répondrons à votre demande dans un délai maximal d&apos;un mois. En cas de difficulté, vous pouvez
        déposer une réclamation auprès de la <strong>CNIL</strong> : <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">cnil.fr/fr/plaintes</a>.
      </p>

      {/* ─── 10. Cookies ─── */}
      <h2>10. Cookies et traceurs</h2>
      <p>
        Libre utilise des cookies strictement nécessaires au fonctionnement du service. Nous n&apos;utilisons
        <strong> aucun cookie publicitaire, de tiers ou de追踪</strong>.
      </p>

      <h3>10.1 Cookies essentiels (pas de consentement requis)</h3>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Finalité</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>next-auth.session-token</td>
            <td>Maintien de la session utilisateur</td>
            <td>Session (fermeture du navigateur)</td>
          </tr>
          <tr>
            <td>next-auth.csrf-token</td>
            <td>Protection contre les attaques CSRF</td>
            <td>Session</td>
          </tr>
          <tr>
            <td>next-auth.callback-url</td>
            <td>Redirection après connexion OAuth</td>
            <td>Session</td>
          </tr>
          <tr>
            <td>libre-theme</td>
            <th>Préférence de thème (clair/sombre)</th>
            <td>1 an</td>
          </tr>
          <tr>
            <td>libre_device_id</td>
            <td>Prévention anti-multi-comptes (localStorage)</td>
            <td>Persistant (localStorage)</td>
          </tr>
        </tbody>
      </table>

      <h3>10.2 Cookies non essentiels</h3>
      <p>
        Libre n&apos;utilise <strong>aucun cookie non essentiel</strong>. Pas de Google Analytics, pas de pixel
        de suivi, pas de cookie de publicité ciblée. Aucun consentement supplémentaire n&apos;est donc requis
        au-delà des cookies essentiels.
      </p>

      <h3>10.3 Cloudflare Turnstile</h3>
      <p>
        Cloudflare Turnstile est un service anti-bot qui peut déposer des cookies temporaires nécessaires
        à la vérification. Ces cookies sont gérés par Cloudflare et sont exemptés de consentement
        en tant que mesures de sécurité (art. 5(3) directive ePrivacy, exception pour la sécurité).
      </p>

      {/* ─── 11. Profilage ─── */}
      <h2>11. Profilage et décisions automatisées</h2>
      <p>
        Libre ne pratique <strong>aucun profilage</strong> au sens du RGPD (art. 22).
        L&apos;algorithme de découverte se contente de filtrer par localisation, âge et préférences
        déclarées — il ne note pas les utilisateurs, ne prédit pas de comportement et ne prend
        aucune décision automatisée produisant des effets juridiques.
      </p>

      {/* ─── 12. Mineurs ─── */}
      <h2>12. Protection des mineurs</h2>
      <p>
        Libre est réservé aux personnes âgées de <strong>18 ans ou plus</strong>.
        Conformément à l&apos;article 8 du RGPD, nous ne collectons pas de données auprès de mineurs
        de moins de 18 ans. Si nous découvrons qu&apos;un utilisateur est mineur, son compte est
        immédiatement supprimé.
      </p>

      {/* ─── 13. Modifications ─── */}
      <h2>13. Modifications de cette politique</h2>
      <p>
        Nous nous réservons le droit de modifier cette politique. Toute modification substantielle
        sera notifiée par e-mail et/ou par un bandeau visible sur le site au moins 15 jours avant
        son entrée en vigueur. La date de dernière mise à jour figure en en-tête de cette page.
      </p>
    </article>
  );
}