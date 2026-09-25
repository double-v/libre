'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ANSWER_MAX, type SerializedAnswer } from '@/lib/answers';
import { saveAnswer } from '@/lib/answers-client';
import type { Question } from '@/lib/questions';

/**
 * Saisir une réponse selon le format de la question (spec 009, FR-002b).
 *
 * - **choix** : pastilles ; l'écran annonce en toutes lettres « Choisis une
 *   réponse. » ou « Tu peux choisir plusieurs réponses. » ; une option
 *   exclusive retire les autres. Une pastille suffit : la précision reste
 *   repliée jusqu'au choix (les personnes réservées répondent d'un geste).
 * - **ouverte** : texte libre, avec l'aide de la question.
 * - **ceci-ou-cela** : deux grandes pastilles, rien à écrire.
 *
 * Copie en phrases complètes, lisible de 18 à 79 ans (FR-011).
 */
export default function AnswerInput({
  question,
  initial,
  onSaved,
  onCancel,
  cancelLabel = 'Annuler',
  saveLabel = 'Enregistrer ma réponse',
}: {
  question: Question;
  initial?: { choices: string[]; text: string };
  onSaved: (answer: SerializedAnswer) => void;
  onCancel?: () => void;
  /** Libellé du bouton secondaire (« Annuler », « Passer cette question »). */
  cancelLabel?: string;
  saveLabel?: string;
}) {
  const [choices, setChoices] = useState<string[]>(initial?.choices ?? []);
  const [text, setText] = useState(initial?.text ?? '');
  const [precise, setPrecise] = useState(Boolean(initial?.text));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const multiple = question.format === 'choix' && question.multiple === true;
  const exclusives = new Set((question.options ?? []).filter((o) => o.exclusive).map((o) => o.key));

  function toggle(key: string) {
    setError('');
    if (!multiple) {
      setChoices([key]);
      return;
    }
    if (choices.includes(key)) {
      setChoices(choices.filter((c) => c !== key));
    } else if (exclusives.has(key)) {
      setChoices([key]);
    } else {
      setChoices([...choices.filter((c) => !exclusives.has(c)), key]);
    }
  }

  const ready = question.format === 'ouverte' ? text.trim().length > 0 : choices.length > 0;

  async function submit() {
    setSaving(true);
    setError('');
    const r = await saveAnswer(question.key, choices, question.format === 'ceci-ou-cela' ? '' : text);
    setSaving(false);
    if (r.ok) onSaved(r.answer);
    else setError(r.error);
  }

  const pastille = (key: string, label: string, grande = false) => (
    <button
      key={key}
      type="button"
      aria-pressed={choices.includes(key)}
      onClick={() => toggle(key)}
      className={`inline-flex items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 motion-reduce:transition-none ${
        grande ? 'min-h-16 flex-1 rounded-2xl text-base font-semibold' : 'min-h-11'
      } ${
        choices.includes(key)
          ? 'border-coral bg-coral text-white'
          : 'border-hairline-strong bg-surface text-content hover:border-coral-light'
      }`}
    >
      {label}
    </button>
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) void submit();
      }}
    >
      {question.format === 'choix' && (
        <>
          <div className="text-sm text-muted">{multiple ? 'Tu peux choisir plusieurs réponses.' : 'Choisis une réponse.'}</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Réponses proposées">
            {question.options!.map((o) => pastille(o.key, o.label))}
          </div>
          {choices.length > 0 &&
            (precise ? (
              <Input
                label="Si tu le souhaites, ajoute quelques mots à ta réponse."
                multiline
                rows={3}
                maxLength={ANSWER_MAX}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            ) : (
              <Button type="button" variant="ghost" onClick={() => setPrecise(true)}>
                Ajouter quelques mots (facultatif)
              </Button>
            ))}
        </>
      )}

      {question.format === 'ceci-ou-cela' && (
        <div className="flex items-center gap-3" role="group" aria-label="Deux réponses proposées">
          {pastille(question.options![0].key, question.options![0].label, true)}
          <span className="text-sm text-muted">ou</span>
          {pastille(question.options![1].key, question.options![1].label, true)}
        </div>
      )}

      {question.format === 'ouverte' && (
        <Input
          label="Ta réponse"
          multiline
          rows={3}
          maxLength={ANSWER_MAX}
          value={text}
          onChange={(e) => {
            setError('');
            setText(e.target.value);
          }}
          hint={question.hint ?? `Une phrase suffit. Tu peux écrire jusqu’à ${ANSWER_MAX} caractères.`}
        />
      )}

      {error && (
        <div role="alert" className="text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" variant="primary" loading={saving} disabled={!ready}>
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
