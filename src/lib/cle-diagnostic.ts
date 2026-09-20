/**
 * Diagnostic de la clé de messagerie d'un compte (#341), pour le support.
 *
 * Trois états, et un seul message utile par état. Le support n'a pas besoin
 * d'en savoir plus — et surtout pas de la clé elle-même : la route qui
 * consomme ceci ne renvoie que des dates et des booléens.
 */
export type DiagnosticCle = 'aucune' | 'recuperable' | 'perdue';

export function diagnostiquerCle(ctx: { clePresente: boolean; coffreGarni: boolean }): DiagnosticCle {
  if (!ctx.clePresente) return 'aucune';
  return ctx.coffreGarni ? 'recuperable' : 'perdue';
}

/** Ce que le support dit à la personne, mot pour mot. */
export const COPY_DIAGNOSTIC: Record<DiagnosticCle, { titre: string; conduite: string }> = {
  aucune: {
    titre: 'Aucune clé',
    conduite: 'Le compte n’a jamais ouvert de conversation : la clé sera créée à la première.',
  },
  recuperable: {
    titre: 'Récupérable',
    conduite: 'La clé est au coffre : il suffit de se reconnecter, sur n’importe quel appareil, pour tout relire.',
  },
  perdue: {
    titre: 'Perdue (sauf appareil d’origine)',
    conduite:
      'Clé publique connue, coffre vide — compte d’avant le coffre. Les messages ne se relisent que depuis le navigateur d’origine, qui les versera au coffre. Sinon : Paramètres › Clé de messagerie › Réinitialiser.',
  },
};
