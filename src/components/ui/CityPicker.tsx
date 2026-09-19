'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Input from '@/components/ui/Input';
import type { CityCandidate } from '@/lib/geocoding';

/**
 * CityPicker — champ « Ta ville » + propositions qualifiées (spec 004, #405).
 *
 * Bâti sur `Input` (DS) : même bordure, même focus ring, 44 px. La liste est
 * un `listbox` navigable au clavier (↑ ↓ ⏎ ⎋). Chaque proposition porte son
 * qualificatif (département ou pays) : le système ne choisit jamais à la
 * place de la membre entre deux homonymes (SC-005).
 *
 * Le composant ne persiste rien : il remonte le candidat choisi via `onSelect`,
 * le parent décide quoi en faire (PUT profil, rechargement du feed…).
 */

export interface CityPickerProps {
  label?: string;
  placeholder?: string;
  hint?: string;
  /** Appelé avec le candidat choisi ; le champ affiche alors son libellé. */
  onSelect: (city: CityCandidate) => void | Promise<void>;
  /** Valeur initiale du champ (ex. quand on « change » une ville existante). */
  initialQuery?: string;
  autoFocus?: boolean;
  /** Injectable pour les tests ; par défaut GET /api/geoloc/cities. */
  search?: (q: string) => Promise<CityCandidate[]>;
}

export const CITY_PICKER_COPY = {
  label: 'Ta ville',
  placeholder: 'Ex. Lyon, Bruxelles…',
  hint: 'Tape au moins 3 lettres. France d’abord, le reste du monde ensuite.',
  empty: 'Aucune ville ne correspond — essaie avec le code postal ou le pays.',
  unavailable: 'Le service de villes ne répond pas. Réessaie dans un instant.',
  rateLimited: 'Doucement : attends quelques secondes avant de retaper.',
} as const;

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

export class CitySearchError extends Error {
  constructor(public readonly status: number) {
    super(`city_search_${status}`);
  }
}

export async function defaultCitySearch(q: string): Promise<CityCandidate[]> {
  const res = await fetch(`/api/geoloc/cities?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new CitySearchError(res.status);
  const body = (await res.json()) as { cities?: CityCandidate[] };
  return body.cities ?? [];
}

export function qualifierOf(c: CityCandidate): string {
  if (c.country === 'France') return c.qualifier;
  return [c.qualifier, c.country].filter(Boolean).join(', ');
}

export default function CityPicker({
  label = CITY_PICKER_COPY.label,
  placeholder = CITY_PICKER_COPY.placeholder,
  hint = CITY_PICKER_COPY.hint,
  onSelect,
  initialQuery = '',
  autoFocus,
  search = defaultCitySearch,
}: CityPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [candidates, setCandidates] = useState<CityCandidate[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const listId = useId();
  // Une frappe plus récente rend obsolète la réponse d'une frappe plus ancienne.
  const seq = useRef(0);

  // Sous le seuil, tout est remis à zéro dans le gestionnaire de saisie (pas
  // dans l'effet : react-hooks/set-state-in-effect, cf. #179/#193).
  function onChange(value: string) {
    setQuery(value);
    if (value.trim().length < MIN_CHARS) {
      seq.current++;
      setCandidates([]);
      setOpen(false);
      setMessage(null);
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) return;
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await search(q);
        if (mine !== seq.current) return;
        setCandidates(found);
        setActive(0);
        setOpen(true);
        setMessage(found.length === 0 ? CITY_PICKER_COPY.empty : null);
      } catch (e) {
        if (mine !== seq.current) return;
        setCandidates([]);
        setOpen(false);
        setMessage(e instanceof CitySearchError && e.status === 429 ? CITY_PICKER_COPY.rateLimited : CITY_PICKER_COPY.unavailable);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, search]);

  async function choose(c: CityCandidate) {
    // Le champ affiche le choix ; la liste se ferme ; on invalide les
    // recherches en vol pour qu'elles ne rouvrent pas la liste.
    seq.current++;
    setOpen(false);
    setCandidates([]);
    setMessage(null);
    setQuery(`${c.label} — ${qualifierOf(c)}`);
    await onSelect(c);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || candidates.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % candidates.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + candidates.length) % candidates.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void choose(candidates[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div className="relative">
      <Input
        label={label}
        hint={message ? undefined : hint}
        placeholder={placeholder}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => candidates.length > 0 && setOpen(true)}
        autoComplete="off"
        autoFocus={autoFocus}
        inputMode="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && candidates.length > 0 ? optionId(active) : undefined}
        trailingIcon={
          loading ? (
            <span
              aria-hidden="true"
              className="block h-4 w-4 animate-spin rounded-full border-2 border-hairline-strong border-t-coral motion-reduce:animate-none"
            />
          ) : undefined
        }
      />
      {open && candidates.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Villes proposées"
          className="absolute left-0 right-0 z-20 mt-1.5 rounded-control border border-hairline bg-surface p-1 shadow-pop"
        >
          {candidates.map((c, i) => (
            <li
              key={`${c.label}|${c.qualifier}|${c.country}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void choose(c)}
              className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded px-3 text-sm text-content ${
                i === active ? 'bg-sunken' : ''
              }`}
            >
              <span>{c.label}</span>
              <span className="whitespace-nowrap text-xs text-muted">{qualifierOf(c)}</span>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p
          role="status"
          className="mt-1.5 rounded-control border border-dashed border-hairline-strong p-3 text-xs text-muted"
        >
          {message}
        </p>
      )}
    </div>
  );
}
