/**
 * Adresse lisible d'une publication du journal (spec 007, R6).
 *
 * Calculée une seule fois, à la première publication, puis figée : une adresse
 * partagée ou indexée ne doit jamais casser parce qu'un titre a été retouché.
 */
export function slugDepuisTitre(titre: string): string {
  const s = titre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return s || 'publication';
}

/** Première variante libre de `base` : `base`, puis `base-2`, `base-3`… */
export async function slugLibre(base: string, existe: (slug: string) => Promise<boolean>): Promise<string> {
  if (!(await existe(base))) return base;
  for (let n = 2; ; n++) {
    const candidat = `${base}-${n}`;
    if (!(await existe(candidat))) return candidat;
  }
}
