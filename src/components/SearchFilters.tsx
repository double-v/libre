'use client';

import { useState } from 'react';
import TagButton from './TagButton';
import {
  GENDER_OPTIONS,
  ORIENTATION_OPTIONS,
  RELATIONSHIP_TYPE_OPTIONS,
  INTEREST_CATEGORIES,
} from '@/lib/taxonomy';
import Card from './ui/Card';
import Button, { buttonClassName } from './ui/Button';
import Link from 'next/link';
import ConsentSensibleField, { COPY_CONSENT_SENSIBLE } from './ConsentSensibleField';
import { MIRROR_COPY, SEEKING_HREF } from '@/lib/onboarding';

// Modèle de filtres de recherche partagé entre /discover et /profil (#235).
// « genders/orientations » = qui je veux voir (préférences), distinct de
// l'identité du profil. Vide sur un critère = aucune restriction dessus.
export interface SearchFiltersValue {
  genders: string[];
  orientations: string[];
  /** Types de relation recherchés (#409). Vide = tous. */
  relationshipTypes: string[];
  ageMin: number;
  ageMax: number;
  interests: string[];
  /** Distance maximale en km. `null` = « partout » : c'est une valeur, pas une
   *  absence de réglage, et c'est l'état par défaut (#327). */
  distanceKm: number | null;
}

export const EMPTY_SEARCH_FILTERS: SearchFiltersValue = {
  genders: [],
  orientations: [],
  relationshipTypes: [],
  ageMin: 18,
  ageMax: 99,
  interests: [],
  distanceKm: null,
};

// Le curseur couvre 1→500 km ; la dernière position vaut « partout » (null).
export const DISTANCE_MIN_KM = 1;
export const DISTANCE_MAX_KM = 500;

export function hasActiveFilters(v: SearchFiltersValue): boolean {
  return (
    v.genders.length > 0 ||
    v.orientations.length > 0 ||
    v.relationshipTypes.length > 0 ||
    v.ageMin > 18 ||
    v.ageMax < 99 ||
    v.interests.length > 0 ||
    v.distanceKm !== null
  );
}

interface SearchFiltersProps {
  value: SearchFiltersValue;
  onChange: (value: SearchFiltersValue) => void;
  /** Enveloppe dans une carte « filter-panel ». Faux quand on est déjà dans
   *  une carte (ex : ProfileSection) pour éviter la double bordure. */
  framed?: boolean;
  /** Bouton « Réinitialiser les filtres ». */
  showReset?: boolean;
  /**
   * La lectrice a-t-elle dit ce qu'elle cherche ? Sinon le serveur ignore le
   * filtre par intention (spec 008) : le groupe reste lisible, inactif, et
   * invite à se déclarer. Les choix enregistrés sont gardés.
   */
  intentionDeclared?: boolean;
  /**
   * Réciprocité genre/orientation (#519) : poser un filtre genre exige le
   * genre déclaré (« Je ne souhaite pas le préciser » = silence), poser un
   * filtre orientation exige l'orientation — un critère par côté. Défaut
   * `true` : sans props, le filtre reste libre. La question se pose seulement
   * au clic de pose — un filtre déjà posé n'est jamais chassé (le serveur ne
   * refuse pas la préférence ; la cause du vide le dit au feed, #517).
   */
  genreDeclared?: boolean;
  orientationDeclared?: boolean;
  /** Art. 9 déjà consenti ? Sinon la question embarque la case (#425). */
  sensitiveConsent?: boolean;
  /**
   * Enregistre la déclaration faite dans la question à deux portes, puis le
   * filtre se pose. Renvoie false si l'écriture a échoué — la question reste
   * ouverte, avec l'erreur sous la case. Absent : la question ne se pose pas
   * (usages sans enregistrement d'identité à l'écran).
   */
  onDeclared?: (patch: { genderIdentity?: string; orientation?: string[]; sensitiveConsent?: true }) => Promise<boolean>;
}

