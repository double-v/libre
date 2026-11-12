// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ getDb: () => { throw new Error('aucune base ici'); } }));
const { motifLisible } = await import('../fiche');

describe('motif lisible de l’historique', () => {
  it.each([
    ['REJECT_VERIFICATION', 'visage', 'Visage peu visible'],
    ['INVITE_VERIFICATION', 'lexique_arnaque,appareil_partage', 'Vocabulaire d’arnaque (paiement, rencontre tarifée), Appareil partagé avec un autre compte'],
    ['INVITE_VERIFICATION', 'type_inconnu', 'type_inconnu'],
    ['BAN', 'Demande d’argent', 'Demande d’argent'],
    ['BAN', null, null],
  ])('%s « %s » → %s', (action, motif, attendu) => expect(motifLisible(action, motif)).toBe(attendu));
});
