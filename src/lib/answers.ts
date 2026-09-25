/**
 * Réponses aux questions de profil (spec 009) : validation par format et
 * décision miroir.
 *
 * Miroir question par question (FR-004) : la réponse d'une personne à une
 * question n'est envoyée à une lectrice que si celle-ci a elle-même une
 * réponse **publiée** à la même question. Sinon, l'intitulé et `veiled: true`
 * seulement — ni texte ni choix. Une seule décision, appelée par chaque route
 * qui sérialise des réponses d'autrui : deux logiques parallèles finissent par
 * diverger (#330), et une promesse d'UI doit être adossée au code (#328).
 */
import { contientUnContact } from '@/lib/contact';
import { QUESTIONS, questionByKey, type QuestionFormat } from '@/lib/questions';

export const ANSWER_MAX = 300;

export type AnswerMotif =
  | 'question'
  | 'choix'
  | 'texte-requis'
  | 'texte-interdit'
  | 'longueur'
  | 'contact'
  | 'caracteres'
  | 'identique-retiree';

/** Messages en phrases complètes (FR-011), sans accuser. */
export const ANSWER_MESSAGES: Record<AnswerMotif, string> = {
  question: 'Cette question n’existe pas ou n’est plus proposée.',
  choix: 'Choisis une réponse parmi celles proposées.',
  'texte-requis': 'Écris quelques mots pour répondre à cette question.',
  'texte-interdit': 'Cette question se répond en choisissant une des deux réponses, sans texte.',
  longueur: `Ta réponse peut faire jusqu’à ${ANSWER_MAX} caractères.`,
  contact: 'Pas d’adresse e-mail, de lien ni de numéro dans une réponse : elle est visible par tout le monde.',
  caracteres: 'Ta réponse contient un caractère invisible ou non autorisé. Réécris-la sans copier-coller.',
  'identique-retiree': 'Cette réponse a été retirée par la modération. Écris une réponse différente.',
};

/** Même réponse que celle retirée par la modération (choix dans n'importe quel ordre). */
export function estLaReponseRetiree(
  value: { choices: string[]; text: string },
  removed: { removedText: string | null; removedChoices: string[]; removedAt: Date | null } | null,
): boolean {
  if (!removed?.removedAt) return false;
  const memeTexte = value.text === normalizeAnswerText(removed.removedText ?? '');
  const a = [...value.choices].sort().join('\u0000');
  const b = [...removed.removedChoices].sort().join('\u0000');
  return memeTexte && a === b;
}

export type AnswerInput = { choices?: unknown; text?: unknown };

export type AnswerVerdict =
  | { ok: true; value: { choices: string[]; text: string } }
  | { ok: false; motif: AnswerMotif; message: string };

/** NFC, espaces fusionnés dans chaque ligne, au plus une ligne vide d'affilée. */
export function normalizeAnswerText(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Contrôle et format (U+200B, U+202E…), hors retour à la ligne : invisibles ou
// trompeurs dans un texte lu par autrui.
const INVISIBLES = /[\p{Cc}\p{Cf}]/u;

export function validateAnswer(questionKey: string, input: AnswerInput): AnswerVerdict {
  const refus = (motif: AnswerMotif): AnswerVerdict => ({ ok: false, motif, message: ANSWER_MESSAGES[motif] });
  const q = questionByKey(questionKey);
  if (!q || q.retired) return refus('question');

  const choices = Array.isArray(input.choices) ? input.choices.filter((c): c is string => typeof c === 'string') : [];
  if (Array.isArray(input.choices) && choices.length !== input.choices.length) return refus('choix');
  const text = typeof input.text === 'string' ? normalizeAnswerText(input.text) : '';

  if (q.format === 'ouverte') {
    if (choices.length) return refus('choix');
    if (!text) return refus('texte-requis');
  } else {
    const keys = new Set((q.options ?? []).map((o) => o.key));
    const multiple = q.format === 'choix' && q.multiple === true;
    if (choices.length === 0) return refus('choix');
    if (new Set(choices).size !== choices.length) return refus('choix');
    if (!choices.every((c) => keys.has(c))) return refus('choix');
    if (!multiple && choices.length !== 1) return refus('choix');
    const exclusive = (q.options ?? []).filter((o) => o.exclusive).map((o) => o.key);
    if (choices.length > 1 && choices.some((c) => exclusive.includes(c))) return refus('choix');
    if (q.format === 'ceci-ou-cela' && text) return refus('texte-interdit');
  }

  if ([...text].length > ANSWER_MAX) return refus('longueur');
  if (INVISIBLES.test(text.replace(/\n/g, ''))) return refus('caracteres');
  if (text && contientUnContact(text, 'texte')) return refus('contact');
  return { ok: true, value: { choices, text } };
}

/** Une réponse telle que la base la rend (sélection minimale). */
export interface StoredAnswer {
  id: string;
  questionKey: string;
  choices: string[];
  text: string;
  status: string;
}

export type SerializedAnswer =
  | { key: string; label: string; format: QuestionFormat; choices: string[]; text: string; status?: 'removed'; id?: string }
  | { key: string; label: string; format: QuestionFormat; veiled: true };

const ORDRE = new Map(QUESTIONS.map((q, i) => [q.key, i]));

/**
 * Ce qui sort vers une lectrice pour les réponses d'une personne.
 *
 * `viewerKeys` : clés des réponses **publiées** de la lectrice ; `undefined`
 * (lecture en échec, profil introuvable) voile tout — l'échec ferme. Ordre :
 * les questions en commun d'abord (lisibles), puis les voilées, chacune dans
 * l'ordre de la banque. Une réponse retirée par la modération ne sort jamais
 * vers autrui ; sa propre autrice la voit, avec son état.
 */
export function answersFor(opts: {
  isSelf: boolean;
  viewerKeys: ReadonlySet<string> | undefined;
  answers: readonly StoredAnswer[];
}): SerializedAnswer[] {
  const out: { rank: number; a: SerializedAnswer }[] = [];
  for (const a of opts.answers) {
    const q = questionByKey(a.questionKey);
    if (!q) continue;
    const base = { key: q.key, label: q.label, format: q.format };
    const order = ORDRE.get(q.key) ?? 0;
    if (opts.isSelf) {
      out.push({ rank: order, a: { ...base, id: a.id, choices: a.choices, text: a.text, ...(a.status === 'removed' ? { status: 'removed' as const } : {}) } });
      continue;
    }
    if (a.status !== 'published') continue;
    const visible = opts.viewerKeys?.has(q.key) === true;
    out.push(
      visible
        ? { rank: order, a: { ...base, choices: a.choices, text: a.text } }
        : { rank: 100_000 + order, a: { ...base, veiled: true } },
    );
  }
  return out.sort((x, y) => x.rank - y.rank).map((x) => x.a);
}
