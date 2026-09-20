/**
 * #340 — « Clé de messagerie » dans Paramètres.
 *
 * La section dit l'état de la clé (au coffre / perdue / aucune / panne) et
 * ouvre la seule réparation possible quand elle est perdue : une nouvelle
 * clé, scellée, avec ses conséquences énoncées avant le geste. Le test
 * vérifie surtout ce qui ne doit PAS arriver : pas de réinitialisation sans
 * confirmation, pas de « c'est fait » quand le serveur a refusé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/crypto', () => ({
  generateKeyPair: vi.fn(async () => ({ publicKey: 'PUB_NEUVE', privateKey: 'PRIV_NEUVE' })),
}));

const toast = vi.fn();
vi.mock('@/lib/toast', () => ({ toast: (...args: unknown[]) => toast(...args) }));

import KeySettings from '@/components/KeySettings';

function jsonRes(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
}

let resetCalls: RequestInit[];

function stubFetch(me: { status: number; body?: unknown }, resetStatus = 200) {
  resetCalls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/users/keys/me') return jsonRes(me.body ?? {}, me.status);
      if (url === '/api/users/keys/reset') {
        resetCalls.push(init!);
        return jsonRes({}, resetStatus);
      }
      return jsonRes({}, 404);
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('KeySettings', () => {
  it('dit que tout va bien quand la clé est au coffre', async () => {
    stubFetch({ status: 200, body: { publicKey: 'PUB', privateKey: 'PRIV' } });
    render(<KeySettings />);
    expect(await screen.findByText(/ta clé est au coffre/i)).toBeInTheDocument();
  });

  it('dit que la clé est perdue et propose de la réinitialiser', async () => {
    stubFetch({ status: 200, body: { publicKey: 'PUB', privateKey: null } });
    render(<KeySettings />);
    expect(await screen.findByText(/introuvable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réinitialiser ma clé/i })).toBeInTheDocument();
  });

  it('ne réinitialise rien sans confirmation, et dit les conséquences avant', async () => {
    stubFetch({ status: 200, body: { publicKey: 'PUB', privateKey: null } });
    const user = userEvent.setup();
    render(<KeySettings />);

    await user.click(await screen.findByRole('button', { name: /réinitialiser ma clé/i }));
    expect(resetCalls).toHaveLength(0);
    // Les deux conséquences : ce que ça change pour moi, et pour la personne en face.
    expect(screen.getByText(/resteront illisibles pour toi/i)).toBeInTheDocument();
    expect(screen.getByText(/la personne en face/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /annuler/i }));
    expect(resetCalls).toHaveLength(0);
  });

  it('génère une paire, l’envoie scellée, puis purge la clé locale héritée', async () => {
    stubFetch({ status: 200, body: { publicKey: 'PUB', privateKey: null } });
    localStorage.setItem('libre_private_key', 'vieille');
    localStorage.setItem('libre_public_key', 'PUB');
    localStorage.setItem('libre_device_key', 'x');
    const user = userEvent.setup();
    render(<KeySettings />);

    await user.click(await screen.findByRole('button', { name: /réinitialiser ma clé/i }));
    await user.click(screen.getByRole('button', { name: /oui, réinitialiser/i }));

    await waitFor(() => expect(resetCalls).toHaveLength(1));
    expect(JSON.parse(resetCalls[0].body as string)).toEqual({ publicKey: 'PUB_NEUVE', privateKey: 'PRIV_NEUVE' });
    expect(await screen.findByText(/ta clé est au coffre/i)).toBeInTheDocument();
    expect(localStorage.getItem('libre_private_key')).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/nouvelle clé/i), expect.anything());
  });

  it('ne prétend pas avoir réinitialisé quand le serveur refuse', async () => {
    stubFetch({ status: 200, body: { publicKey: 'PUB', privateKey: null } }, 503);
    const user = userEvent.setup();
    render(<KeySettings />);

    await user.click(await screen.findByRole('button', { name: /réinitialiser ma clé/i }));
    await user.click(screen.getByRole('button', { name: /oui, réinitialiser/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/impossible/i);
    expect(screen.queryByText(/ta clé est au coffre/i)).not.toBeInTheDocument();
  });

  it('reste sobre pendant une panne de coffre : pas de réinitialisation proposée', async () => {
    stubFetch({ status: 503 });
    render(<KeySettings />);
    expect(await screen.findByText(/pour le moment/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /réinitialiser ma clé/i })).not.toBeInTheDocument();
  });
});
