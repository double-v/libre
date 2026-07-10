import { describe, it, expect } from 'vitest';
import { mergeMessages } from '../chat-messages';

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
