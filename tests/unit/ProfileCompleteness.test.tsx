import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileCompleteness from '@/components/ProfileCompleteness';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    bio: '',
    birthDate: null,
    genderIdentity: '',
    orientation: [],
    interests: [],
    photos: [],
    ...overrides,
  } as Record<string, unknown>;
}

describe('ProfileCompleteness — engaging copy', () => {
  it('shows a low-progress message when profile is mostly empty (1/6 filled)', () => {
    render(
      <ProfileCompleteness
        profile={makeProfile({ bio: 'salut' })}
        onSuggestionClick={vi.fn()}
      />
    );
    // Engaging opener instead of the dry "Ajoutez une bio"
    expect(screen.getByText(/timide|vide|racontez/i)).toBeInTheDocument();
    // The "Ajoutez X" + "ici" hint stays as a helper, just framed warmly
    expect(screen.getByText(/Ajoutez/)).toBeInTheDocument();
  });

  it('shows a mid-progress message when profile is half-filled (3-5/6)', () => {
    render(
      <ProfileCompleteness
        profile={makeProfile({
          bio: 'salut',
          birthDate: '1995-01-01T00:00:00.000Z',
          genderIdentity: 'female',
          orientation: ['bi'],
        })}
        onSuggestionClick={vi.fn()}
      />
    );
    expect(screen.getByText(/plus que|encore|qu'/i)).toBeInTheDocument();
  });

  it('shows a celebratory message at 100% (no "ajoutez" prompt)', () => {
    render(
      <ProfileCompleteness
        profile={makeProfile({
          bio: 'salut',
          birthDate: '1995-01-01T00:00:00.000Z',
          genderIdentity: 'female',
          orientation: ['bi'],
          interests: ['cinema'],
          photos: ['photo1.jpg'],
        })}
        onSuggestionClick={vi.fn()}
      />
    );
    // Celebration: contains "complet" or a checkmark/emoji, no suggestion
    expect(screen.getByText(/complet|bravo|✨|✓|🎉/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Ajoutez /)).not.toBeInTheDocument();
    expect(screen.queryByText(/ ici$/)).not.toBeInTheDocument();
  });

  it('uses role="status" for accessibility', () => {
    const { container } = render(
      <ProfileCompleteness
        profile={makeProfile({ bio: 'salut' })}
        onSuggestionClick={vi.fn()}
      />
    );
    const status = container.querySelector('[role="status"]');
    expect(status).toBeInTheDocument();
  });

  it('uses aria-live="polite" so changes are announced', () => {
    const { container } = render(
      <ProfileCompleteness
        profile={makeProfile({ bio: 'salut' })}
        onSuggestionClick={vi.fn()}
      />
    );
    const status = container.querySelector('[role="status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });
});
