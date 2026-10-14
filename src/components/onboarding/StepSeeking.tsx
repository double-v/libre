'use client';

import { useState } from 'react';
import OnboardingShell from './OnboardingShell';
import TagButton from '@/components/TagButton';
import Card from '@/components/ui/Card';
import ConsentSensibleField, { COPY_CONSENT_SENSIBLE } from '@/components/ConsentSensibleField';
import QuestionPortesIdentite, { SELECT_CLASS } from '@/components/QuestionPortesIdentite';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, RELATIONSHIP_TYPE_OPTIONS } from '@/lib/taxonomy';
import { MIRROR_COPY } from '@/lib/onboarding';

/**
 * Étape 2 — ce que tu cherches (spec 005, FR-008). Une saisie, deux cibles :
 * le type de relation choisi devient à la fois ce que je déclare
 * (`relationshipType`) et ce que je cherche (`searchRelationshipTypes`). La
 * personne pourra dissocier plus tard dans son profil.
 *
 * Les critères genre/orientation portent l'échange (#518 : « l'orientation
 * des gens qui te plaisent ») et la réciprocité (#519) : choisir un critère
 * sans contrepartie pose la question — deux portes, ici même. « Déclarer »
 * retient la valeur dans l'écran, l'écriture voyage dans le PUT de l'étape ;
 * « Sans filtre » retire le critère. Jamais d'écriture forcée : « Plus
 * tard » reste possible, et un critère retiré suffit à traverser l'étape. Le
 * serveur, lui, refuse jamais une préférence — la contrepartie est un contrat
 * d'UI, pas de route.
 */
export interface SeekingPayload {
  relationshipType: string[];
  searchRelationshipTypes: string[];
  searchGenders: string[];
  searchOrientations: string[];
  /** Déclarations prises dans la question à deux portes (#519) — art. 9. */
  genderIdentity?: string;
  orientation?: string[];
  /** Art. 9 (#425) : présent seulement si une donnée sensible est choisie. */
  sensitiveConsent?: true;
}

