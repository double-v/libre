/**
 * Tests — ReportUserModal (#322).
 *
 * Les endpoints `/api/moderation/report` et `/api/blocks` existaient sans
 * aucun appelant : personne ne pouvait signaler ni bloquer un profil, alors
 * que les CGU promettent les deux. Ces tests verrouillent le contrat d'appel
 * (payload envoyé, endpoint visé) et le traitement humain des erreurs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportUserModal from '../ReportUserModal';

const toastSpy = vi.fn();
vi.mock('@/lib/toast', () => ({
  __esModule: true,
  toast: (...args: unknown[]) => toastSpy(...args),
}));

function mockFetch(status: number, body: unknown = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(props: Partial<React.ComponentProps<typeof ReportUserModal>> = {}) {
  const onClose = vi.fn();
  const onBlocked = vi.fn();
  render(
    <ReportUserModal
      userId="11111111-1111-4111-8111-111111111111"
      displayName="Camille"
      onClose={onClose}
      onBlocked={onBlocked}
      {...props}
    />,
  );
  return { onClose, onBlocked, user: userEvent.setup() };
}

describe('<ReportUserModal /> — signalement', () => {
  it('poste le motif et la description sur /api/moderation/report', async () => {
    const fetchMock = mockFetch(201, { report: { id: 'r-1' } });
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /Signaler ce profil/i }));
    await user.click(screen.getByRole('button', { name: 'Harcèlement ou intimidation' }));
    await user.type(screen.getByLabelText(/Précisions/i), 'messages insistants');
    await user.click(screen.getByRole('button', { name: 'Signaler' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/moderation/report');
    expect(JSON.parse(init.body)).toEqual({
      reportedId: '11111111-1111-4111-8111-111111111111',
      reason: 'harassment',
      description: 'messages insistants',
    });
  });

  it('ne promet aucun délai dans la confirmation', async () => {
    mockFetch(201);
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /Signaler ce profil/i }));
    await user.click(screen.getByRole('button', { name: 'Spam ou arnaque' }));
    await user.click(screen.getByRole('button', { name: 'Signaler' }));

    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    expect(toastSpy.mock.calls[0][0]).toMatch(/humain/i);
    expect(toastSpy.mock.calls[0][0]).not.toMatch(/\d+\s*(h|heure|jour|min)/i);
  });

  it('ne peut pas envoyer sans motif', async () => {
    const fetchMock = mockFetch(201);
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /Signaler ce profil/i }));
    expect(screen.getByRole('button', { name: 'Signaler' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('traduit le rate-limit en langage humain, pas en code brut', async () => {
    mockFetch(429, { error: 'rate_limited' });
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /Signaler ce profil/i }));
    await user.click(screen.getByRole('button', { name: 'Faux profil' }));
    await user.click(screen.getByRole('button', { name: 'Signaler' }));

    const msg = await screen.findByText(/plusieurs signalements récemment/i);
    expect(msg).toBeInTheDocument();
    expect(screen.queryByText(/rate_limited/)).not.toBeInTheDocument();
  });

  it('propose le blocage après un signalement, sans l\'imposer', async () => {
    mockFetch(201);
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /Signaler ce profil/i }));
    await user.click(screen.getByRole('button', { name: 'Autre' }));
    await user.click(screen.getByRole('button', { name: 'Signaler' }));

    expect(await screen.findByRole('button', { name: /Bloquer aussi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Non, merci/i })).toBeInTheDocument();
  });
});

describe('<ReportUserModal /> — blocage', () => {
  it('annonce la perte de la conversation avant de bloquer', async () => {
    mockFetch(201);
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^Bloquer/ }));

    expect(screen.getByText(/conversation sera supprimée/i)).toBeInTheDocument();
  });

  it('poste sur /api/blocks et prévient l\'appelant', async () => {
    const fetchMock = mockFetch(201, { blocked: true });
    const { onClose, onBlocked, user } = setup();

    await user.click(screen.getByRole('button', { name: /^Bloquer/ }));
    await user.click(screen.getByRole('button', { name: 'Bloquer' }));

    await waitFor(() => expect(onBlocked).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/blocks');
    expect(JSON.parse(init.body)).toEqual({
      blockedId: '11111111-1111-4111-8111-111111111111',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('explique un blocage déjà existant (409) sans jargon', async () => {
    mockFetch(409, { error: 'Already blocked' });
    const { onBlocked, user } = setup();

    await user.click(screen.getByRole('button', { name: /^Bloquer/ }));
    await user.click(screen.getByRole('button', { name: 'Bloquer' }));

    expect(await screen.findByText(/déjà bloquée/i)).toBeInTheDocument();
    expect(onBlocked).not.toHaveBeenCalled();
  });
});

describe('<ReportUserModal /> — accessibilité', () => {
  it('est un dialogue modal étiqueté', () => {
    mockFetch(201);
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'report-user-modal-title');
  });

  it('ferme sur Échap', async () => {
    mockFetch(201);
    const { onClose, user } = setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
