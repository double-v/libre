/**
 * Tests a11y — page /settings/trust (Cercle de Confiance).
 * Issue #61 (chantier-01, tâche 4.3 — audit a11y).
 *
 * Verrouille les correctifs d'accessibilité :
 *  - onglets : sémantique tab/tabpanel liée + navigation clavier (flèches, roving tabindex)
 *  - bottom-sheet d'ajout : ESC ferme + focus restauré sur le déclencheur
 *  - dialog nommé par son titre (aria-labelledby)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrustSettingsPage from '../page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

function jsonRes(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe('<TrustSettingsPage /> — a11y', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn((url: string) => {
      if (url === '/api/trust/level')
        return jsonRes({ band: 'member', score: 20, factors: [] });
      if (url === '/api/circle/contacts') return jsonRes({ contacts: [] });
      if (url === '/api/matches') return jsonRes({ matches: [] });
      return jsonRes({});
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function renderLoaded() {
    render(<TrustSettingsPage />);
    await waitFor(() =>
      expect(
        screen.getByRole('tab', { name: 'Mon Cercle' }),
      ).toBeInTheDocument(),
    );
  }

  it('les onglets exposent la sémantique tab + tabpanel liée', async () => {
    await renderLoaded();
    const cercleTab = screen.getByRole('tab', { name: 'Mon Cercle' });
    const panel = screen.getByRole('tabpanel');
    expect(cercleTab).toHaveAttribute('aria-selected', 'true');
    expect(cercleTab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', cercleTab.id);
  });

  it('navigation clavier : flèche droite change d’onglet (roving tabindex)', async () => {
    await renderLoaded();
    const cercleTab = screen.getByRole('tab', { name: 'Mon Cercle' });
    const niveauTab = screen.getByRole('tab', { name: 'Mon niveau' });
    expect(cercleTab).toHaveAttribute('tabindex', '0');
    expect(niveauTab).toHaveAttribute('tabindex', '-1');

    cercleTab.focus();
    fireEvent.keyDown(cercleTab, { key: 'ArrowRight' });

    await waitFor(() =>
      expect(niveauTab).toHaveAttribute('aria-selected', 'true'),
    );
    expect(niveauTab).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(niveauTab);
  });

  it('bottom-sheet d’ajout : ESC ferme et restaure le focus sur le déclencheur', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const trigger = screen.getByRole('button', { name: /Ajouter un contact/i });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog');
    // le dialog est nommé par son titre (aria-labelledby, pas juste aria-label)
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toMatch(
      /Ajouter un contact/i,
    );

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(document.activeElement).toBe(trigger);
  });
});
