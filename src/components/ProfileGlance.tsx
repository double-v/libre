'use client';

import { CameraIcon, HeartIcon, PinIcon } from '@/components/ui/SectionIcons';
import type { OnboardingProfile } from '@/lib/onboarding';

/**
 * « Ce qui permet d'être choisi·e » (#413) : les trois éléments de
 * `deriveMissing` (photo, ce que je cherche, position), chacun fait ou à
 * faire. Coral = à faire, vert = fait. Aucun chiffre, aucun pourcentage : la
 * progression se lit, elle ne se compte pas — même vérité que le parcours
 * d'accueil et la carte de relance.
 */
type GlanceProfile = Pick<OnboardingProfile, 'photos' | 'relationshipType' | 'lastGeolocAt' | 'cityLabel'>;

export interface ProfileGlanceProps {
  profile: GlanceProfile;
}

export default function ProfileGlance({ profile }: ProfileGlanceProps) {
  const items = [
    { href: '#profile-section-photos', label: 'Une photo', todo: 'À ajouter', done: profile.photos.length > 0, Icon: CameraIcon },
    { href: '#profile-section-seeking', label: 'Ce que je cherche', todo: 'À choisir', done: profile.relationshipType.length > 0, Icon: HeartIcon },
    { href: '#profile-section-position', label: 'Où je suis', todo: 'À indiquer', done: !!profile.lastGeolocAt || !!profile.cityLabel, Icon: PinIcon },
  ];
  const allDone = items.every((i) => i.done);

  return (
    <nav aria-label="Compléter mon profil" className="mb-5">
      <p className="mb-2 text-[13px] text-muted">
        {allDone ? 'Ton profil peut être choisi. Le reste, c’est du bonus.' : 'Ce qui permet d’être choisi·e :'}
      </p>
      <ul className="grid grid-cols-3 gap-2">
        {items.map(({ href, label, todo, done, Icon }) => (
          <li key={href}>
            <a
              href={href}
              data-state={done ? 'done' : 'todo'}
              className={`flex min-h-[88px] flex-col items-start gap-2 rounded-xl border p-3 text-left no-underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${
                done
                  ? 'border-hairline bg-surface text-content'
                  : 'border-coral bg-sunken text-content hover:border-terracotta'
              }`}
            >
              <span className={`flex items-center gap-1.5 ${done ? 'text-success' : 'text-coral'}`}>
                <Icon className="h-5 w-5" />
                {done && (
                  <span aria-hidden="true" className="inline-grid h-[18px] w-[18px] place-items-center rounded-full bg-emerald-100 text-[11px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    ✓
                  </span>
                )}
              </span>
              <span className="text-[13px] font-semibold leading-tight">{label}</span>
              <span className={`text-[11px] ${done ? 'text-muted' : 'text-coral'}`}>{done ? 'Fait' : todo}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
