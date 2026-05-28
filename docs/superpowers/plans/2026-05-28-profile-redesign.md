# Profile Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the profile page to comply with DESIGN.md — extracted components, dark mode, surface hierarchy, pencil icon edit triggers, theme toggle.

**Architecture:** Extract 4 new components (ProfileSection, ProfileField, ChipList, ThemeToggle), update 2 existing (ProfileCompleteness, TagButton), then rewrite the profile page using them. Add ThemeToggle to main layout.

**Tech Stack:** React, Next.js App Router, Tailwind CSS with custom DESIGN.md tokens (coral, blush, sand), Vitest for unit tests

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| Create | `src/components/ProfileSection.tsx` | Card wrapper with title + pencil icon + surface prop |
| Create | `src/components/ProfileField.tsx` | Label/value pair for read mode |
| Create | `src/components/ChipList.tsx` | Tag chips with pill radius, dark mode, variant prop |
| Create | `src/components/ThemeToggle.tsx` | Sticky dark/light mode toggle button |
| Modify | `src/components/ProfileCompleteness.tsx` | Add dark mode, blush surface |
| Modify | `src/components/TagButton.tsx` | Add dark mode variants |
| Rewrite | `src/app/(main)/profile/page.tsx` | Use extracted components, full dark mode, surface hierarchy |
| Modify | `src/app/(main)/layout.tsx` | Add ThemeToggle |
| Create | `tests/unit/ProfileSection.test.tsx` | Tests for ProfileSection |
| Create | `tests/unit/ChipList.test.tsx` | Tests for ChipList |
| Create | `tests/unit/ThemeToggle.test.tsx` | Tests for ThemeToggle |

---

### Task 1: Create ProfileSection component

**Files:**
- Create: `src/components/ProfileSection.tsx`
- Create: `tests/unit/ProfileSection.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/ProfileSection.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileSection from '@/components/ProfileSection';

describe('ProfileSection', () => {
  it('renders title and children', () => {
    render(
      <ProfileSection title="Identité">
        <p>Contenu</p>
      </ProfileSection>
    );
    expect(screen.getByText('Identité')).toBeInTheDocument();
    expect(screen.getByText('Contenu')).toBeInTheDocument();
  });

  it('shows pencil icon when onEdit provided and not editing', () => {
    render(
      <ProfileSection title="Bio" onEdit={() => {}} editing={false}>
        <p>Contenu</p>
      </ProfileSection>
    );
    const btn = screen.getByLabelText('Modifier Bio');
    expect(btn).toBeInTheDocument();
  });

  it('hides pencil icon when editing', () => {
    render(
      <ProfileSection title="Bio" onEdit={() => {}} editing={true}>
        <p>Contenu</p>
      </ProfileSection>
    );
    expect(screen.queryByLabelText('Modifier Bio')).not.toBeInTheDocument();
  });

  it('hides pencil when no onEdit', () => {
    render(
      <ProfileSection title="Bio">
        <p>Contenu</p>
      </ProfileSection>
    );
    expect(screen.queryByLabelText(/Modifier/)).not.toBeInTheDocument();
  });

  it('applies blush surface class', () => {
    const { container } = render(
      <ProfileSection title="Bio" surface="blush">
        <p>Contenu</p>
      </ProfileSection>
    );
    expect(container.firstChild).toHaveClass('bg-blush');
  });

  it('applies sand surface class', () => {
    const { container } = render(
      <ProfileSection title="Pratiques" surface="sand">
        <p>Contenu</p>
      </ProfileSection>
    );
    expect(container.firstChild).toHaveClass('bg-sand');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ProfileSection.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write ProfileSection implementation**

```tsx
// src/components/ProfileSection.tsx
interface ProfileSectionProps {
  title: string;
  onEdit?: () => void;
  editing?: boolean;
  surface?: 'white' | 'blush' | 'sand';
  children: React.ReactNode;
}

const surfaceClasses: Record<string, string> = {
  white: 'bg-white dark:bg-gray-800',
  blush: 'bg-blush dark:bg-coral/10',
  sand: 'bg-sand dark:bg-coral-dark/20',
};

