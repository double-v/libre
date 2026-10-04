import type { Metadata } from 'next';
import Link from 'next/link';
import { getFeatures } from '@/lib/features-server';

/**
 * La section Cercle suit l'interrupteur `checkin` (#483) : la page est
 * régénérée au plus tard chaque minute, et tout de suite quand l'admin change
 * un interrupteur (`PUT /api/admin/features` → `revalidatePath('/faq')`).
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'FAQ — Libre',
  description:
    'Questions fréquentes sur Libre : pourquoi Découvrir peut sembler vide, ce que tu vois des autres, ta position, tes messages, ton compte et le Cercle de Confiance.',
  robots: { index: true, follow: true },
};

type Qr = { id?: string; q: string; a: React.ReactNode };

const lien = 'text-coral hover:underline dark:text-coral-light';

// Chaque réponse est adossée au code qui la rend vraie, pas à une intention :
// la FAQ promettait une alerte de check-in jamais envoyée et une position
// relevée « seulement au check-in » (#476). Toucher une réponse, c'est
// d'abord relire la route ou la décision qu'elle cite.
//
// Aucun chiffre sur la fréquentation, comme la copie du démarrage
// (`LAUNCH_COPY`) : un nombre d'inscrits qui stagne fait plus de mal que de bien.

// Causes tirées de `GET /api/discover` (filtres, rayon, géoloc, likes exclus).
const DECOUVRIR: Qr[] = [
  {
    id: 'aucun-profil',
    q: 'Je ne vois aucun profil, pourquoi ?',
    a: (
      <>
        <p>Plusieurs raisons possibles, de la plus fréquente à la moins fréquente.</p>
        <p>
          <strong>Tes filtres sont trop serrés.</strong> Dans Découvrir, le bouton « Filtres » garde
          tes critères d’une visite à l’autre : genre, orientation, âge, intention, centres d’intérêt
          et distance. Élargis-les, et pousse le curseur de distance jusqu’au bout (« partout ») pour
          voir si des profils apparaissent.
        </p>
        <p>
          <strong>« À proximité » a besoin de savoir où tu es.</strong> Sans position, cet onglet
          reste vide. Active ta géolocalisation depuis l’onglet, ou saisis ta ville dans{' '}
          <Link href="/profile" className={lien}>
            ton profil
          </Link>
          .
        </p>
        <p>
          <strong>Tu as déjà fait le tour.</strong> Une personne que tu as aimée ne revient pas dans
          Découvrir : elle a reçu ton signe, à elle de répondre. Si c’est réciproque, vous vous
          retrouvez dans Messages.
        </p>
        <p>
          <strong>Libre vient d’ouvrir.</strong> Les inscriptions arrivent peu à peu, et il peut y
          avoir encore peu de monde près de chez toi. Reviens dans quelques jours pour découvrir les
          nouveaux profils.
        </p>
        <p>
          Si rien de tout cela ne correspond à ce que tu vois, écris-nous avec le bouton de retour, en
          bas à droite de l’écran.
        </p>
      </>
    ),
  },
  {
    // Réciprocité miroir (spec 008) : `intentionFor`, src/lib/profile-visibility.ts.
    id: 'intention-cachee',
    q: 'Pourquoi je ne vois pas ce que cherchent les autres ?',
    a: (
      <>
        <p>
          Sur Libre, on lit ce que cherchent les autres quand on a dit ce qu’on cherche soi-même.
          Tant que tu ne l’as pas précisé, l’intention des autres reste cachée, et le filtre
          d’intention de Découvrir n’a pas d’effet.
        </p>
        <p>
          Pour la voir, choisis ce que tu cherches dans{' '}
          <Link href="/profile" className={lien}>
            ton profil
          </Link>
          . « Je verrai en chemin » compte comme une réponse.
        </p>
      </>
    ),
  },
  {
    // Questions en miroir (spec 009) : `answersFor`, src/lib/answers.ts.
    id: 'reponses-cachees',
    q: 'Pourquoi certaines réponses aux questions sont cachées ?',
    a: (
      <p>
        Même principe : tu lis la réponse de quelqu’un à une question quand tu as toi-même répondu à
        cette question. Le profil te le signale avec « Réponds à cette question pour découvrir sa
        réponse ». Tes réponses se gèrent depuis ton profil.
      </p>
    ),
  },
  {
    // Voile des photos sensibles (#330) : `photoSensitivityOptIn`.
    id: 'photos-floues',
    q: 'Pourquoi certaines photos sont floues ?',
    a: (
      <p>
        Certaines photos sont classées sensibles, par la modération ou par la personne qui les a
        publiées. Par défaut, elles s’affichent floutées. Tu choisis ce que tu acceptes de voir dans{' '}
        <Link href="/profile" className={lien}>
          ton profil
        </Link>
        , rubrique « Photos sensibles ».
      </p>
    ),
  },
];

const VIE_PRIVEE: Qr[] = [
  {
    // Arrondi à 0,01° dans /api/geoloc/update, flou côté client avant envoi,
    // `cityLabel` privé (spec 004), distances en tranches.
    id: 'position',
    q: 'Est-ce que vous gardez ma position ?',
    a: (
      <>
        <p>
          Nous gardons seulement ta <strong>dernière</strong> position, arrondie à environ un
          kilomètre. Elle est enregistrée quand tu actives ta géolocalisation ou que tu saisis ta
          ville, et elle sert à « À proximité » et au filtre de distance. Il n’y a aucun suivi en
          continu.
        </p>
        <p>
          Personne ne voit ta position ni ta ville : les autres membres lisent seulement une distance
          arrondie.
        </p>
      </>
    ),
  },
  {
    // Escrow actif par défaut : la formulation suit les CGU §9.1, mot pour mot sur le fond.
    id: 'messages',
    q: 'Mes messages sont-ils lisibles par l’équipe ?',
    a: (
      <>
        <p>
          Tes messages sont chiffrés sur ton appareil avant d’être envoyés, et restent chiffrés dans
          notre base. Pour que tu retrouves tes conversations sur un nouvel appareil, Libre conserve
          ta clé de messagerie, elle-même chiffrée. L’équipe a donc la capacité technique de lire
          un message.
        </p>
        <p>
          Elle ne le fait pas en temps normal, seulement dans des cas limités : un signalement grave,
          une obligation légale, ou une modération ciblée validée par un humain. Chaque accès est
          journalisé. Le détail est au §9.1 des{' '}
          <Link href="/cgu" className={lien}>
            conditions d’utilisation
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    // Badge selfie (#436) : selfie hors profil, purgé 30 jours après la décision (regles.ts).
    id: 'badge-verifie',
    q: 'Comment obtenir le badge vérifié ?',
    a: (
      <p>
        Dans Paramètres, rubrique « Vérification », tu prends un selfie en reproduisant un geste
        demandé. Une personne de l’équipe le compare à tes photos. Ton selfie n’est jamais montré aux
        autres membres ni ajouté à ton profil, et il est effacé 30 jours après la décision.
      </p>
    ),
  },
  {
    id: 'mon-compte',
    q: 'Comment récupérer mes données ou supprimer mon compte ?',
    a: (
      <p>
        Tout se fait dans Paramètres : « Exporter mes données » télécharge ce que Libre garde sur toi,
        et « Supprimer mon compte » efface ton compte. Les durées de conservation sont détaillées dans
        la{' '}
        <Link href="/confidentialite" className={lien}>
          politique de confidentialité
        </Link>
        .
      </p>
    ),
  },
];

// Section affichée seulement quand le check-in est activé (#483) : décision
// opérateur, la FAQ ne parle pas de sa pause. Tant que #480 n'est pas livré,
// aucune alerte ne part et les contacts ne sont pas prévenus — d'où une
// réponse honnête sur les contacts, et aucune promesse d'alerte ici.
const CERCLE: Qr[] = [
  {
    id: 'cercle',
    q: 'C’est quoi le Cercle de Confiance ?',
    a: (
      <>
        <p>
          Ce sont jusqu’à cinq membres de Libre que tu choisis comme contacts de confiance. Les
          déclarer compte dans ton niveau de confiance. Pour le détail, vois{' '}
          <Link href="/trust/how-it-works" className={lien}>
            Comment ça marche
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: 'cercle-contacts',
    q: 'Mes contacts savent-ils qu’ils sont dans mon cercle ?',
    a: (
      <p>
        Pas encore : ajouter quelqu’un à ton Cercle ne le prévient pas aujourd’hui. Pense à le lui dire
        toi-même, pour que la personne sache qu’elle compte pour toi.
      </p>
    ),
  },
];

// L'ancre permet d'envoyer quelqu'un droit sur sa question (état vide de
// Découvrir, formulaire de retour) ; `scroll-mt` laisse la nav sticky au-dessus.
function renderQr({ id, q, a }: Qr) {
  return (
    <section key={q} id={id} className="scroll-mt-24">
      <h3>{q}</h3>
      {a}
    </section>
  );
}

export default async function FaqPage() {
  const { checkin } = await getFeatures();
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Foire aux questions</h1>

      <h2>Découvrir des profils</h2>
      {DECOUVRIR.map(renderQr)}

      <h2>Ta vie privée et ton compte</h2>
      {VIE_PRIVEE.map(renderQr)}

      {checkin && (
        <>
          <h2>Le Cercle de Confiance</h2>
          {CERCLE.map(renderQr)}
        </>
      )}

      <hr />
      <p className="text-sm text-muted">
        Un souci technique ? Vois aussi{' '}
        <Link href="/faq/session-expiree" className={lien}>
          « Session expirée » — que faire
        </Link>
        .
      </p>
    </article>
  );
}
