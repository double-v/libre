import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ — Libre',
  description:
    'Questions fréquentes sur Libre : pourquoi Découvrir peut sembler vide, le Cercle de Confiance, les check-ins et le respect de ta vie privée.',
  robots: { index: true, follow: true },
};

type Qr = { id?: string; q: string; a: React.ReactNode };

const lien = 'text-coral hover:underline dark:text-coral-light';

// « Aucun profil » (#476) : la question est arrivée par le formulaire de
// retour, qui ne permet pas de répondre. Les causes sont celles du code de
// `GET /api/discover`, pas des suppositions. Aucun chiffre, comme la copie du
// démarrage (`LAUNCH_COPY`) : un nombre d'inscrits qui stagne fait plus de mal
// que de bien.
const DECOUVRIR: Qr[] = [
  {
    id: 'aucun-profil',
    q: 'Je ne vois aucun profil, pourquoi ?',
    a: (
      <>
        Plusieurs raisons possibles, de la plus fréquente à la moins fréquente.
        <br />
        <br />
        <strong>Tes filtres sont trop serrés.</strong> Dans Découvrir, le bouton « Filtres » garde
        tes critères d’une visite à l’autre : genre, orientation, âge, intention, centres d’intérêt et distance.
        Élargis-les, et pousse le curseur de distance jusqu’au bout (« partout ») pour voir si des
        profils apparaissent.
        <br />
        <br />
        <strong>« À proximité » a besoin de savoir où tu es.</strong> Sans position, cet onglet
        reste vide. Active ta géolocalisation depuis l’onglet, ou saisis ta ville dans{' '}
        <Link href="/profile" className={lien}>
          ton profil
        </Link>
        . Personne ne voit ta ville, seulement une distance arrondie.
        <br />
        <br />
        <strong>Tu as déjà fait le tour.</strong> Une personne que tu as aimée ne revient pas dans
        Découvrir : elle a reçu ton signe, à elle de répondre. Si c’est réciproque, vous vous
        retrouvez dans Messages.
        <br />
        <br />
        <strong>Libre vient d’ouvrir.</strong> Les inscriptions arrivent peu à peu, et il peut y
        avoir encore peu de monde près de chez toi. Reviens dans quelques jours pour découvrir
        les nouveaux profils.
        <br />
        <br />
        Si rien de tout cela ne correspond à ce que tu vois, écris-nous avec le bouton de retour, en
        bas à droite de l’écran.
      </>
    ),
  },
];

// Q/R issues du ticket #63. Contenu statique — français, ton rassurant (PRODUCT.md).
const CERCLE: Qr[] = [
  {
    q: 'C’est quoi le Cercle de Confiance ?',
    a: (
      <>
        Ce sont les personnes que tu choisis comme contacts de confiance sur Libre. En un geste,
        tu peux les prévenir avant un rendez-vous : si tu ne confirmes pas que tout va bien, elles
        reçoivent une alerte. Un filet de sécurité discret, que tu gardes entièrement sous ton
        contrôle. Pour le détail des niveaux et du fonctionnement, vois{' '}
        <Link href="/trust/how-it-works" className={lien}>
          Comment ça marche
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Mes contacts savent-ils qu’ils sont dans mon cercle ?',
    a: (
      <>
        Oui, et c’est volontaire. Le Cercle n’a de sens que si les personnes savent qu’elles
        comptent pour toi — c’est justement pour ça que tu choisis des gens de confiance, pas des
        inconnus.
      </>
    ),
  },
  {
    q: 'Que se passe-t-il si j’active un check-in et que je ne reviens pas ?',
    a: (
      <>
        À l’expiration du délai que tu as fixé, tes contacts reçoivent une{' '}
        <strong>alerte silencieuse</strong>. Ils peuvent alors chercher à te joindre ou, si besoin,
        contacter les secours. Rien ne se déclenche tant que le compte à rebours n’est pas dépassé.
      </>
    ),
  },
  {
    q: 'Est-ce que vous gardez ma position ?',
    a: (
      <>
        Non, <strong>jamais en continu</strong>. Ta position n’est relevée qu’au moment précis où tu
        lances un check-in, uniquement pour pouvoir l’inclure dans l’alerte si elle se déclenche. En
        dehors de ça, Libre ne te suit pas.
      </>
    ),
  },
  {
    q: 'Puis-je utiliser des contacts qui ne sont pas sur Libre ?',
    a: (
      <>
        Pas encore. En V1, ton Cercle se compose de membres Libre. En V2, on prévoit un système
        d’invitation avec <strong>opt-in explicite</strong> : personne n’est ajouté sans avoir
        accepté.
      </>
    ),
  },
];

// L'ancre permet d'envoyer quelqu'un droit sur sa question (état vide de
// Découvrir, formulaire de retour) ; `scroll-mt` laisse la nav sticky au-dessus.
function renderQr({ id, q, a }: Qr) {
  return (
    <section key={q} id={id} className="scroll-mt-24">
      <h3 className="mb-2 mt-6 text-lg font-semibold text-content">{q}</h3>
      <p>{a}</p>
    </section>
  );
}

export default function FaqPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      {/* `prose` est sans effet (pas de plugin typographie) : les titres
          prennent leur hiérarchie ici, sinon tout s'affiche à la même taille. */}
      <h1 className="mb-6 text-3xl font-bold text-content">Foire aux questions</h1>

      <h2 className="mb-2 mt-10 text-2xl font-semibold text-content">Découvrir des profils</h2>
      {DECOUVRIR.map(renderQr)}

      <h2 className="mb-2 mt-10 text-2xl font-semibold text-content">Le Cercle de Confiance</h2>
      {CERCLE.map(renderQr)}

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
