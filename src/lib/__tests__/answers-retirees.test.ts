/**
 * Tests — une question retirée de la banque (spec 009, cas limite ; revue PR #466).
 *
 * La banque réelle, dont une question est marquée retirée : c'est le vrai
 * `answersFor` qui décide. Les réponses existantes restent affichées à qui
 * peut les lire ; personne n'est invité à répondre à une question qu'on ne
 * peut plus choisir.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/questions', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/questions')>();
  const QUESTIONS = reel.QUESTIONS.map((q) => (q.key === 'chanson' ? { ...q, retired: true as const } : q));
  const PAR_CLE = new Map(QUESTIONS.map((q) => [q.key, q]));
  return { ...reel, QUESTIONS, questionByKey: (k: string) => PAR_CLE.get(k) };
});

const { answersFor, validateAnswer } = await import('../answers');
const chanson = { id: 'a', questionKey: 'chanson', choices: [], text: 'SENTINELLE', status: 'published' };

describe('question retirée de la banque', () => {
  it('n’invite plus à y répondre', () => {
    expect(answersFor({ isSelf: false, viewerKeys: new Set(), answers: [chanson] })).toEqual([]);
  });

  it('reste lisible pour qui y avait répondu', () => {
    expect(answersFor({ isSelf: false, viewerKeys: new Set(['chanson']), answers: [chanson] })).toEqual([
      expect.objectContaining({ key: 'chanson', text: 'SENTINELLE' }),
    ]);
  });

  it('reste visible par son autrice', () => {
    expect(answersFor({ isSelf: true, viewerKeys: undefined, answers: [chanson] })).toHaveLength(1);
  });

  it('n’accepte plus de nouvelle réponse', () => {
    expect(validateAnswer('chanson', { text: 'Barbara.' })).toMatchObject({ ok: false, motif: 'question' });
  });
});
