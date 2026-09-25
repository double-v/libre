/**
 * Tests — banque de questions (spec 009, FR-001, FR-002b).
 *
 * La banque vit dans le code et se modifie par PR : ce test est le garde-fou
 * de sa cohérence (clés stables et uniques, formats bien formés, typographie).
 */
import { describe, it, expect } from 'vitest';
import { QUESTIONS, THEMES, choiceLabels, proposedQuestions, questionByKey } from '../questions';

const KEY = /^[a-z0-9-]+$/;

describe('banque de questions', () => {
  it('compte la banque validée par l’opérateur (89 questions + 24 « Ceci ou cela »)', () => {
    expect(QUESTIONS.filter((q) => q.format !== 'ceci-ou-cela')).toHaveLength(89);
    expect(QUESTIONS.filter((q) => q.format === 'ceci-ou-cela')).toHaveLength(24);
  });

  it('a des clés uniques et stables, questions comme options', () => {
    const keys = QUESTIONS.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const q of QUESTIONS) {
      expect(q.key).toMatch(KEY);
      const ok = (q.options ?? []).map((o) => o.key);
      expect(new Set(ok).size, q.key).toBe(ok.length);
      ok.forEach((k) => expect(k, q.key).toMatch(KEY));
    }
  });

  it('respecte les formats', () => {
    for (const q of QUESTIONS) {
      if (q.format === 'ouverte') expect(q.options, q.key).toBeUndefined();
      if (q.format === 'ceci-ou-cela') expect(q.options, q.key).toHaveLength(2);
      if (q.format === 'choix') {
        expect(q.options!.length, q.key).toBeGreaterThanOrEqual(2);
        expect(q.options!.length, q.key).toBeLessThanOrEqual(5);
      }
      if (q.options?.some((o) => o.exclusive)) expect(q.multiple, q.key).toBe(true);
    }
  });

  it('rattache chaque question à un thème connu', () => {
    const themes = new Set(THEMES.map((t) => t.key));
    for (const q of QUESTIONS) expect(themes.has(q.theme), q.key).toBe(true);
  });

  it('colle le « ? » à la question par une espace insécable (jamais seul à la ligne)', () => {
    for (const q of QUESTIONS) expect(q.label, q.key).not.toMatch(/ [?!:;]/);
  });

  it('n’aborde aucun thème exclu (santé, politique, religion, sexualité, argent)', () => {
    const exclus = /politi|religi|sexu|argent|salaire|maladie|santé|vote/i;
    for (const q of QUESTIONS) expect(q.label, q.key).not.toMatch(exclus);
  });

  it('ne cite que des produits légaux dans l’aide de « habitudes »', () => {
    const h = questionByKey('habitudes')!;
    expect(h.format).toBe('ouverte');
    expect(h.options).toBeUndefined();
    expect(h.hint).toMatch(/café.*alcool.*tabac.*CBD/);
    expect(h.hint).not.toMatch(/cannabis|beuh|weed|shit|drogue/i);
  });

  it('propose les questions non retirées, par thème', () => {
    expect(proposedQuestions('rire').every((q) => q.theme === 'rire' && !q.retired)).toBe(true);
    expect(proposedQuestions().length).toBe(QUESTIONS.filter((q) => !q.retired).length);
  });

  it('traduit les choix en libellés dans l’ordre de la banque, clés inconnues ignorées', () => {
    expect(choiceLabels('cafe-the', ['tisane', 'cafe', 'inconnue'])).toEqual(['Café', 'Tisane']);
    expect(choiceLabels('disparue', ['x'])).toEqual([]);
  });
});
