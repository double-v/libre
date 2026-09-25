'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import AnswerInput from '@/components/AnswerInput';
import { proposedQuestions, THEMES } from '@/lib/questions';
import type { SerializedAnswer } from '@/lib/answers';

/**
 * « Répondre aux questions une par une » (spec 009, FR-002, R4b). Les
 * questions sans réponse défilent, d'un thème ou de tous ; « Passer cette
 * question » la renvoie en fin de file pour cette visite, sans rien mémoriser.
 * Aucun compteur, aucune série : on s'arrête quand on veut (principe I).
 */
export default function QuestionFlow({
  theme,
  answeredKeys,
  onAnswered,
  onStop,
}: {
  theme?: string;
  answeredKeys: ReadonlySet<string>;
  onAnswered: (answer: SerializedAnswer) => void;
  onStop: () => void;
}) {
  // La file est fixée à l'ouverture : répondre ne la réordonne pas sous les yeux.
  const initial = useMemo(
    () => proposedQuestions(theme).filter((q) => q.format !== 'ceci-ou-cela' && !answeredKeys.has(q.key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );
  const [queue, setQueue] = useState(initial);
  const current = queue[0];
  const themeLabel = (key: string) => THEMES.find((t) => t.key === key)?.label ?? '';

  if (!current) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted">
          {theme ? 'Tu as répondu à toutes les questions de ce thème.' : 'Tu as répondu à toutes les questions proposées.'}
        </div>
        <Button type="button" variant="secondary" onClick={onStop}>
          Revenir à mes questions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">{themeLabel(current.theme)}</div>
      <h3 className="text-xl font-bold leading-snug text-content">{current.label}</h3>
      <AnswerInput
        key={current.key}
        question={current}
        onSaved={(a) => {
          onAnswered(a);
          // Par la clé, pas « la première » : la file a pu bouger pendant
          // l'enregistrement (revue PR #466).
          setQueue((q) => q.filter((x) => x.key !== current.key));
        }}
        onCancel={() => setQueue((q) => [...q.slice(1), q[0]])}
        cancelLabel="Passer cette question"
      />
      <Button type="button" variant="ghost" onClick={onStop}>
        Arrêter pour le moment
      </Button>
    </div>
  );
}
