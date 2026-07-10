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
