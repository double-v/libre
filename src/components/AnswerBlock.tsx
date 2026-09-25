'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import AnswerInput from '@/components/AnswerInput';
import { choiceLabels } from '@/components/ProfileAnswers';
import { questionByKey } from '@/lib/questions';
import type { SerializedAnswer } from '@/lib/answers';

const INVITATIONS = 3;

/**
 * Les réponses d'une autre personne sur sa fiche (spec 009, US2/US4).
 *
 * Le serveur a déjà décidé (`answersFor`) : une réponse voilée n'a ni texte ni
 * choix côté client. Ordre : réponses aux mêmes questions (lisibles), puis les
 * « Ceci ou cela » en ligne, puis au plus trois invitations, le reste replié
 * derrière « Voir toutes ses réponses » — aucune fiche ne doit ressembler à
 * un mur de refus, et aucun nombre n'est affiché. Répondre se fait **sur
 * place** ; la fiche est ensuite relue (`onAnswered`) et la réponse de
 * l'autre apparaît, le serveur restant seul juge.
 */
export default function AnswerBlock({ answers, onAnswered }: { answers: SerializedAnswer[]; onAnswered: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  if (answers.length === 0) return null;

  const pairs = answers.filter((a) => a.format === 'ceci-ou-cela');
  const visibles = answers.filter((a) => a.format !== 'ceci-ou-cela' && !('veiled' in a));
  const voilees = answers.filter((a) => a.format !== 'ceci-ou-cela' && 'veiled' in a);
  const montrees = all ? voilees : voilees.slice(0, INVITATIONS);

  const saisie = (key: string) => {
    const q = questionByKey(key);
    if (!q) return null;
    return (
      <div className="mt-2">
        <AnswerInput
          question={q}
          saveLabel="Enregistrer et voir sa réponse"
          onCancel={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            onAnswered();
          }}
        />
      </div>
    );
  };

  const titre = (t: string) => <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t}</h3>;

  return (
    <div className="space-y-4">
      {visibles.length > 0 && (
        <section>
          {titre('Vos réponses aux mêmes questions')}
          <ul className="space-y-2">
            {visibles.map((a) =>
              'choices' in a ? (
                <li key={a.key} className="rounded-2xl bg-blush p-3 dark:bg-coral/10">
                  <p className="text-sm font-semibold text-coral-dark dark:text-coral-light">{questionByKey(a.key)?.label ?? a.label}</p>
                  {a.choices.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {choiceLabels(a.key, a.choices).map((l) => (
                        <span key={l} className="rounded-full bg-coral px-3 py-0.5 text-sm font-medium text-white">{l}</span>
                      ))}
                    </div>
                  )}
                  {a.text && <p className="mt-1.5 whitespace-pre-line text-content">{a.text}</p>}
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      {pairs.length > 0 && (
        <section>
          {titre('Ses choix « Ceci ou cela »')}
          <div className="flex flex-wrap gap-2">
            {pairs.map((a) =>
              'choices' in a ? (
                <span key={a.key} className="rounded-full bg-blush px-3 py-1 text-sm text-content dark:bg-coral/10">
                  {choiceLabels(a.key, a.choices).join(' · ')}
                </span>
              ) : (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setOpen(open === a.key ? null : a.key)}
                  aria-expanded={open === a.key}
                  className="min-h-11 rounded-full bg-fill-subtle px-3 text-sm text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                >
                  {questionByKey(a.key)?.label ?? a.label}&nbsp;?
                </button>
              ),
            )}
          </div>
          {pairs.some((a) => a.key === open) && open && (
            <div className="mt-2 rounded-2xl bg-fill-subtle p-3">
              <p className="mb-2 text-sm text-muted">Réponds à cette question pour découvrir son choix.</p>
              {saisie(open)}
            </div>
          )}
        </section>
      )}

      {voilees.length > 0 && (
        <section>
          {titre(visibles.length > 0 ? 'Ses autres réponses' : 'Ses réponses')}
          <ul className="space-y-2">
            {montrees.map((a) => (
              <li key={a.key} className="rounded-2xl bg-fill-subtle p-3">
                <p className="text-sm font-semibold text-coral-dark dark:text-coral-light">{questionByKey(a.key)?.label ?? a.label}</p>
                {open === a.key ? (
                  saisie(a.key)
                ) : (
                  <>
                    <div aria-hidden="true" className="mt-2 space-y-1.5">
                      <span className="block h-2 w-11/12 rounded-full bg-hairline" />
                      <span className="block h-2 w-2/3 rounded-full bg-hairline" />
                    </div>
                    <p className="mt-2 text-sm text-muted">Réponds à cette question pour découvrir sa réponse.</p>
                    <Button type="button" variant="ghost" className="-ml-2" onClick={() => setOpen(a.key)}>
                      Répondre à cette question
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {voilees.length > INVITATIONS && (
            <Button type="button" variant={all ? 'ghost' : 'secondary'} fullWidth className="mt-2" onClick={() => setAll(!all)}>
              {all ? 'Afficher moins de réponses' : 'Voir toutes ses réponses'}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
