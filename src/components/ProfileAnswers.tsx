'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import AnswerInput from '@/components/AnswerInput';
import QuestionFlow from '@/components/QuestionFlow';
import ThisOrThat from '@/components/ThisOrThat';
import { choiceLabels, questionByKey, THEMES } from '@/lib/questions';
import { removeAnswer } from '@/lib/answers-client';
import type { SerializedAnswer } from '@/lib/answers';

type Mine = Extract<SerializedAnswer, { choices: string[] }>;
type Mode = { kind: 'liste' } | { kind: 'suite'; theme?: string } | { kind: 'ceci' };

/**
 * « Mes questions » dans le profil (spec 009, US1/US4). Deux portes d'entrée
 * ludiques avant la liste — personne n'est face à une page blanche — puis les
 * thèmes et mes réponses. Aucun compteur ni jauge de complétion (principe I).
 * Copie en phrases complètes (FR-011), validée au prototype du 2026-09-25.
 */
export default function ProfileAnswers() {
  const [answers, setAnswers] = useState<Mine[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'liste' });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/users/me/answers');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setAnswers(data.answers ?? []);
      } catch {
        if (!cancelled) setLoadError('Impossible de charger tes réponses. Recharge la page pour réessayer.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tant que mes réponses ne sont pas chargées, les parcours restent fermés :
  // sinon une question déjà répondue reviendrait vide et l'enregistrement
  // écraserait la réponse existante (revue PR #466).
  const pret = answers !== null;
  const answered = useMemo(() => new Set((answers ?? []).filter((a) => a.status !== 'removed').map((a) => a.key)), [answers]);

  function upsert(a: SerializedAnswer) {
    if (!('choices' in a)) return;
    setAnswers((prev) => [...(prev ?? []).filter((x) => x.key !== a.key), a]);
  }

  async function retirer(key: string) {
    if (await removeAnswer(key)) setAnswers((prev) => (prev ?? []).filter((x) => x.key !== key));
  }

  const ordered = useMemo(() => {
    const rank = (k: string) => {
      const q = questionByKey(k);
      return q ? THEMES.findIndex((t) => t.key === q.theme) * 1000 : 99_999;
    };
    return [...(answers ?? [])].sort((a, b) => rank(a.key) - rank(b.key));
  }, [answers]);
  const texts = ordered.filter((a) => a.format !== 'ceci-ou-cela');
  const pairs = ordered.filter((a) => a.format === 'ceci-ou-cela');

  if (mode.kind === 'suite') {
    return <QuestionFlow theme={mode.theme} answeredKeys={answered} onAnswered={upsert} onStop={() => setMode({ kind: 'liste' })} />;
  }
  if (mode.kind === 'ceci') {
    return <ThisOrThat answeredKeys={answered} onAnswered={upsert} onStop={() => setMode({ kind: 'liste' })} />;
  }

  return (
    <div className="space-y-5">
      <div className="text-sm leading-relaxed text-muted">
        Réponds à quelques questions pour donner aux autres une bonne raison de t’écrire. Tu pourras lire leurs réponses
        aux questions auxquelles tu auras toi aussi répondu.
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          disabled={!pret}
          onClick={() => setMode({ kind: 'suite' })}
          className="flex min-h-16 disabled:cursor-not-allowed disabled:opacity-60 items-center gap-3 rounded-2xl bg-sunken px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface font-bold text-coral">→</span>
          <span>
            <span className="block font-semibold text-content">Répondre aux questions une par une</span>
            <span className="block text-sm text-muted">
              Les questions s’affichent l’une après l’autre. Pour chacune, tu choisis une réponse proposée ou tu écris la
              tienne. Tu peux passer une question ou t’arrêter quand tu veux.
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={!pret}
          onClick={() => setMode({ kind: 'ceci' })}
          className="flex min-h-16 disabled:cursor-not-allowed disabled:opacity-60 items-center gap-3 rounded-2xl bg-sunken px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface font-bold text-coral">⇄</span>
          <span>
            <span className="block font-semibold text-content">Jouer à « Ceci ou cela »</span>
            <span className="block text-sm text-muted">
              Pour chaque question, deux réponses te sont proposées, par exemple « la mer ou la montagne ». Tu choisis
              celle qui te ressemble le plus, sans rien avoir à écrire.
            </span>
          </span>
        </button>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Ou choisis un thème</div>
        <div className="flex flex-wrap gap-2">
          {THEMES.filter((t) => t.key !== 'ceci-ou-cela').map((t) => (
            <Button key={t.key} type="button" variant="secondary" size="sm" className="min-h-11 rounded-full" disabled={!pret} onClick={() => setMode({ kind: 'suite', theme: t.key })}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {loadError && (
        <div role="alert" className="text-sm text-error">
          {loadError}
        </div>
      )}

      {texts.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Mes réponses</div>
          <ul className="space-y-2">
            {texts.map((a) => {
              const q = questionByKey(a.key);
              if (!q) return null;
              if (editing === a.key) {
                return (
                  <li key={a.key} className="rounded-2xl bg-blush p-3 dark:bg-coral/10">
                    <div className="mb-2 text-sm font-semibold text-coral-dark dark:text-coral-light">{q.label}</div>
                    <AnswerInput
                      question={q}
                      initial={{ choices: a.choices, text: a.text }}
                      onSaved={(saved) => {
                        upsert(saved);
                        setEditing(null);
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  </li>
                );
              }
              return (
                <li key={a.key} className="rounded-2xl bg-blush p-3 dark:bg-coral/10">
                  <div className="text-sm font-semibold text-coral-dark dark:text-coral-light">{q.label}</div>
                  {a.status === 'removed' ? (
                    <div className="mt-1 rounded-lg bg-fill-subtle px-3 py-2 text-sm text-muted">
                      Cette réponse a été retirée par la modération. Tu peux en écrire une autre.
                    </div>
                  ) : (
                    <>
                      {a.choices.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {choiceLabels(a.key, a.choices).map((l) => (
                            <span key={l} className="rounded-full bg-coral px-3 py-0.5 text-sm font-medium text-white">{l}</span>
                          ))}
                        </div>
                      )}
                      {a.text && <div className="mt-1.5 whitespace-pre-line text-content">{a.text}</div>}
                    </>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Button type="button" variant="ghost" onClick={() => setEditing(a.key)}>
                      {a.status === 'removed' ? 'Écrire une autre réponse' : 'Modifier ma réponse'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => void retirer(a.key)}>
                      Retirer ma réponse
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pairs.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Mes choix « Ceci ou cela »</div>
          <div className="flex flex-wrap gap-2">
            {pairs.map((a) => {
              const q = questionByKey(a.key);
              const retire = a.status === 'removed';
              const choix = retire ? 'retiré' : choiceLabels(a.key, a.choices).join(' · ');
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-expanded={editing === a.key}
                  aria-label={`${q?.label ?? a.key} : ${choix}`}
                  onClick={() => setEditing(editing === a.key ? null : a.key)}
                  className={`min-h-11 rounded-full px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${
                    retire ? 'bg-fill-subtle text-muted line-through' : 'bg-blush text-content dark:bg-coral/10'
                  }`}
                >
                  {retire ? q?.label : choix}
                </button>
              );
            })}
          </div>
          {pairs.map((a) => {
            const q = questionByKey(a.key);
            if (editing !== a.key || !q) return null;
            const retire = a.status === 'removed';
            return (
              <div key={a.key} className="mt-2 rounded-2xl bg-fill-subtle p-3">
                {retire && (
                  <div className="mb-2 text-sm text-muted">Ce choix a été retiré par la modération. Tu peux en faire un autre.</div>
                )}
                <AnswerInput
                  question={q}
                  initial={retire ? undefined : { choices: a.choices, text: '' }}
                  onSaved={(saved) => {
                    upsert(saved);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
                <Button type="button" variant="ghost" className="mt-1" onClick={() => void retirer(a.key)}>
                  Retirer ma réponse
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
