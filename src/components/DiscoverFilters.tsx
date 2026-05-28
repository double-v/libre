'use client';

import TagButton from './TagButton';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, INTEREST_CATEGORIES } from '@/lib/taxonomy';

interface DiscoverFiltersProps {
  gender: string[];
  orientation: string[];
  ageMin: number;
  ageMax: number;
  interests: string[];
  onChange: (filters: {
    gender: string[];
    orientation: string[];
    ageMin: number;
    ageMax: number;
    interests: string[];
  }) => void;
}

export default function DiscoverFilters({
  gender,
  orientation,
  ageMin,
  ageMax,
  interests,
  onChange,
}: DiscoverFiltersProps) {
  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];

  const reset = () =>
    onChange({ gender: [], orientation: [], ageMin: 18, ageMax: 99, interests: [] });

  const hasFilters = gender.length > 0 || orientation.length > 0 || ageMin > 18 || ageMax < 99 || interests.length > 0;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      {/* Genre */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Genre</p>
        <div className="flex flex-wrap gap-1.5">
          {GENDER_OPTIONS.filter((o) => o.value !== '').map((opt) => (
            <TagButton
              key={opt.value}
              label={opt.label}
              selected={gender.includes(opt.value)}
              onClick={() => onChange({ ...{ gender: toggle(gender, opt.value), orientation, ageMin, ageMax, interests } })}
            />
          ))}
        </div>
      </div>

      {/* Orientation */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Orientation</p>
        <div className="flex flex-wrap gap-1.5">
          {ORIENTATION_OPTIONS.map((opt) => (
            <TagButton
              key={opt}
              label={opt.charAt(0).toUpperCase() + opt.slice(1)}
              selected={orientation.includes(opt)}
              onClick={() => onChange({ ...{ gender, orientation: toggle(orientation, opt), ageMin, ageMax, interests } })}
            />
          ))}
        </div>
      </div>

      {/* Tranche d'âge */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Âge : {ageMin} – {ageMax}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={18}
            max={99}
            value={ageMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ gender, orientation, ageMin: Math.min(v, ageMax), ageMax, interests });
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-coral dark:bg-gray-700"
          />
          <input
            type="range"
            min={18}
            max={99}
            value={ageMax}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ gender, orientation, ageMin, ageMax: Math.max(v, ageMin), interests });
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-coral dark:bg-gray-700"
          />
        </div>
      </div>

      {/* Centres d'intérêt */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Centres d&apos;intérêt</p>
        <div className="max-h-48 overflow-y-auto space-y-3">
          {INTEREST_CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <p className="mb-1 text-[10px] font-medium text-gray-600">{cat.name}</p>
              <div className="flex flex-wrap gap-1">
                {cat.items.map((tag) => (
                  <TagButton
                    key={tag}
                    label={tag}
                    selected={interests.includes(tag)}
                    onClick={() => onChange({ gender, orientation, ageMin, ageMax, interests: toggle(interests, tag) })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasFilters && (
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
}