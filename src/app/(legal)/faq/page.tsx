import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ — Cercle de Confiance',
  description:
    'Questions fréquentes sur le Cercle de Confiance de Libre : à quoi il sert, ce que voient tes contacts, les check-ins et le respect de ta vie privée.',
  robots: { index: true, follow: true },
};

// Q/R issues du ticket #63. Contenu statique — français, ton rassurant (PRODUCT.md).
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'C’est quoi le Cercle de Confiance ?',
    a: (
      <>
        Ce sont les personnes que tu choisis comme contacts de confiance sur Libre. En un geste,
        tu peux les prévenir avant un rendez-vous : si tu ne confirmes pas que tout va bien, elles
        reçoivent une alerte. Un filet de sécurité discret, que tu gardes entièrement sous ton
        contrôle. Pour le détail des niveaux et du fonctionnement, vois{' '}
        <Link
          href="/trust/how-it-works"
          className="text-coral hover:underline dark:text-coral-light"
        >
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

export default function FaqPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Foire aux questions</h1>
      <p className="text-sm text-muted">Le Cercle de Confiance</p>

      {FAQ.map(({ q, a }) => (
        <section key={q}>
          <h2>{q}</h2>
          <p>{a}</p>
        </section>
      ))}

      <hr />
      <p className="text-sm text-muted">
        Un souci technique ? Vois aussi{' '}
        <Link href="/faq/session-expiree" className="text-coral hover:underline dark:text-coral-light">
          « Session expirée » — que faire
        </Link>
        .
      </p>
    </article>
  );
}
