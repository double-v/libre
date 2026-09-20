/**
 * #341 — le diagnostic de la clé d'un compte, la seule chose que le support
 * ait besoin de savoir : « reconnecte-toi, tout revient » ou « c'est perdu,
 * voilà pourquoi ».
 */
import { describe, it, expect } from 'vitest';
import { diagnostiquerCle } from '@/lib/cle-diagnostic';

describe('diagnostiquerCle', () => {
  it('aucune clé : le compte n’a jamais ouvert de conversation', () => {
    expect(diagnostiquerCle({ clePresente: false, coffreGarni: false })).toBe('aucune');
  });
  it('coffre garni : récupérable, il suffit de se reconnecter', () => {
    expect(diagnostiquerCle({ clePresente: true, coffreGarni: true })).toBe('recuperable');
  });
  it('clé publique connue, coffre vide : perdue sauf appareil d’origine', () => {
    expect(diagnostiquerCle({ clePresente: true, coffreGarni: false })).toBe('perdue');
  });
});
