import { describe, it, expect } from 'vitest';
import type { CasFiche } from '../fiche';
import { grouperSignalements } from '../grouper-signalements';

const report = (id: string, motif: string, depuis: string): CasFiche => ({
  type: 'report', id, depuis, motif, motifLibelle: motif, description: '', auteur: 'x', enAttente: 0, reponsesAuMoment: [],
});
const indice: CasFiche = { type: 'indice', id: 'i', depuis: '2026-11-01T00:00:00Z', doublon: null, lies: [] };

describe('grouperSignalements', () => {
  it('réunit les signalements d’un motif à la place du premier, plus ancien d’abord', () => {
    const sortie = grouperSignalements([
      report('b', 'scam', '2026-11-10T10:00:00Z'),
      report('h', 'harassment', '2026-11-09T10:00:00Z'),
      report('a', 'scam', '2026-11-08T10:00:00Z'),
      indice,
      report('c', 'scam', '2026-11-12T10:00:00Z'),
    ]);
    expect(sortie.map((c) => (c.type === 'groupe' ? `${c.motif}:${c.signalements.map((s) => s.id).join('')}` : c.type))).toEqual([
      'scam:abc',
      'harassment:h',
      'indice',
    ]);
  });

  it('ne perd ni ne duplique aucun signalement', () => {
    const cas = [report('a', 'scam', '1'), report('b', 'spam', '2'), report('c', 'scam', '3'), indice];
    const ids = grouperSignalements(cas).flatMap((c) => (c.type === 'groupe' ? c.signalements.map((s) => s.id) : [c.id]));
    expect(ids.sort()).toEqual(['a', 'b', 'c', 'i']);
  });

  it('sans signalement, la liste est rendue telle quelle', () => {
    expect(grouperSignalements([indice])).toEqual([indice]);
    expect(grouperSignalements([])).toEqual([]);
  });
});
