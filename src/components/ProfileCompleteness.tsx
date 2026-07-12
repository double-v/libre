'use client';

interface ProfileCompletenessProps {
  profile: Record<string, unknown> | null;
  onSuggestionClick?: (section: string) => void;
}

const CHECKS: { key: string; label: string; section: string }[] = [
  { key: 'bio', label: 'une bio', section: 'bio' },
  { key: 'birthDate', label: 'ta date de naissance', section: 'identity' },
  { key: 'genderIdentity', label: 'ton genre', section: 'identity' },
  { key: 'orientation', label: 'ton orientation', section: 'orientation' },
  { key: 'interests', label: "des centres d'intérêt", section: 'interests' },
  { key: 'photos', label: 'au moins une photo', section: 'photos' },
];

function getCopyState(filledCount: number, totalCount: number) {
  if (filledCount === 0) {
    return { kind: 'low' as const, headline: 'Ton profil est vide pour l’instant' };
  }
  if (filledCount >= totalCount) {
    return { kind: 'complete' as const, headline: 'Profil complet, bravo ! ✨' };
  }
  if (filledCount <= 1) {
    return { kind: 'low' as const, headline: 'Ton profil est vide pour l’instant' };
  }
  if (filledCount <= 2) {
    return { kind: 'low' as const, headline: 'Profil encore timide — raconte-toi un peu' };
  }
  if (filledCount === 3) {
    return { kind: 'mid' as const, headline: 'Plus qu’un pas pour être vu·e' };
  }
  if (filledCount === 4) {
    return { kind: 'mid' as const, headline: 'Bientôt fini, encore un peu' };
  }
  return { kind: 'mid' as const, headline: 'Quasiment complet, dernier effort' };
}

export default function ProfileCompleteness({ profile, onSuggestionClick }: ProfileCompletenessProps) {
  if (!profile) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-6 rounded-xl border border-coral/15 bg-blush p-4 dark:border-coral/20 dark:bg-coral/10"
      >
        <p className="text-sm text-muted">Commence par remplir ton profil</p>
      </div>
    );
  }

  const filled = CHECKS.filter((c) => {
    const val = profile[c.key];
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'string') return val.length > 0;
    return val != null;
  });

  const pct = Math.round((filled.length / CHECKS.length) * 100);
  const nextMissing = CHECKS.find((c) => {
    const val = profile[c.key];
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'string') return val.length === 0;
    return val == null;
  });

  const copy = getCopyState(filled.length, CHECKS.length);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 rounded-xl border border-coral/15 bg-blush p-4 dark:border-coral/20 dark:bg-coral/10"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-content">
          {copy.headline}
        </p>
        <span className="text-xs text-muted">{filled.length}/{CHECKS.length}</span>
      </div>
      <div className="mb-2 h-1.5 w-full rounded-full bg-coral/15 dark:bg-coral/20">
        <div
          className="h-1.5 rounded-full bg-coral transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextMissing && copy.kind !== 'complete' && (
        <>
          <p className="text-xs text-muted">
            Ajoute {nextMissing.label}
            {onSuggestionClick && (
              <button
                type="button"
                onClick={() => onSuggestionClick(nextMissing.section)}
                className="ml-1 font-medium text-coral underline hover:text-terracotta"
              >
                ici
              </button>
            )}
          </p>
          {/* Le « pourquoi » : relier la complétion à la qualité de rencontre
              (North Star), sans promesse racoleuse. */}
          <p className="mt-1 text-xs text-muted">
            Plus ton profil te ressemble, plus les rencontres sont justes.
          </p>
        </>
      )}
    </div>
  );
}
