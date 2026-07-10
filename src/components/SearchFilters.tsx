'use client';

import TagButton from './TagButton';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, INTEREST_CATEGORIES } from '@/lib/taxonomy';
import Card from './ui/Card';

// Modèle de filtres de recherche partagé entre /discover et /profil (#235).
// « genders/orientations » = qui je veux voir (préférences), distinct de
// l'identité du profil. Vide sur un critère = aucune restriction dessus.
export interface SearchFiltersValue {
  genders: string[];
  orientations: string[];
  ageMin: number;
  ageMax: number;
  interests: string[];
}

export const EMPTY_SEARCH_FILTERS: SearchFiltersValue = {
  genders: [],
  orientations: [],
  ageMin: 18,
  ageMax: 99,
  interests: [],
};

export function hasActiveFilters(v: SearchFiltersValue): boolean {
  return (
    v.genders.length > 0 ||
    v.orientations.length > 0 ||
    v.ageMin > 18 ||
    v.ageMax < 99 ||
    v.interests.length > 0
  );
}

interface SearchFiltersProps {
  value: SearchFiltersValue;
  onChange: (value: SearchFiltersValue) => void;
  /** Enveloppe dans une carte « filter-panel ». Faux quand on est déjà dans
   *  une carte (ex : ProfileSection) pour éviter la double bordure. */
  framed?: boolean;
  /** Contrôle de distance optionnel — rendu seulement là où la géoloc filtre
   *  réellement (préférences du profil). Absent → pas de slider distance. */
  distanceKm?: number;
  onDistanceChange?: (km: number) => void;
  /** Bouton « Réinitialiser les filtres ». */
  showReset?: boolean;
}

const LABEL_CLASS =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400';
const RANGE_CLASS =
  'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-coral dark:bg-gray-700';

export default function SearchFilters({
  value,
  onChange,
  framed = true,
  distanceKm,
  onDistanceChange,
  showReset = true,
}: SearchFiltersProps) {
  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];

  const set = (patch: Partial<SearchFiltersValue>) => onChange({ ...value, ...patch });

  const reset = () => {
    onChange(EMPTY_SEARCH_FILTERS);
    onDistanceChange?.(50);
  };

  const showDistance = distanceKm !== undefined && onDistanceChange !== undefined;

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
              selected={value.genders.includes(opt.value)}
              onClick={() => set({ genders: toggle(value.genders, opt.value) })}
            />
          ))}
        </div>
      </div>

      {/* Orientation recherchée */}
      <div>
        <p className={LABEL_CLASS}>Orientation</p>
        <div className="flex flex-wrap gap-1.5">
          {ORIENTATION_OPTIONS.map((opt) => (
            <TagButton
              key={opt}
              label={opt.charAt(0).toUpperCase() + opt.slice(1)}
              selected={value.orientations.includes(opt)}
              onClick={() => set({ orientations: toggle(value.orientations, opt) })}
            />
          ))}
        </div>
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

      {/* Distance (optionnel) */}
      {showDistance && (
        <div>
          <p className={LABEL_CLASS}>Distance maximale : {distanceKm} km</p>
          <input
            type="range"
            min={1}
            max={500}
            value={distanceKm}
            aria-label="Distance maximale"
            aria-valuetext={`${distanceKm} kilomètres`}
            onChange={(e) => onDistanceChange?.(Number(e.target.value))}
            className={RANGE_CLASS}
          />
        </div>
      )}

      {/* Centres d'intérêt */}
      <div>
        <p className={LABEL_CLASS}>Centres d&apos;intérêt</p>
        <div className="max-h-48 space-y-3 overflow-y-auto">
          {INTEREST_CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">{cat.name}</p>
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

      {showReset && (hasActiveFilters(value) || (showDistance && distanceKm !== 50)) && (
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
