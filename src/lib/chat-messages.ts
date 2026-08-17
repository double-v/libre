/**
 * Utilitaires de fusion de messages pour le chat paginé (#200).
 *
 * La pagination par curseur charge le fil par tranches (page initiale = les plus
 * récents, scroll-up = les plus anciens) et le temps-réel Pusher ajoute des
 * messages au fil de l'eau. Ces sources se recoupent : il faut dédoublonner par
 * id et retrier chronologiquement, sans doublon ni trou (critère #200).
 */

export interface ChatMessageLike {
  id: string;
  createdAt: string;
}

/**
 * Fusionne deux ensembles de messages, dédoublonne par `id` et retrie en ordre
 * chronologique croissant (ancien → récent). En cas d'id présent des deux côtés,
 * **la version de `b` gagne** — le caller met donc en second l'ensemble
 * prioritaire (ex. version déchiffrée ou tombstone, qui remplace le brut).
 *
 * Ordre total déterministe : `createdAt` puis `id` en secondaire, miroir du
 * `orderBy [{createdAt},{id}]` de l'API — garantit l'absence de doublon/trou.
 */
export function mergeMessages<T extends ChatMessageLike>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const m of a) byId.set(m.id, m);
  for (const m of b) byId.set(m.id, m); // b écrase a sur collision d'id
  return [...byId.values()].sort((x, y) => {
    const dt = new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime();
    return dt !== 0 ? dt : x.id.localeCompare(y.id);
  });
}

/**
 * Que faire d'un contenu de message avant de l'afficher (#198) ?
 *
 * Trois issues, et la nuance entre elles est tout l'objet du correctif de revue :
 *
 * - `clair` — soit ce n'est pas du chiffré, soit on n'est pas en mesure de
 *   conclure. Deux cas s'y rangent volontairement :
 *     * **l'état de la clé n'est pas encore résolu** : conclure ici ferait
 *       clignoter « Message illisible » sur tout le fil à chaque ouverture,
 *       le temps que le coffre réponde ;
 *     * **le pair n'a pas encore de clé publique** : rien n'a pu être chiffré
 *       pour lui, ce n'est pas un problème d'appareil, et un bandeau dédié le
 *       dit déjà. Accuser l'appareil enverrait la personne chercher une panne
 *       qui n'existe pas, et qu'elle ne pourrait pas réparer.
 * - `dechiffrer` — on a les deux clés : on tente.
 * - `illisible` — on a de quoi savoir qu'on ne sait pas lire : le fil est
 *   chiffré, le pair a une clé, mais pas nous. C'est le cas que #198 rend
 *   visible au lieu de le taire.
 */
export type LectureMessage = 'clair' | 'dechiffrer' | 'illisible';

export function etatDeLecture(
  content: string,
  ctx: { pret: boolean; maCle: boolean; clePair: boolean },
): LectureMessage {
  const ressembleAChiffre = /^[A-Za-z0-9+/]+=*$/.test(content) && content.length >= 30;
  if (!ressembleAChiffre) return 'clair';
  if (!ctx.pret || !ctx.clePair) return 'clair';
  return ctx.maCle ? 'dechiffrer' : 'illisible';
}

/**
 * Ce qu'il faut dire à la personne sur l'état du chiffrement de SA conversation.
 *
 * Une seule fonction pour les trois situations, parce qu'elles se recoupent et
 * que les traiter séparément a produit le défaut qu'on corrige ici : le bandeau
 * parlait du passé (« tes anciens messages sont illisibles ») sans jamais dire
 * que **ce que la personne écrit maintenant part en clair**. `handleSend`
 * retombe en effet sur le texte brut dès qu'une des deux clés manque — un
 * silence qui dégrade la confidentialité sans prévenir personne.
 *
 * L'envoi n'est pas bloqué pour autant : couper la parole à quelqu'un dont la
 * clé a disparu l'empêcherait de dire à l'autre que quelque chose s'est cassé.
 * On informe, on ne décide pas à sa place (PRODUCT.md, « à vous de choisir »).
 */
export interface AvertissementChiffrement {
  /** `warning` quand quelque chose est cassé, `info` quand c'est juste en cours. */
  ton: 'warning' | 'info';
  texte: string;
}

export function avertissementChiffrement(ctx: {
  etatCle: 'chargement' | 'pret' | 'illisible' | 'indisponible';
  clePair: boolean;
}): AvertissementChiffrement | null {
  const enClair = ' Ce que tu écris maintenant part sans chiffrement — évite d’y mettre ce que tu ne dirais pas à voix haute.';

  if (ctx.etatCle === 'illisible') {
    return {
      ton: 'warning',
      texte:
        'Les messages de ce fil ne peuvent pas être déchiffrés sur cet appareil. Si tu écrivais avant depuis un autre téléphone ou navigateur, reconnecte-toi depuis celui-là : ils y sont toujours lisibles. Sinon, ils sont perdus pour toi — la personne en face, elle, continue de les voir.' +
        enClair,
    };
  }
  if (ctx.etatCle === 'indisponible') {
    return {
      ton: 'warning',
      texte:
        'Impossible de récupérer ta clé de messagerie pour le moment. Tes messages sont intacts, réessaie dans un instant.' +
        enClair,
    };
  }
  if (ctx.etatCle === 'chargement') return null;
  if (!ctx.clePair) {
    return {
      ton: 'info',
      texte:
        'Cette personne n’a pas encore de clé de messagerie : le chiffrement ne peut pas s’établir.' + enClair,
    };
  }
  return null;
}