const LABEL_CLASS =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted';
const RANGE_CLASS =
  'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-fill-subtle accent-coral';
const SELECT_CLASS =
  'w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm text-content';
const LIEEN_CLASS = 'text-xs font-medium text-coral hover:text-coral-dark';

/** La question en cours : genre ou orientation, jamais les deux. */
type QuestionEnCours = 'genre' | 'orientation';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function SearchFilters({
  value,
  onChange,
  framed = true,
  showReset = true,
  intentionDeclared = true,
  genreDeclared = true,
  orientationDeclared = true,
  sensitiveConsent = true,
  onDeclared,
}: SearchFiltersProps) {
  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];

  const set = (patch: Partial<SearchFiltersValue>) => onChange({ ...value, ...patch });

  // Question en cours (#519) : le critère cliqué attend sa contrepartie. Les
  // choix pendus vivent ici et ne passent au parent qu'à la prise de porte —
  // le feed ne voit jamais un critère sans contrepartie. Un état local
  // (pendus, champs de déclaration) refermé par `fermerQuestion`.
  const [question, setQuestion] = useState<QuestionEnCours | null>(null);
  const [pendusGenre, setPendusGenre] = useState<string[]>([]);
  const [pendusOrientation, setPendusOrientation] = useState<string[]>([]);
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [genreADeclarer, setGenreADeclarer] = useState('');
  const [orientationADeclarer, setOrientationADeclarer] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [attente, setAttente] = useState(false);

  const questionGenre = question === 'genre';
  const questionOrientation = question === 'orientation';

  function fermerQuestion() {
    setQuestion(null);
    setPendusGenre([]);
    setPendusOrientation([]);
    setPorteOuverte(false);
    setGenreADeclarer('');
    setOrientationADeclarer([]);
    setConsent(false);
    setConsentError('');
  }

  /** Retient (ou retire) un critère du pendu ; le dernier décoché referme la
   *  question sans rien poser — c'est le retour par le même chemin. */
  function retenirPendus(critère: 'genre' | 'orientation', suivants: string[]) {
    if (critère === 'genre') setPendusGenre(suivants);
    else setPendusOrientation(suivants);
    // Le dernier critère pendu décoché referme la question : rien ne se pose.
    if (suivants.length === 0) fermerQuestion();
  }

  /** Porte « déclarer » : écrit la déclaration, puis le critère pendu se pose. */
  async function declarerQuestion() {
    if (!onDeclared || question === null) return;
    // Une déclaration est une valeur : « Je ne souhaite pas le préciser »
    // (genre vide) reste un silence — le filtre ne se pose pas (#519).
    if (questionGenre && genreADeclarer === '') return;
    if (questionOrientation && orientationADeclarer.length === 0) return;
    if (!sensitiveConsent && !consent) {
      setConsentError(COPY_CONSENT_SENSIBLE.requis);
      return;
    }
    setAttente(true);
    setConsentError('');
    try {
      const ok = await onDeclared({
        ...(questionGenre ? { genderIdentity: genreADeclarer } : {}),
        ...(questionOrientation ? { orientation: orientationADeclarer } : {}),
        ...(sensitiveConsent ? {} : { sensitiveConsent: true as const }),
      });
      if (!ok) return;
      if (questionGenre) set({ genders: [...value.genders, ...pendusGenre] });
      else set({ orientations: [...value.orientations, ...pendusOrientation] });
      fermerQuestion();
    } finally {
      setAttente(false);
    }
  }

  const reset = () => {
    fermerQuestion();
    onChange(EMPTY_SEARCH_FILTERS);
  };

  const consentQuestion = sensitiveConsent ? null : (
    <ConsentSensibleField checked={consent} onChange={(v) => { setConsent(v); setConsentError(''); }} error={consentError} />
  );

  const body = (
    <div className="space-y-4">
      {/* Genre recherché */}
      <div>
        <p className={LABEL_CLASS}>Genre</p>
        <div className="flex flex-wrap gap-1.5">
          {GENDER_OPTIONS.filter((o) => o.value !== '').map((opt) => (
            <TagButton
              key={opt.value}
              label={opt.label}
              selected={value.genders.includes(opt.value) || (questionGenre && pendusGenre.includes(opt.value))}
              onClick={() => {
                if (questionGenre) {
                  retenirPendus('genre', toggle(pendusGenre, opt.value));
                  return;
                }
                if (!genreDeclared && onDeclared) {
                  // La question se pose au clic, jamais au montage : un filtre
                  // déjà posé n'est pas chassé (le serveur refuse jamais).
                  setQuestion('genre');
                  setPendusGenre([opt.value]);
                  setPorteOuverte(false);
                  setGenreADeclarer('');
                  return;
                }
                set({ genders: toggle(value.genders, opt.value) });
              }}
            />
          ))}
        </div>
        {questionGenre && (
          <div className="mt-2">
            <p className="mb-2 text-sm text-muted">{MIRROR_COPY.genreCritere}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" size="sm" onClick={() => setPorteOuverte(true)}>
                Déclarer mon genre
              </Button>
              <button type="button" onClick={fermerQuestion} className={LIEEN_CLASS}>
                Sans filtre
              </button>
            </div>
            {porteOuverte && (
              <div className="mt-2 space-y-2">
                <label htmlFor="ton-genre-a-declarer" className="text-xs font-semibold uppercase tracking-wider text-muted">Ton genre</label>
                <select
                  id="ton-genre-a-declarer"
                  value={genreADeclarer}
                  onChange={(e) => { setGenreADeclarer(e.target.value); setConsentError(''); }}
                  className={SELECT_CLASS}
                >
                  <option value="">Choisis…</option>
                  {GENDER_OPTIONS.filter((g) => g.value !== '').map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
                {consentQuestion}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="primary" size="sm" loading={attente} onClick={() => void declarerQuestion()}>
                    Enregistrer et filtrer
                  </Button>
                  <button type="button" onClick={fermerQuestion} className={LIEEN_CLASS}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-muted">Sans filtre, tout le monde reste visible.</p>
          </div>
        )}
      </div>

      {/* Orientation recherchée */}
      <div>
        <p className={LABEL_CLASS}>Orientation</p>
        <div className="flex flex-wrap gap-1.5">
          {ORIENTATION_OPTIONS.map((opt) => (
            <TagButton
              key={opt}
              label={cap(opt)}
              selected={value.orientations.includes(opt) || (questionOrientation && pendusOrientation.includes(opt))}
              onClick={() => {
                if (questionOrientation) {
                  retenirPendus('orientation', toggle(pendusOrientation, opt));
                  return;
                }
                if (!orientationDeclared && onDeclared) {
                  setQuestion('orientation');
                  setPendusOrientation([opt]);
                  setPorteOuverte(false);
                  setOrientationADeclarer([]);
                  return;
                }
                set({ orientations: toggle(value.orientations, opt) });
              }}
            />
          ))}
        </div>
        {questionOrientation && (
          <div className="mt-2">
            <p className="mb-2 text-sm text-muted">{MIRROR_COPY.orientationCritere}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" size="sm" onClick={() => setPorteOuverte(true)}>
                Déclarer mon orientation
              </Button>
              <button type="button" onClick={fermerQuestion} className={LIEEN_CLASS}>
                Sans filtre
              </button>
            </div>
            {porteOuverte && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted" id="ton-orientation-a-declarer">Ton orientation</p>
                <div role="group" aria-labelledby="ton-orientation-a-declarer" className="flex flex-wrap gap-1.5">
                  {ORIENTATION_OPTIONS.map((opt) => (
                    <TagButton
                      key={opt}
                      label={cap(opt)}
                      selected={orientationADeclarer.includes(opt)}
                      onClick={() => { setOrientationADeclarer(toggle(orientationADeclarer, opt)); setConsentError(''); }}
                    />
                  ))}
                </div>
                {consentQuestion}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="primary" size="sm" loading={attente} onClick={() => void declarerQuestion()}>
                    Enregistrer et filtrer
                  </Button>
                  <button type="button" onClick={fermerQuestion} className={LIEEN_CLASS}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-muted">Sans filtre, tout le monde reste visible.</p>
          </div>
        )}
      </div>

      {/* Type de relation recherché — critère premier d'une rencontre (#409) */}
      <div>
        <p className={LABEL_CLASS}>Type de relation</p>
        <div className="flex flex-wrap gap-1.5">
          {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
            <TagButton
              key={opt}
              label={cap(opt)}
              selected={value.relationshipTypes.includes(opt)}
              onClick={() => set({ relationshipTypes: toggle(value.relationshipTypes, opt) })}
              disabled={!intentionDeclared}
            />
          ))}
        </div>
        {!intentionDeclared && (
          <div className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-muted">
            <span>{MIRROR_COPY.intentionFilter}</span>
            <Link href={SEEKING_HREF} className={buttonClassName('ghost', 'md', 'px-1')}>
              Préciser
            </Link>
          </div>
        )}
      </div>

      {/* Tranche d'âge */}
      <div>
        <p className={LABEL_CLASS}>
          Âge : {value.ageMin} – {value.ageMax} ans
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={18}
            max={99}
            value={value.ageMin}
            aria-label="Âge minimum"
            aria-valuetext={`${value.ageMin} ans`}
            onChange={(e) => set({ ageMin: Math.min(Number(e.target.value), value.ageMax) })}
            className={`flex-1 ${RANGE_CLASS}`}
          />
          <input
            type="range"
            min={18}
            max={99}
            value={value.ageMax}
            aria-label="Âge maximum"
            aria-valuetext={`${value.ageMax} ans`}
            onChange={(e) => set({ ageMax: Math.max(Number(e.target.value), value.ageMin) })}
            className={`flex-1 ${RANGE_CLASS}`}
          />
        </div>
      </div>

      {/* Distance — la dernière position du curseur vaut « partout » (#327).
          Sans cet état, tout compte existant hériterait d'un rayon qu'il n'a
          jamais choisi et verrait son feed rétrécir sans rien avoir demandé. */}
      <div>
        <p className={LABEL_CLASS}>
          Distance maximale : {value.distanceKm === null ? 'partout' : `${value.distanceKm} km`}
        </p>
        <input
          type="range"
          min={DISTANCE_MIN_KM}
          max={DISTANCE_MAX_KM}
          value={value.distanceKm ?? DISTANCE_MAX_KM}
          aria-label="Distance maximale"
          aria-valuetext={
            value.distanceKm === null ? 'partout' : `${value.distanceKm} kilomètres`
          }
          onChange={(e) => {
            const km = Number(e.target.value);
            set({ distanceKm: km >= DISTANCE_MAX_KM ? null : km });
          }}
          className={RANGE_CLASS}
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{DISTANCE_MIN_KM} km</span>
          <span>partout</span>
        </div>
      </div>

      {/* Centres d'intérêt */}
      <div>
        <p className={LABEL_CLASS}>Centres d&apos;intérêt</p>
        <div className="max-h-48 space-y-3 overflow-y-auto">
          {INTEREST_CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <p className="mb-1 text-xs font-medium text-muted">{cat.name}</p>
              <div className="flex flex-wrap gap-1">
                {cat.items.map((tag) => (
                  <TagButton
                    key={tag}
                    label={tag}
                    selected={value.interests.includes(tag)}
                    onClick={() => set({ interests: toggle(value.interests, tag) })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showReset && hasActiveFilters(value) && (
        <button
          type="button"
          onClick={reset}
          className="text-xs font-medium text-coral hover:text-coral-dark"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );

  if (!framed) return body;

  return (
    <Card as="section" variant="filter">
      {body}
    </Card>
  );
}