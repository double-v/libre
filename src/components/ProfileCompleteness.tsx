'use client';

interface ProfileCompletenessProps {
  profile: Record<string, unknown> | null;
  onSuggestionClick?: (section: string) => void;
}

const CHECKS: { key: string; label: string; section: string }[] = [
  { key: 'bio', label: 'une bio', section: 'bio' },
  { key: 'birthDate', label: 'votre date de naissance', section: 'identity' },
  { key: 'genderIdentity', label: 'votre genre', section: 'identity' },
  { key: 'orientation', label: 'votre orientation', section: 'orientation' },
  { key: 'interests', label: 'des centres d\'interet', section: 'interests' },
  { key: 'photos', label: 'au moins une photo', section: 'photos' },
];

export default function ProfileCompleteness({ profile, onSuggestionClick }: ProfileCompletenessProps) {
  if (!profile) {
    return (
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Commencez par remplir votre profil</p>
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

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600">
          Profil complété à {pct}%
        </p>
        <span className="text-xs text-gray-400">{filled.length}/{CHECKS.length}</span>
      </div>
      <div className="mb-2 h-1.5 w-full rounded-full bg-gray-200">
        <div
          className="h-1.5 rounded-full bg-coral transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextMissing && pct < 100 && (
        <p className="text-xs text-gray-600">
          Ajoutez {nextMissing.label}
          {onSuggestionClick && (
            <button
              type="button"
              onClick={() => onSuggestionClick(nextMissing.section)}
              className="ml-1 font-medium underline hover:text-black"
            >
              ici
            </button>
          )}
        </p>
      )}
    </div>
  );
}