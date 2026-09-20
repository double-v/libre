// @vitest-environment node
/**
 * #340 — quand le pair a réinitialisé sa clé, ce que j'avais chiffré pour son
 * ancienne publique doit rester lisible chez moi : on essaie la courante, puis
 * les remplacées. Sans ça, une réinitialisation d'un côté effacerait
 * l'historique des deux côtés.
 */
import { describe, it, expect } from 'vitest';
import { generateKeyPair, encryptMessage, decryptMessageAvecHistorique } from '@/lib/crypto';

describe('decryptMessageAvecHistorique', () => {
  it('relit un message chiffré pour une clé remplacée du pair', async () => {
    const moi = await generateKeyPair();
    const pairAvant = await generateKeyPair();
    const pairApres = await generateKeyPair();
    const chiffre = await encryptMessage('coucou', pairAvant.publicKey, moi.privateKey);

    await expect(
      decryptMessageAvecHistorique(chiffre, [pairApres.publicKey, pairAvant.publicKey], moi.privateKey),
    ).resolves.toBe('coucou');
  });

  it('lit d’abord avec la clé courante — le cas de tous les jours', async () => {
    const moi = await generateKeyPair();
    const pair = await generateKeyPair();
    const chiffre = await encryptMessage('salut', pair.publicKey, moi.privateKey);
    await expect(decryptMessageAvecHistorique(chiffre, [pair.publicKey], moi.privateKey)).resolves.toBe('salut');
  });

  it('échoue quand aucune clé n’ouvre le message', async () => {
    const moi = await generateKeyPair();
    const inconnu = await generateKeyPair();
    const autre = await generateKeyPair();
    const chiffre = await encryptMessage('secret', inconnu.publicKey, moi.privateKey);
    await expect(decryptMessageAvecHistorique(chiffre, [autre.publicKey], moi.privateKey)).rejects.toThrow();
  });
});
