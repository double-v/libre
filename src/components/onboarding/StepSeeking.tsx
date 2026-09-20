'use client';

import { useState } from 'react';
import OnboardingShell from './OnboardingShell';
import TagButton from '@/components/TagButton';
import Card from '@/components/ui/Card';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, RELATIONSHIP_TYPE_OPTIONS } from '@/lib/taxonomy';

/**
 * Étape 2 — ce que tu cherches (spec 005, FR-008). Une saisie, deux cibles :
 * le type de relation choisi devient à la fois ce que je déclare
 * (`relationshipType`) et ce que je cherche (`searchRelationshipTypes`). La
 * personne pourra dissocier plus tard dans son profil.
 */
export interface SeekingPayload {
  relationshipType: string[];
  searchRelationshipTypes: string[];
  searchGenders: string[];
  searchOrientations: string[];
}

export interface StepSeekingProps {
  onContinue: (payload: SeekingPayload) => Promise<void> | void;
  onLater: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const LABEL = 'mb-1.5 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted';

export default function StepSeeking({ onContinue, onLater }: StepSeekingProps) {
  const [rel, setRel] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [orientations, setOrientations] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await onContinue({
        relationshipType: rel,
        searchRelationshipTypes: rel,
        searchGenders: genders,
        searchOrientations: orientations,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell
      step={1}
      title="Ce que tu cherches"
      lead="Les autres sauront si vous cherchez la même chose. Tu peux en choisir plusieurs, et changer d'avis à tout moment."
      primary={{ label: 'Continuer', onClick: () => void submit(), loading: busy }}
      onLater={onLater}
    >
      <Card as="section" variant="filter">
        <div className="space-y-4">
          <div>
            <p className={LABEL}>Type de relation</p>
            <div className="flex flex-wrap gap-1.5">
              {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
                <TagButton key={opt} label={cap(opt)} selected={rel.includes(opt)} onClick={() => setRel(toggle(rel, opt))} />
              ))}
            </div>
          </div>
          <div>
            <p className={LABEL}>
              <span>Qui veux-tu voir ?</span>
              <small className="font-normal normal-case tracking-normal">facultatif</small>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GENDER_OPTIONS.filter((g) => g.value !== '').map((g) => (
                <TagButton key={g.value} label={g.label} selected={genders.includes(g.value)} onClick={() => setGenders(toggle(genders, g.value))} />
              ))}
            </div>
          </div>
          <div>
            <p className={LABEL}>
              <span>Orientation</span>
              <small className="font-normal normal-case tracking-normal">facultatif</small>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ORIENTATION_OPTIONS.map((opt) => (
                <TagButton key={opt} label={cap(opt)} selected={orientations.includes(opt)} onClick={() => setOrientations(toggle(orientations, opt))} />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </OnboardingShell>
  );
}
