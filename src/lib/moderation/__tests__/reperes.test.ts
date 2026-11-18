/**
 * Repères et « Le membre verra » (spec 012, US4, FR-020 à FR-022, T034).
 *
 * Source unique : la fiche et, au lot 4, le Guide lisent ce module. On
 * vérifie qu'aucun geste ni aucun type de cas n'en manque, que les textes
 * sont des phrases complètes, et que chaque texte confirmé reprend la copie
 * réellement montrée au membre (écrite ici à la main, pas relue du module).
 */
import { describe, it, expect } from 'vitest';
import { GESTES, MOTIFS_SANCTION, REPERES, repereDuCas, type CodeGeste } from '../reperes';

const PHRASE = /^[A-ZÀ-Ý«].*[.!?…»]$/u;

describe('repères par type de cas', () => {
  it.each(['verif', 'report', 'photo', 'reponse', 'indice', 'relecture'] as const)('%s a un repère d’une phrase complète', (t) => {
    expect(REPERES[t]).toMatch(PHRASE);
  });
  it('un signalement pour demande d’argent dit qu’elle suffit pour bannir (US4, scénario 1)', () => {
    expect(repereDuCas({ type: 'report', motif: 'scam' })).toBe('Une demande d’argent à quelqu’un rencontré sur Libre suffit pour bannir, même au premier signalement.');
    expect(repereDuCas({ type: 'report', motif: 'harassment' })).toBe(REPERES.report);
  });
  it('un doublon probable a son propre repère', () => {
    expect(repereDuCas({ type: 'indice', doublon: true })).toBe('Garde le compte dont l’e-mail est confirmé. La suppression est inscrite dans l’historique du compte gardé.');
    expect(repereDuCas({ type: 'indice', doublon: false })).toBe(REPERES.indice);
  });
  it('un repère d’indice rappelle de juger le contenu, pas le nombre (M17)', () => {
    expect(REPERES.indice).toMatch(/ne suffit jamais pour sanctionner/);
  });
});

const TOUS: CodeGeste[] = [
  'valider', 'refuser', 'sans_suite', 'avertir', 'bannir', 'garder', 'voiler', 'lever_voile', 'retirer_photo',
  'retirer_reponse', 'rien', 'inviter', 'supprimer_doublon', 'mettre_en_retrait', 'rendre_visible', 'debannir', 'supprimer',
];

describe('gestes', () => {
  it('chaque geste du lot a un libellé et un « Le membre verra »', () => {
    expect(Object.keys(GESTES).sort()).toEqual([...TOUS].sort());
    for (const g of TOUS) {
      expect(GESTES[g].libelle.length, g).toBeGreaterThan(2);
      expect(GESTES[g].membreVerra, g).toMatch(PHRASE);
    }
  });

  it.each(['bannir', 'supprimer'] as const)('%s exige un motif de la liste fermée et une confirmation (FR-022)', (g) => {
    expect(GESTES[g].confirme).toBe(true);
    expect(GESTES[g].motifs).toEqual(Object.keys(MOTIFS_SANCTION));
  });

  it.each(['refuser', 'bannir', 'supprimer', 'mettre_en_retrait', 'retirer_photo', 'voiler', 'avertir', 'supprimer_doublon'] as const)(
    '%s se confirme avant d’agir',
    (g) => expect(GESTES[g].confirme).toBe(true),
  );

  it('le bannissement est la seule décision sans suite pour le membre (FR-025)', () => {
    expect(GESTES.bannir.membreVerra).toContain('Votre compte a été suspendu.');
    expect(GESTES.bannir.membreVerra).toMatch(/seule décision sans suite/);
  });

  it('les textes reprennent la copie réellement montrée au membre', () => {
    expect(GESTES.refuser.membreVerra).toMatch(/motif, un conseil et un nouveau code/);
    expect(GESTES.retirer_reponse.membreVerra).toContain('Cette réponse a été retirée par la modération. Tu peux en écrire une autre.');
    expect(GESTES.mettre_en_retrait.membreVerra).toContain('Ton profil est masqué le temps d’une vérification.');
  });

  it('l’avertissement ne promet pas un message qui n’existe pas encore', () => {
    expect(GESTES.avertir.membreVerra).toMatch(/^Rien pour l’instant/);
  });
});
