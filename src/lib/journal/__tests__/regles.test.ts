/**
 * Règles éditoriales (spec 007) — la liste que lisent à la fois l'écran de
 * rédaction et le contrôle. Ici la forme ; la détection est testée dans
 * `garde-fous.test.ts` sur un jeu de référence.
 */
import { describe, it, expect } from 'vitest';
import { REGLES_EDITORIALES } from '../regles';

describe('REGLES_EDITORIALES', () => {
  it('les sept règles de la spec, identifiants uniques r1…r7', () => {
    expect(REGLES_EDITORIALES.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']);
  });

  it('chaque règle a un énoncé, un exemple à éviter, une reformulation et au moins un motif', () => {
    for (const r of REGLES_EDITORIALES) {
      expect(r.enonce.length, r.id).toBeGreaterThan(20);
      expect(r.aEviter, r.id).not.toBe('');
      expect(r.plutot, r.id).not.toBe('');
      expect(r.motifs.length, r.id).toBeGreaterThan(0);
    }
  });

  it('seuls l’e-mail et le téléphone bloquent (FR-016) ; identifiants de motifs uniques', () => {
    const motifs = REGLES_EDITORIALES.flatMap((r) => r.motifs);
    expect(motifs.filter((m) => m.bloquant).map((m) => m.id).sort()).toEqual(['courriel', 'telephone']);
    expect(new Set(motifs.map((m) => m.id)).size).toBe(motifs.length);
  });

  it('la reformulation proposée par chaque règle ne déclenche pas sa propre règle', () => {
    for (const r of REGLES_EDITORIALES) {
      for (const m of r.motifs) expect(m.trouver(r.plutot), `${r.id}/${m.id}`).toEqual([]);
    }
  });

  it('l’exemple à éviter de chaque règle déclenche au moins un de ses motifs', () => {
    for (const r of REGLES_EDITORIALES) {
      expect(r.motifs.flatMap((m) => m.trouver(r.aEviter)).length, r.id).toBeGreaterThan(0);
    }
  });
});
