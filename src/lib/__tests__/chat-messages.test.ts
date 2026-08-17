import { describe, it, expect } from 'vitest';
import { mergeMessages, etatDeLecture, avertissementChiffrement } from '../chat-messages';

type M = { id: string; createdAt: string; content?: string };

const at = (s: string) => `2026-07-08T10:0${s}:00Z`;

describe('mergeMessages', () => {
  it('dédoublonne par id', () => {
    const a: M[] = [{ id: 'm1', createdAt: at('0') }, { id: 'm2', createdAt: at('1') }];
    const b: M[] = [{ id: 'm2', createdAt: at('1') }, { id: 'm3', createdAt: at('2') }];
    expect(mergeMessages(a, b).map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('retrie en ordre chronologique croissant même si les entrées sont désordonnées', () => {
    const a: M[] = [{ id: 'm3', createdAt: at('3') }];
    const b: M[] = [{ id: 'm1', createdAt: at('1') }, { id: 'm2', createdAt: at('2') }];
    expect(mergeMessages(a, b).map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('la version de b gagne sur collision (déchiffré remplace le brut)', () => {
    const a: M[] = [{ id: 'm1', createdAt: at('0'), content: 'CIPHER' }];
    const b: M[] = [{ id: 'm1', createdAt: at('0'), content: 'clair' }];
    expect(mergeMessages(a, b)[0].content).toBe('clair');
  });

  it('départage les timestamps égaux par id (ordre total, pas de trou)', () => {
    const a: M[] = [{ id: 'mB', createdAt: at('0') }];
    const b: M[] = [{ id: 'mA', createdAt: at('0') }];
    expect(mergeMessages(a, b).map((m) => m.id)).toEqual(['mA', 'mB']);
  });

  it('gère les ensembles vides', () => {
    expect(mergeMessages<M>([], [])).toEqual([]);
    const one: M[] = [{ id: 'm1', createdAt: at('0') }];
    expect(mergeMessages(one, []).map((m) => m.id)).toEqual(['m1']);
    expect(mergeMessages([], one).map((m) => m.id)).toEqual(['m1']);
  });
});

describe('etatDeLecture (#198)', () => {
  const CHIFFRE = 'aX9TyVXpsRnIj0rvVkhgdrLG7lhn1WZO7SozJnTURJSEIWI2';
  const pret = { pret: true, maCle: true, clePair: true };

  it('laisse passer un texte qui n’est pas du chiffré', () => {
    expect(etatDeLecture('Salut, ça va ?', pret)).toBe('clair');
  });

  it('déchiffre quand les deux clés sont là', () => {
    expect(etatDeLecture(CHIFFRE, pret)).toBe('dechiffrer');
  });

  it('ne conclut RIEN tant que l’état de la clé n’est pas résolu — sinon tout le fil clignote « illisible » à l’ouverture', () => {
    expect(etatDeLecture(CHIFFRE, { pret: false, maCle: false, clePair: false })).toBe('clair');
    expect(etatDeLecture(CHIFFRE, { pret: false, maCle: true, clePair: true })).toBe('clair');
  });

  it('n’accuse pas l’appareil quand c’est le pair qui n’a pas de clé', () => {
    expect(etatDeLecture(CHIFFRE, { pret: true, maCle: true, clePair: false })).toBe('clair');
    expect(etatDeLecture(CHIFFRE, { pret: true, maCle: false, clePair: false })).toBe('clair');
  });

  it('déclare illisible quand le fil est chiffré pour nous et qu’on n’a pas notre clé', () => {
    expect(etatDeLecture(CHIFFRE, { pret: true, maCle: false, clePair: true })).toBe('illisible');
  });
});

describe('avertissementChiffrement (#198)', () => {
  const enClair = /sans chiffrement/;

  it('ne dit rien quand tout va bien', () => {
    expect(avertissementChiffrement({ etatCle: 'pret', clePair: true })).toBeNull();
  });

  it('ne dit rien tant que l’état de la clé n’est pas résolu', () => {
    expect(avertissementChiffrement({ etatCle: 'chargement', clePair: false })).toBeNull();
  });

  it('prévient que l’envoi part en clair quand notre clé manque', () => {
    const a = avertissementChiffrement({ etatCle: 'illisible', clePair: true })!;
    expect(a.ton).toBe('warning');
    expect(a.texte).toMatch(enClair);
  });

  it('dit que le fil peut être perdu, sans promettre un retour impossible', () => {
    const a = avertissementChiffrement({ etatCle: 'illisible', clePair: true })!;
    expect(a.texte).toMatch(/si tu écrivais avant/i); // condition, pas promesse
    expect(a.texte).toMatch(/perdus pour toi/i);
    expect(a.texte).toMatch(/continue de les voir/i); // l'asymétrie est dite
  });

  it('prévient aussi quand c’est le pair qui n’a pas de clé', () => {
    const a = avertissementChiffrement({ etatCle: 'pret', clePair: false })!;
    expect(a.ton).toBe('info');
    expect(a.texte).toMatch(enClair);
  });

  it('prévient pendant une panne de coffre, sans affoler sur le passé', () => {
    const a = avertissementChiffrement({ etatCle: 'indisponible', clePair: true })!;
    expect(a.texte).toMatch(/intacts/);
    expect(a.texte).toMatch(enClair);
  });
});
