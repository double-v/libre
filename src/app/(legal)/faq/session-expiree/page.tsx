import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ : « Session expirée »',
  description:
    "Pourquoi l'app vous dit que votre session a expiré alors que vous venez de vous connecter. Causes courantes et solutions.",
};

export default function SessionExpireeFAQ() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>« Votre session a expiré » — que faire ?</h1>
      <p className="text-sm text-muted">
        Dernière mise à jour : 4 juin 2026
      </p>

      <p>
        Si vous voyez ce message alors que vous venez de vous connecter, c&apos;est
        presque toujours dû à une <strong>extension de navigateur</strong> qui
        bloque ou supprime le cookie de session. Ce n&apos;est pas un bug de
        Libre.
      </p>

      <h2>Pourquoi ça arrive</h2>
      <p>
        Pour rester connecté(e), Libre dépose un cookie de session signé
        (<code>next-auth.session-token</code>) dans votre navigateur. Si une
        extension l&apos;efface ou empêche sa création, chaque requête vers
        l&apos;app revient avec un statut <code>401 Unauthorized</code> — d&apos;où
        le message.
      </p>
      <p>Les coupables les plus fréquents :</p>
      <ul>
        <li>
          <strong>Privacy Badger</strong> : bloque les cookies de tracking,
          mais confond parfois le cookie de session avec un cookie tiers
          publicitaire.
        </li>
        <li>
          <strong>uBlock Origin</strong> : avec les listes de filtres
          avancées, peut supprimer des cookies jugés « non essentiels ».
        </li>
        <li>
          <strong>Firefox Multi-Account Containers</strong> : si getlibre.fr
          est assigné à un conteneur autre que celui où vous êtes
          authentifié(e), le cookie de session n&apos;est pas partagé.
        </li>
        <li>
          <strong>Cookie AutoDelete</strong>, <strong>Self-Destructing
          Cookies</strong> : suppriment automatiquement les cookies à la
          fermeture d&apos;onglet.
        </li>
      </ul>

      <h2>Solutions rapides</h2>
      <ol>
        <li>
          <strong>Tester en navigation privée</strong> : si tout marche en
          privée, c&apos;est bien une extension. Aucune extension n&apos;est
          active en privée par défaut.
        </li>
        <li>
          <strong>Mettre getlibre.fr en liste blanche</strong> dans vos
          extensions : pour Privacy Badger, cliquez l&apos;icône de
          l&apos;extension sur getlibre.fr et choisissez « Autoriser sur ce
          site ». Pour uBlock, ouvrez le tableau de bord → « Mes
          filtres » → ajoutez <code>@@||getlibre.fr^$cookie</code>.
        </li>
        <li>
          <strong>Désactiver temporairement</strong> les extensions de
          confidentialité sur getlibre.fr, vous reconnecter, puis les
          réactiver.
        </li>
        <li>
          <strong>Vider le stockage lié au site</strong> : Paramètres →
          Vie privée → « Effacer l&apos;historique » → cocher « Cookies »
          et « Données de sites » + « Cache » → bouton « Effacer ». Puis
          reconnectez-vous.
        </li>
      </ol>

      <h2>Quand le problème n&apos;est PAS une extension</h2>
      <p>
        Si même en navigation privée vous voyez « session expirée »
        immédiatement après login :
      </p>
      <ul>
        <li>
          Vérifiez l&apos;heure de votre ordinateur : si elle est décalée
          de plus de quelques minutes, la signature JWT est rejetée.
        </li>
        <li>
          Videz le Service Worker de getlibre.fr : tapez{' '}
          <code>about:serviceworkers</code> dans la barre d&apos;adresse,
          trouvez getlibre.fr, cliquez « Unregister ». Puis rechargez.
        </li>
        <li>
          Si le problème persiste, contactez-nous via le bouton « Signaler »
          en bas de l&apos;app, en joignant une capture d&apos;écran de
          l&apos;onglet Console (F12) avec les erreurs rouges.
        </li>
      </ul>

      <h2>Vous voulez aider ?</h2>
      <p>
        Si vous avez trouvé quelle extension posait problème, dites-le-nous
        via le bouton « Signaler » — on pourra l&apos;ajouter à cette FAQ
        pour aider d&apos;autres membres.
      </p>

      <p>
        <Link href="/messages">← Retour à mes messages</Link>
      </p>
    </article>
  );
}
