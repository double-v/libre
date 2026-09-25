'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import { proposedQuestions } from '@/lib/questions';
import { saveAnswer } from '@/lib/answers-client';
import type { SerializedAnswer } from '@/lib/answers';

/**
 * « Ceci ou cela » (spec 009, US4) : deux réponses proposées, on choisit
 * celle qui nous ressemble le plus, la suivante arrive. Rien à écrire —
 * l'entrée la plus douce pour les personnes réservées. Pas de score, pas de
 * série ; « Passer cette question » et « Arrêter pour le moment » toujours là.
 */
export default function ThisOrThat({
  answeredKeys,
  onAnswered,
  onStop,
}: {
  answeredKeys: ReadonlySet<string>;
  onAnswered: (answer: SerializedAnswer) => void;
  onStop: () => void;
}) {
  const initial = useMemo(
    () => proposedQuestions('ceci-ou-cela').filter((q) => !answeredKeys.has(q.key)),
    // La file est fixée à l'ouverture du mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [queue, setQueue] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pair = queue[0];

  if (!pair) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted">Tu as répondu à toutes les questions « Ceci ou cela ».</div>
        <Button type="button" variant="secondary" onClick={onStop}>
          Revenir à mes questions
        </Button>
      </div>
    );
  }

  async function choose(option: string) {
    setSaving(option);
    setError('');
    const r = await saveAnswer(pair.key, [option], '');
    setSaving(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onAnswered(r.answer);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">Ceci ou cela</div>
      <h3 className="text-xl font-bold leading-snug text-content">Laquelle de ces deux réponses te ressemble le plus&nbsp;?</h3>
      <div className="flex items-center gap-3" role="group" aria-label={pair.label}>
        {pair.options!.map((o, i) => (
          <span key={o.key} className="contents">
            {i === 1 && <span className="text-sm text-muted">ou</span>}
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => void choose(o.key)}
              className="inline-flex min-h-16 flex-1 items-center justify-center rounded-2xl border border-hairline-strong bg-surface px-4 text-base font-semibold text-content transition-colors hover:border-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 disabled:opacity-60 motion-reduce:transition-none"
            >
              {o.label}
            </button>
          </span>
        ))}
      </div>
      {error && (
        <div role="alert" className="text-sm text-error">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setQueue((q) => [...q.slice(1), q[0]])}>
          Passer cette question
        </Button>
        <Button type="button" variant="ghost" onClick={onStop}>
          Arrêter pour le moment
        </Button>
      </div>
    </div>
  );
}