export default function ProfileSection({ title, onEdit, editing, surface = 'white', children }: ProfileSectionProps) {
  return (
    <section className={`rounded-xl border border-gray-200 p-4 sm:p-5 ${surfaceClasses[surface]} dark:border-gray-700`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {onEdit && !editing && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Modifier ${title}`}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-blush dark:hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gray-400 hover:text-coral">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ProfileSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfileSection.tsx tests/unit/ProfileSection.test.tsx
git commit -m "feat: add ProfileSection component with surface prop and pencil icon"
```

---

### Task 2: Create ProfileField component

**Files:**
- Create: `src/components/ProfileField.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/ProfileField.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileField from '@/components/ProfileField';

describe('ProfileField', () => {
  it('renders label and value', () => {
    render(<ProfileField label="Âge">28 ans</ProfileField>);
    expect(screen.getByText('Âge')).toBeInTheDocument();
    expect(screen.getByText('28 ans')).toBeInTheDocument();
  });

  it('shows Non renseigné when empty is true and no children value', () => {
    render(<ProfileField label="Genre" empty />);
    expect(screen.getByText('Non renseigné')).toBeInTheDocument();
  });

  it('renders children value even when empty is true', () => {
    render(<ProfileField label="Genre" empty>Féminin</ProfileField>);
    expect(screen.getByText('Féminin')).toBeInTheDocument();
    expect(screen.queryByText('Non renseigné')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ProfileField.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write ProfileField implementation**

```tsx
// src/components/ProfileField.tsx
interface ProfileFieldProps {
  label: string;
  children?: React.ReactNode;
  empty?: boolean;
}

export default function ProfileField({ label, children, empty }: ProfileFieldProps) {
  const hasValue = children !== undefined && children !== null && children !== '';
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100">
        {hasValue ? children : <span className="italic text-gray-600 dark:text-gray-400">Non renseigné</span>}
      </dd>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ProfileField.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfileField.tsx tests/unit/ProfileField.test.tsx
git commit -m "feat: add ProfileField component for label/value pairs"
```

---

### Task 3: Create ChipList component (extracted + improved)

**Files:**
- Create: `src/components/ChipList.tsx`
- Create: `tests/unit/ChipList.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/ChipList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChipList from '@/components/ChipList';

describe('ChipList', () => {
  it('renders items as chips', () => {
    render(<ChipList items={['bi', 'pan']} />);
    expect(screen.getByText('bi')).toBeInTheDocument();
    expect(screen.getByText('pan')).toBeInTheDocument();
  });

  it('shows Non renseigné when empty', () => {
    render(<ChipList items={[]} />);
    expect(screen.getByText('Non renseigné')).toBeInTheDocument();
  });

  it('renders with variant practices', () => {
    const { container } = render(<ChipList items={['bdsm']} variant="practices" />);
    const chip = container.querySelector('span');
    expect(chip?.className).toContain('bg-sand');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ChipList.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write ChipList implementation**

```tsx
// src/components/ChipList.tsx
interface ChipListProps {
  items: string[];
  variant?: 'default' | 'practices';
}

export default function ChipList({ items, variant = 'default' }: ChipListProps) {
  if (items.length === 0) {
    return <span className="text-xs italic text-gray-600 dark:text-gray-400">Non renseigné</span>;
  }

  const chipClass =
    variant === 'practices'
      ? 'bg-sand/60 text-coral-dark dark:bg-coral/20 dark:text-coral-light'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${chipClass}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ChipList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ChipList.tsx tests/unit/ChipList.test.tsx
git commit -m "feat: add ChipList component with pill radius, dark mode, practices variant"
```

---

### Task 4: Create ThemeToggle component

**Files:**
- Create: `src/components/ThemeToggle.tsx`
- Create: `tests/unit/ThemeToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/ThemeToggle.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '@/components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('libre-theme');
  });

  it('renders a toggle button', () => {
    render(<ThemeToggle />);
    expect(screen.getByLabelText(/Changer le thème/)).toBeInTheDocument();
  });

  it('toggles dark class on html element', () => {
    render(<ThemeToggle />);
    const btn = screen.getByLabelText(/Changer le thème/);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists theme in localStorage', () => {
    render(<ThemeToggle />);
    const btn = screen.getByLabelText(/Changer le thème/);
    fireEvent.click(btn);
    expect(localStorage.getItem('libre-theme')).toBe('dark');
    fireEvent.click(btn);
    expect(localStorage.getItem('libre-theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ThemeToggle.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write ThemeToggle implementation**

```tsx
// src/components/ThemeToggle.tsx
'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('libre-theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('libre-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('libre-theme', 'light');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer le thème"
      className="fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
    >
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gray-300">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gray-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ThemeToggle.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeToggle.tsx tests/unit/ThemeToggle.test.tsx
git commit -m "feat: add ThemeToggle component — sticky dark/light mode switch"
```

---

### Task 5: Update ProfileCompleteness dark mode

**Files:**
- Modify: `src/components/ProfileCompleteness.tsx`

- [ ] **Step 1: Update ProfileCompleteness with dark mode and blush surface**

Replace the full component with:

```tsx
// src/components/ProfileCompleteness.tsx
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
      <div className="mb-6 rounded-xl border border-gray-200 bg-blush p-4 dark:border-gray-700 dark:bg-coral/10">
        <p className="text-sm text-gray-700 dark:text-gray-300">Commencez par remplir votre profil</p>
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
    <div className="mb-6 rounded-xl border border-gray-200 bg-blush p-4 dark:border-gray-700 dark:bg-coral/10">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Profil complété à {pct}%
        </p>
        <span className="text-xs text-gray-600 dark:text-gray-400">{filled.length}/{CHECKS.length}</span>
      </div>
      <div className="mb-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-1.5 rounded-full bg-coral transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextMissing && pct < 100 && (
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Ajoutez {nextMissing.label}
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
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no regressions**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ProfileCompleteness.tsx
git commit -m "fix: ProfileCompleteness dark mode + blush surface + rounded-xl"
```

---

### Task 6: Update TagButton dark mode

**Files:**
- Modify: `src/components/TagButton.tsx`

- [ ] **Step 1: Update TagButton with dark mode variants**

Replace full component:

```tsx
// src/components/TagButton.tsx
interface TagButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function TagButton({ label, selected, onClick }: TagButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-1 ${
        selected
          ? 'border-coral bg-coral text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-gray-500'
      }`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TagButton.tsx
git commit -m "fix: TagButton dark mode + coral selected state"
```

---

### Task 7: Rewrite profile page using extracted components

**Files:**
- Rewrite: `src/app/(main)/profile/page.tsx`

This is the largest task. The page uses ProfileSection, ProfileField, ChipList, and applies the full surface hierarchy + dark mode + coral inputs + pencil icon from ProfileSection.

- [ ] **Step 1: Rewrite the profile page**

Replace the entire file. Key changes from current:
- Remove inline `SectionHeader`, `EditActions`, `ChipList` — use extracted components
- All sections use `<ProfileSection>` with correct `surface` prop
- Read fields use `<ProfileField>`
- Chip lists use `<ChipList>`
- All inputs get unified class: `border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500`
- All `text-gray-600`/`text-gray-700` on content get `dark:` variants
- Error/success/amber banners get `dark:` variants
- Practices section: `surface="sand"` + `border-coral/20`
- Danger zone: `bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`
- Privacy tips: `dark:` variants
- Page title: `text-gray-900 dark:text-gray-100`
- Delete button zone gets proper `dark:` variants

The full rewritten file:

```tsx
// src/app/(main)/profile/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import TagButton from '@/components/TagButton';
import TagSelector from '@/components/TagSelector';
import PrivacyTip from '@/components/PrivacyTip';
import ProfileCompleteness from '@/components/ProfileCompleteness';
import ProfileSection from '@/components/ProfileSection';
import ProfileField from '@/components/ProfileField';
import ChipList from '@/components/ChipList';
import { INTEREST_CATEGORIES, PRACTICE_CATEGORIES, GENDER_OPTIONS } from '@/lib/taxonomy';

interface ProfileData {
  userId: string;
  bio: string;
  birthDate: string;
  genderIdentity: string;
  orientation: string[];
  relationshipType: string[];
  interests: string[];
  practices: string[];
  socialLinks: Record<string, string>;
  photos: string[];
  maxDistanceKm: number;
  ageMin: number;
  ageMax: number;
  invisibleMode: boolean;
}

const ORIENTATION_OPTIONS = ['hétéro', 'homo', 'bi', 'pan', 'ace', 'autre'];
const RELATIONSHIP_TYPE_OPTIONS = ['libre', 'poly', 'casual', 'sérieux', 'autre'];
const SOCIAL_PLATFORMS = ['Instagram', 'Snapchat', 'TikTok', 'Twitter', 'Telegram', 'Discord'];

const INPUT_CLASS = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500';

const INPUT_CLASS_SM = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500';

function EditActions({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-full bg-coral px-4 py-1.5 text-xs font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      >
        Annuler
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editBio, setEditBio] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGenderIdentity, setEditGenderIdentity] = useState('');
  const [editOrientation, setEditOrientation] = useState<string[]>([]);
  const [editRelationshipType, setEditRelationshipType] = useState<string[]>([]);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editPractices, setEditPractices] = useState<string[]>([]);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPhotoInput, setEditPhotoInput] = useState('');
  const [editAgeMin, setEditAgeMin] = useState(18);
  const [editAgeMax, setEditAgeMax] = useState(99);
  const [editMaxDistanceKm, setEditMaxDistanceKm] = useState(50);
  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>({});
  const [editSocialPlatform, setEditSocialPlatform] = useState('Instagram');
  const [editSocialUrl, setEditSocialUrl] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/profile');
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch {
      setError('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const startEdit = (section: string) => {
    setEditingSection(section);
    if (section === 'identity') {
      setEditBirthDate(profile?.birthDate ? profile.birthDate.split('T')[0] : '');
      setEditGenderIdentity(profile?.genderIdentity ?? '');
    }
    if (section === 'bio') setEditBio(profile?.bio ?? '');
    if (section === 'orientation') {
      setEditOrientation(profile?.orientation ?? []);
      setEditRelationshipType(profile?.relationshipType ?? []);
    }
    if (section === 'interests') setEditInterests(profile?.interests ?? []);
    if (section === 'practices') setEditPractices(profile?.practices ?? []);
    if (section === 'photos') setEditPhotos(profile?.photos ?? []);
    if (section === 'search') {
      setEditAgeMin(profile?.ageMin ?? 18);
      setEditAgeMax(profile?.ageMax ?? 99);
      setEditMaxDistanceKm(profile?.maxDistanceKm ?? 50);
    }
    if (section === 'social') setEditSocialLinks(profile?.socialLinks ?? {});
  };

  const saveSection = async (data: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Erreur');
      }
      const result = await res.json();
      setProfile(result.profile);
      setEditingSection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await signOut({ redirect: false });
      router.push('/');
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-600 dark:text-gray-400">Chargement...</p></div>;
  }

  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profil</h1>
        <button
          type="button"
          onClick={() => { signOut({ redirect: false }); router.push('/login'); }}
          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          Déconnexion
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {profile && (
        <ProfileCompleteness
          profile={profile as unknown as Record<string, unknown>}
          onSuggestionClick={startEdit}
        />
      )}

      {!profile ? (
        <div className="space-y-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">Remplissez votre profil pour commencer à rencontrer des personnes.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">C&apos;est optionnel — vous pouvez toujours compléter plus tard.</p>
          {['identity', 'bio', 'orientation', 'interests', 'practices', 'photos', 'search', 'social'].map((s) => (
            <button key={s} onClick={() => startEdit(s)} className="text-sm text-coral underline hover:text-terracotta">
              Commencer par {s === 'identity' ? 'votre identité' : s === 'bio' ? 'votre bio' : s === 'orientation' ? 'votre orientation' : s === 'interests' ? 'vos centres d\'intérêt' : s === 'practices' ? 'vos pratiques' : s === 'photos' ? 'vos photos' : s === 'search' ? 'vos préférences de recherche' : 'vos liens sociaux'}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ─── Identité ─────────────────────────────────────────── */}
          <ProfileSection title="Identité" onEdit={() => startEdit('identity')} editing={editingSection === 'identity'}>
            <PrivacyTip tip="Utilisez un pseudo, pas votre vrai nom. Seul votre âge sera visible, pas votre date de naissance." />
            {editingSection === 'identity' ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Date de naissance</label>
                  <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Genre</label>
                  <select value={editGenderIdentity} onChange={(e) => setEditGenderIdentity(e.target.value)} className={INPUT_CLASS}>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ birthDate: editBirthDate ? new Date(editBirthDate).toISOString() : undefined, genderIdentity: editGenderIdentity || undefined })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <ProfileField label="Âge">{age ? `${age} ans` : ''}</ProfileField>
                <ProfileField label="Genre">{GENDER_OPTIONS.find(g => g.value === profile.genderIdentity)?.label || profile.genderIdentity}</ProfileField>
              </div>
            )}
          </ProfileSection>

          {/* ─── Bio ──────────────────────────────────────────────── */}
          <ProfileSection title="Bio" surface="blush" onEdit={() => startEdit('bio')} editing={editingSection === 'bio'}>
            {editingSection === 'bio' ? (
              <div className="mt-3 space-y-3">
                <textarea rows={3} maxLength={500} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Parlez un peu de vous..." className={INPUT_CLASS} />
                <p className="text-xs text-gray-600 dark:text-gray-400">{editBio.length}/500</p>
                <EditActions saving={saving} onSave={() => saveSection({ bio: editBio })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{profile.bio || <span className="italic text-gray-600 dark:text-gray-400">Non renseigné</span>}</p>
            )}
          </ProfileSection>

          {/* ─── Orientation & Relations ──────────────────────────── */}
          <ProfileSection title="Orientation & Relations" onEdit={() => startEdit('orientation')} editing={editingSection === 'orientation'}>
            {editingSection === 'orientation' ? (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Orientation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ORIENTATION_OPTIONS.map((opt) => (
                      <TagButton key={opt} label={opt} selected={editOrientation.includes(opt)} onClick={() => setEditOrientation(editOrientation.includes(opt) ? editOrientation.filter((o) => o !== opt) : [...editOrientation, opt])} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Type de relation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
                      <TagButton key={opt} label={opt} selected={editRelationshipType.includes(opt)} onClick={() => setEditRelationshipType(editRelationshipType.includes(opt) ? editRelationshipType.filter((r) => r !== opt) : [...editRelationshipType, opt])} />
                    ))}
                  </div>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ orientation: editOrientation, relationshipType: editRelationshipType })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">Orientation</p>
                  <ChipList items={profile.orientation} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">Type de relation</p>
                  <ChipList items={profile.relationshipType} />
                </div>
              </div>
            )}
          </ProfileSection>

          {/* ─── Centres d'intérêt ────────────────────────────────── */}
          <ProfileSection title="Centres d'intérêt" onEdit={() => startEdit('interests')} editing={editingSection === 'interests'}>
            <PrivacyTip tip="Ces centres d&apos;intérêt aident à trouver des personnes qui partagent vos passions." />
            {editingSection === 'interests' ? (
              <div className="mt-3 space-y-3">
                <TagSelector categories={INTEREST_CATEGORIES} selected={editInterests} onChange={setEditInterests} placeholder="Ajouter un centre d&apos;intérêt..." />
                <EditActions saving={saving} onSave={() => saveSection({ interests: editInterests })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2"><ChipList items={profile.interests} /></div>
            )}
          </ProfileSection>

          {/* ─── Pratiques & Préférences ──────────────────────────── */}
          <ProfileSection title="Pratiques & Préférences" surface="sand" onEdit={() => startEdit('practices')} editing={editingSection === 'practices'}>
            <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
              Certaines personnes aiment explorer des pratiques sensuelles ou spécifiques. C&apos;est totalement optionnel.
            </p>
            <PrivacyTip tip="Ces préférences sont privées. Elles ne s&apos;affichent que pour vos matches, pas publiquement." />
            {editingSection === 'practices' ? (
              <div className="mt-3 space-y-3">
                <TagSelector categories={PRACTICE_CATEGORIES} selected={editPractices} onChange={setEditPractices} placeholder="Ajouter une pratique..." />
                <EditActions saving={saving} onSave={() => saveSection({ practices: editPractices })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2"><ChipList items={profile.practices} variant="practices" /></div>
            )}
          </ProfileSection>

          {/* ─── Photos ───────────────────────────────────────────── */}
          <ProfileSection title="Photos" onEdit={() => startEdit('photos')} editing={editingSection === 'photos'}>
            <PrivacyTip tip="Évitez les photos avec des détails identifiables (lieux, plaques, etc.)." />
            {editingSection === 'photos' ? (
              <div className="mt-3 space-y-3">
                {editPhotos.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={url} onChange={(e) => { const p = [...editPhotos]; p[i] = e.target.value; setEditPhotos(p); }} className={INPUT_CLASS_SM} />
                    <button type="button" onClick={() => setEditPhotos(editPhotos.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">✕</button>
                  </div>
                ))}
                {editPhotos.length < 6 && (
                  <div className="flex gap-2">
                    <input type="url" value={editPhotoInput} onChange={(e) => setEditPhotoInput(e.target.value)} placeholder="https://..." className={INPUT_CLASS_SM} />
                    <button type="button" onClick={() => { if (editPhotoInput.trim()) { setEditPhotos([...editPhotos, editPhotoInput.trim()]); setEditPhotoInput(''); } }} disabled={!editPhotoInput.trim()} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Ajouter</button>
                  </div>
                )}
                <EditActions saving={saving} onSave={() => saveSection({ photos: editPhotos })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {profile.photos.length > 0 ? profile.photos.map((url, i) => (
                  <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                )) : <span className="text-xs italic text-gray-600 dark:text-gray-400">Non renseigné</span>}
              </div>
            )}
          </ProfileSection>

          {/* ─── Préférences de recherche ─────────────────────────── */}
          <ProfileSection title="Préférences de recherche" surface="blush" onEdit={() => startEdit('search')} editing={editingSection === 'search'}>
            {editingSection === 'search' ? (
              <div className="mt-3 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Âge minimum : {editAgeMin} ans</label>
                  <input type="range" min={18} max={99} value={editAgeMin} onChange={(e) => setEditAgeMin(Number(e.target.value))} className="block w-full accent-coral" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Âge maximum : {editAgeMax} ans</label>
                  <input type="range" min={18} max={99} value={editAgeMax} onChange={(e) => setEditAgeMax(Number(e.target.value))} className="block w-full accent-coral" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Distance maximale : {editMaxDistanceKm} km</label>
                  <input type="range" min={1} max={500} value={editMaxDistanceKm} onChange={(e) => setEditMaxDistanceKm(Number(e.target.value))} className="block w-full accent-coral" />
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ ageMin: editAgeMin, ageMax: editAgeMax, maxDistanceKm: editMaxDistanceKm })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <ProfileField label="Tranche d'âge">{profile.ageMin} – {profile.ageMax} ans</ProfileField>
                <ProfileField label="Distance max">{profile.maxDistanceKm} km</ProfileField>
              </div>
            )}
          </ProfileSection>

          {/* ─── Liens sociaux ────────────────────────────────────── */}
          <ProfileSection title="Liens sociaux" onEdit={() => startEdit('social')} editing={editingSection === 'social'}>
            <PrivacyTip tip="Ne les partagez qu&apos;avec des personnes de confiance." />
            {editingSection === 'social' ? (
              <div className="mt-3 space-y-3">
                {Object.entries(editSocialLinks).map(([platform, url]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">{platform}</span>
                    <input type="url" value={url} onChange={(e) => setEditSocialLinks({ ...editSocialLinks, [platform]: e.target.value })} className={INPUT_CLASS_SM} />
                    <button type="button" onClick={() => { const c = { ...editSocialLinks }; delete c[platform]; setEditSocialLinks(c); }} className="text-xs text-red-500 dark:text-red-400">✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <select value={editSocialPlatform} onChange={(e) => setEditSocialPlatform(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                    {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="url" value={editSocialUrl} onChange={(e) => setEditSocialUrl(e.target.value)} placeholder="https://..." className={INPUT_CLASS_SM} />
                  <button type="button" onClick={() => { if (editSocialUrl.trim()) { setEditSocialLinks({ ...editSocialLinks, [editSocialPlatform]: editSocialUrl.trim() }); setEditSocialUrl(''); } }} disabled={!editSocialUrl.trim()} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">+</button>
                </div>
                <EditActions saving={saving} onSave={() => saveSection({ socialLinks: editSocialLinks })} onCancel={() => setEditingSection(null)} />
              </div>
            ) : (
              <div className="mt-2">
                {Object.keys(profile.socialLinks || {}).length > 0
                  ? <ChipList items={Object.keys(profile.socialLinks)} />
                  : <span className="text-xs italic text-gray-600 dark:text-gray-400">Non renseigné</span>}
              </div>
            )}
          </ProfileSection>

          {/* ─── Conseils vie privée ──────────────────────────────── */}
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Conseils vie privée</h2>
            <ul className="mt-3 space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <li className="flex gap-2"><span aria-hidden="true">•</span>N&apos;utilisez jamais votre vrai nom complet comme pseudo.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Ne faites pas confiance aveuglément à quelqu&apos;un en ligne, même sur Libre.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Ne partagez pas d&apos;informations sensibles (adresse, lieu de travail) dans votre bio.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Vos messages sont chiffrés de bout en bout, mais Libre ne peut pas garantir la bonne foi de votre interlocuteur.</li>
              <li className="flex gap-2"><span aria-hidden="true">•</span>Signalez tout comportement suspect. La modération communautaire est là pour ça.</li>
            </ul>
          </section>

          {/* ─── Zone dangereuse ─────────────────────────────────── */}
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 sm:p-5">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Zone dangereuse</h2>
            <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">La suppression de votre compte est définitive. Toutes vos données seront effacées.</p>
            {!showDeleteConfirm ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30">Supprimer mon compte</button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Etes-vous sûr ? Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDeleteAccount} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Oui, supprimer</button>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Annuler</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the build to verify**

Run: `npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/profile/page.tsx
git commit -m "feat: redesign profile page — extracted components, dark mode, surface hierarchy, coral focus"
```

---

### Task 8: Add ThemeToggle to main layout

**Files:**
- Modify: `src/app/(main)/layout.tsx`

- [ ] **Step 1: Add ThemeToggle import and render**

Add import at top of file:
```tsx
import ThemeToggle from '@/components/ThemeToggle';
```

Add `<ThemeToggle />` just before the closing `</div>` of the root element, after `<FeedbackButton />`:
```tsx
      <FeedbackButton />
      <ThemeToggle />
    </div>
```

- [ ] **Step 2: Run build to verify**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/layout.tsx
git commit -m "feat: add ThemeToggle to main layout"
```

---

### Task 9: Deploy and verify

- [ ] **Step 1: Deploy to production**

Run: `vercel --prod`
Expected: Build succeeds, deployment ready at www.getlibre.fr

- [ ] **Step 2: Verify profile page renders correctly**

Check: `/profile` — sections render, pencil icons visible, dark mode toggle works, surface hierarchy visible

- [ ] **Step 3: Verify dark mode toggle**

Click the moon/sun icon — page switches between light and dark, preference persists on reload

- [ ] **Step 4: Commit final state if any fixes needed**

```bash
git add -A && git commit -m "fix: profile redesign post-deploy fixes"
```

---

## Self-Review

**Spec coverage check:**
- ProfileSection (surface, pencil, dark mode) → Task 1
- ProfileField (label/value, empty) → Task 2
- ChipList (pill, dark, practices variant) → Task 3
- ThemeToggle (sticky, localStorage, dark class) → Task 4
- ProfileCompleteness (blush, dark mode) → Task 5
- TagButton (dark mode, coral selected) → Task 6
- Profile page rewrite (all surfaces, inputs, dark mode) → Task 7
- ThemeToggle in layout → Task 8
- Deploy + verify → Task 9

**Placeholder scan:** No TBDs, no TODOs, all steps have code.

**Type consistency:** `ProfileSection` surface prop is `'white' | 'blush' | 'sand'` — matches usage in Task 7. `ChipList` variant is `'default' | 'practices'` — matches usage. `INPUT_CLASS` and `INPUT_CLASS_SM` defined as constants in profile page — used consistently.

No gaps found.