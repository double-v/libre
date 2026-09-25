/**
 * Tests — réponses aux questions : validation par format et miroir (spec 009).
 */
import { describe, it, expect } from 'vitest';
import { validateAnswer, answersFor, ANSWER_MAX } from '../answers';

describe('validateAnswer — formats (FR-002b)', () => {
  it('ouverte : texte requis, aucun choix', () => {
    expect(validateAnswer('fait-rire', { text: '  Les jeux de mots   ratés. ' })).toEqual({ ok: true, value: { choices: [], text: 'Les jeux de mots ratés.' } });
    expect(validateAnswer('fait-rire', { text: '   ' })).toMatchObject({ ok: false, motif: 'texte-requis' });
    expect(validateAnswer('fait-rire', { choices: ['x'], text: 'a' })).toMatchObject({ ok: false, motif: 'choix' });
  });

  it('choix unique : une seule pastille, précision facultative', () => {
    expect(validateAnswer('matin-ou-soir', { choices: ['le-matin'] })).toEqual({ ok: true, value: { choices: ['le-matin'], text: '' } });
    expect(validateAnswer('matin-ou-soir', { choices: ['le-matin', 'le-soir'] })).toMatchObject({ ok: false, motif: 'choix' });
    expect(validateAnswer('matin-ou-soir', { choices: [] })).toMatchObject({ ok: false, motif: 'choix' });
  });

  it('choix multiple : plusieurs pastilles, sans doublon, dans les options', () => {
    expect(validateAnswer('cafe-the', { choices: ['the', 'tisane'], text: 'Vert.' })).toMatchObject({ ok: true });
    expect(validateAnswer('cafe-the', { choices: ['the', 'the'] })).toMatchObject({ ok: false, motif: 'choix' });
    expect(validateAnswer('cafe-the', { choices: ['biere'] })).toMatchObject({ ok: false, motif: 'choix' });
  });

  it('choix multiple : une option exclusive reste seule', () => {
    expect(validateAnswer('cafe-the', { choices: ['aucun-des-quatre'] })).toMatchObject({ ok: true });
    expect(validateAnswer('cafe-the', { choices: ['aucun-des-quatre', 'the'] })).toMatchObject({ ok: false, motif: 'choix' });
  });

  it('ceci-ou-cela : une option parmi deux, sans texte', () => {
    expect(validateAnswer('mer-montagne', { choices: ['mer'] })).toEqual({ ok: true, value: { choices: ['mer'], text: '' } });
    expect(validateAnswer('mer-montagne', { choices: ['mer'], text: 'plutôt' })).toMatchObject({ ok: false, motif: 'texte-interdit' });
  });

  it('refuse une question inconnue', () => {
    expect(validateAnswer('nimporte-quoi', { text: 'a' })).toMatchObject({ ok: false, motif: 'question' });
  });

  it(`borne le texte à ${ANSWER_MAX} caractères, garde les retours à la ligne utiles`, () => {
    expect(validateAnswer('fait-rire', { text: 'a'.repeat(ANSWER_MAX + 1) })).toMatchObject({ ok: false, motif: 'longueur' });
    expect(validateAnswer('fait-rire', { text: 'Un.\n\n\n\nDeux.' })).toMatchObject({ ok: true, value: { text: 'Un.\n\nDeux.' } });
  });

  it('refuse un moyen de contact et les caractères invisibles', () => {
    expect(validateAnswer('fait-rire', { text: 'Écris-moi sur insta @cam' })).toMatchObject({ ok: false, motif: 'contact' });
    expect(validateAnswer('cafe-the', { choices: ['the'], text: 'cam@gmail.com' })).toMatchObject({ ok: false, motif: 'contact' });
    expect(validateAnswer('fait-rire', { text: 'Cam‮ille' })).toMatchObject({ ok: false, motif: 'caracteres' });
  });

  it('accepte emoji et ponctuation dans une phrase, et « la mer.De » sans espace', () => {
    expect(validateAnswer('fait-rire', { text: 'Les chats 😹 ! J’adore la mer.De temps en temps.' })).toMatchObject({ ok: true });
  });
});

describe('answersFor — miroir question par question (FR-004)', () => {
  const pub = (questionKey: string, extra: Record<string, unknown> = {}) => ({
    id: questionKey, questionKey, choices: [] as string[], text: 'SENTINELLE', status: 'published', ...extra,
  });

  it('montre les réponses aux questions que la lectrice a aussi répondues, voile les autres', () => {
    const out = answersFor({ isSelf: false, viewerKeys: new Set(['fait-rire']), answers: [pub('chanson'), pub('fait-rire')] });
    expect(out[0]).toMatchObject({ key: 'fait-rire', text: 'SENTINELLE' });
    expect(out[1]).toEqual({ key: 'chanson', label: expect.any(String), format: 'ouverte', veiled: true });
    expect(JSON.stringify(out[1])).not.toContain('SENTINELLE');
  });

  it('ordonne : en commun d’abord, puis voilées, chacune dans l’ordre de la banque', () => {
    const out = answersFor({ isSelf: false, viewerKeys: new Set(['chanson']), answers: [pub('fait-rire'), pub('dimanche-ideal'), pub('chanson')] });
    expect(out.map((a) => a.key)).toEqual(['chanson', 'dimanche-ideal', 'fait-rire']);
  });

  it('voile tout quand la lectrice est inconnue (fermé par défaut)', () => {
    const out = answersFor({ isSelf: false, viewerKeys: undefined, answers: [pub('fait-rire')] });
    expect(out[0]).toMatchObject({ veiled: true });
  });

  it('n’envoie jamais une réponse retirée par la modération à autrui', () => {
    const out = answersFor({ isSelf: false, viewerKeys: new Set(['fait-rire']), answers: [pub('fait-rire', { status: 'removed' })] });
    expect(out).toEqual([]);
  });

  it('montre tout à soi-même, y compris l’état « retirée »', () => {
    const out = answersFor({ isSelf: true, viewerKeys: undefined, answers: [pub('fait-rire', { status: 'removed' }), pub('chanson')] });
    expect(out).toHaveLength(2);
    expect(out.find((a) => a.key === 'fait-rire')).toMatchObject({ status: 'removed' });
  });

  it('ignore une réponse dont la question n’existe plus dans le code', () => {
    const out = answersFor({ isSelf: false, viewerKeys: new Set(['disparue']), answers: [pub('disparue')] });
    expect(out).toEqual([]);
  });
});
