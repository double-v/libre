/**
 * #418 — les trois interrupteurs côté admin.
 * Chargés au montage, écrits d'un clic, effet immédiat (état optimiste
 * confirmé par la réponse), et retour en arrière visible si le serveur refuse.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeatureSwitches from '../FeatureSwitches';

let puts: Record<string, boolean>[];

function stubFetch(initial: Record<string, boolean>, putStatus = 200) {
  puts = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const json = (body: unknown, status = 200) => Promise.resolve({ ok: status < 300, status, json: async () => body } as Response);
      if (url === '/api/admin/features' && init?.method === 'PUT') {
        const body = JSON.parse(init.body as string);
        puts.push(body);
        return json(putStatus === 200 ? body : { error: 'x' }, putStatus);
      }
      if (url === '/api/admin/features') return json(initial);
      return json({}, 404);
    }),
  );
}

beforeEach(() => vi.clearAllMocks());

describe('FeatureSwitches', () => {
  it('montre les trois interrupteurs avec l’état du serveur', async () => {
    stubFetch({ checkin: true, crossings: false, square: true });
    render(<FeatureSwitches />);
    const croisements = await screen.findByRole('switch', { name: /croisements/i });
    await waitFor(() => expect(croisements).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByRole('switch', { name: /check-in/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /la place/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('un clic coupe la fonctionnalité et envoie les trois booléens', async () => {
    stubFetch({ checkin: true, crossings: true, square: true });
    const user = userEvent.setup();
    render(<FeatureSwitches />);
    const place = await screen.findByRole('switch', { name: /la place/i });
    await user.click(place);
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toEqual({ checkin: true, crossings: true, square: false });
    expect(place).toHaveAttribute('aria-checked', 'false');
  });

  it('si le serveur refuse, l’interrupteur revient et le dit', async () => {
    stubFetch({ checkin: true, crossings: true, square: true }, 500);
    const user = userEvent.setup();
    render(<FeatureSwitches />);
    const checkin = await screen.findByRole('switch', { name: /check-in/i });
    await user.click(checkin);
    expect(await screen.findByRole('alert')).toHaveTextContent(/impossible/i);
    expect(checkin).toHaveAttribute('aria-checked', 'true');
  });
});