export interface StepSeekingProps {
  /** Réciprocité (#519) : contreparties déjà déclarées en base. Défaut `true`
   *  (comportement préservé) : l'étape pose la question seulement quand les
   *  props disent le contraire — /bienvenue les porte. */
  genreDeclared?: boolean;
  orientationDeclared?: boolean;
  /** Art. 9 déjà consenti ? Sinon la case vient dans l'écran. */
  sensitiveConsent?: boolean;
  onContinue: (payload: SeekingPayload) => Promise<void> | void;
  onLater: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const LABEL = 'mb-1.5 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted';

export default function StepSeeking({
  onContinue,
  onLater,
  genreDeclared = true,
  orientationDeclared = true,
  sensitiveConsent = false,
}: StepSeekingProps) {
  const [rel, setRel] = useState<string[]>([]);
  // Critère genre recherché (« Qui veux-tu voir ? »).
  const [genders, setGenders] = useState<string[]>([]);
  // Critère orientation recherchée (« l'orientation des gens qui te plaisent »).
  const [orientations, setOrientations] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Contrepartie déclarée dans l'écran (#519) : le champ ne s'ouvre qu'à la
  // prise de porte, puis la valeur retenue part dans le PUT de l'étape.
  const [genreDeclare, setGenreDeclare] = useState('');
  const [orientationDeclaree, setOrientationDeclaree] = useState<string[]>([]);

  const contrepartieGenre = genreDeclared || genreDeclare !== '';
  const contrepartieOrientation = orientationDeclared || orientationDeclaree.length > 0;
  // Réciprocité : la question du critère posé sans contrepartie.
  const questionGenre = genders.length > 0 && !contrepartieGenre;
  const questionOrientation = orientations.length > 0 && !contrepartieOrientation;

  // Donnée sensible choisie : critères posés ou déclarations prises. La case
  // art. 9 suit, jamais pré-cochée (#425).
  const sensible =
    genders.length > 0 ||
    orientations.length > 0 ||
    genreDeclare !== '' ||
    orientationDeclaree.length > 0;

  async function submit() {
    setBusy(true);
    try {
      await onContinue({
        relationshipType: rel,
        searchRelationshipTypes: rel,
        searchGenders: genders,
        searchOrientations: orientations,
        ...(genreDeclare !== '' ? { genderIdentity: genreDeclare } : {}),
        ...(orientationDeclaree.length > 0 ? { orientation: orientationDeclaree } : {}),
        ...(sensible ? { sensitiveConsent: true as const } : {}),
      });
    } finally {
      setBusy(false);
    }
  }

  // La contrepartie a été validée dans la question (la case a été vue là,
  // pas ici) : l'écriture du PUT porte `sensitiveConsent`, inutile de
  // redemander une case au parent.
  const declaredDansLEcran = genreDeclare !== '' || orientationDeclaree.length > 0;

  return (
    <OnboardingShell
      step={1}
      title="Ce que tu cherches"
      lead="Les autres sauront si vous cherchez la même chose. Tu peux en choisir plusieurs, et changer d'avis à tout moment."
      primary={{
        label: 'Continuer',
        onClick: () => void submit(),
        loading: busy,
        disabled:
          // Sans la case art. 9, l'écriture serait refusée (#425/#518) :
          // le bouton se tait, l'erreur le dit. Une contrepartie validée dans
          // la question suffit : sa case a déjà été cochée là où elle se pose.
          (sensible && !sensitiveConsent && !consent && !declaredDansLEcran) ||
          // Réciprocité (#519) : un critère posé sans contrepartie attend la porte.
          questionGenre ||
          questionOrientation,
      }}
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

          {/* Genre : le critère demande (« Qui veux-tu voir ? »), la question
              pose l'échange, la déclaration se retient dans l'écran. */}
          <div>
            <p className={LABEL}>
              <span>Qui veux-tu voir ?</span>
              <small className="font-normal normal-case tracking-normal">facultatif</small>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GENDER_OPTIONS.filter((g) => g.value !== '').map((g) => (
                <TagButton
                  key={g.value}
                  label={g.label}
                  selected={genders.includes(g.value)}
                  onClick={() => setGenders(toggle(genders, g.value))}
                />
              ))}
            </div>
            {questionGenre && (
              <QuestionPortesIdentite
                critère="genre"
                sensitiveConsent={sensitiveConsent}
                // La porte de secours : le critère se retire, rien ne se
                // pose — la valeur pendue aussi, elle n'avait pas le sens.
                onSansFiltre={() => setGenders([])}
                onDeclarer={async (valeur) => {
                  if (typeof valeur !== 'string') return false;
                  setGenreDeclare(valeur);
                  return true;
                }}
              />
            )}
            {/* La contrepartie prise se rappelle en une ligne : le champ vit
                dans la question, seule ou elle. */}
            {genreDeclare !== '' && (
              <p className="mt-2 text-sm text-content">Ton genre : {GENDER_OPTIONS.find((g) => g.value === genreDeclare)?.label ?? genreDeclare}</p>
            )}
          </div>

          {/* Orientation recherchée porte l'échange ; la déclaration en
              question n'anticipe jamais la valeur du critère : le champ de
              déclaration s'ouvre vide. */}
          <div>
            <p className={LABEL}>
              <span>L&apos;orientation des gens qui te plaisent</span>
              <small className="font-normal normal-case tracking-normal">facultatif</small>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ORIENTATION_OPTIONS.map((opt) => (
                <TagButton
                  key={opt}
                  label={cap(opt)}
                  selected={orientations.includes(opt)}
                  onClick={() => setOrientations(toggle(orientations, opt))}
                />
              ))}
            </div>
            {questionOrientation && (
              <QuestionPortesIdentite
                critère="orientation"
                sensitiveConsent={sensitiveConsent}
                onSansFiltre={() => setOrientations([])}
                onDeclarer={async (valeur) => {
                  if (!Array.isArray(valeur) || valeur.length === 0) return false;
                  setOrientationDeclaree(valeur);
                  return true;
                }}
              />
            )}
            {/* Symétrique du côté genre : la déclaration prise se rappelle en
                une ligne, le champ reste dans la question, seule ou elle. */}
            {orientationDeclaree.length > 0 && (
              <p className="mt-2 text-sm text-content">Ton orientation : {orientationDeclaree.map(cap).join(', ')}</p>
            )}
          </div>

          {sensible && (
            <ConsentSensibleField
              checked={consent}
              onChange={setConsent}
              // #518 : « Continuer » désactivé sans un mot — la copie dit le
              // geste, dès le choix sensible sans case cochée.
              error={sensible && !sensitiveConsent && !consent ? COPY_CONSENT_SENSIBLE.requis : undefined}
            />
          )}
        </div>
      </Card>
    </OnboardingShell>
  );
}