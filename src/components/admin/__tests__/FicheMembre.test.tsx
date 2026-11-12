/**
 * Gestes guidés de la fiche membre (spec 012, US4, FR-019 à FR-022).
 *
 * La frontière simulée est le réseau : on vérifie la requête réellement
 * envoyée (adresse, méthode, corps) et ce que l'écran affiche, jamais un
 * simple appel de fonction. Sans confirmation, aucune requête d'écriture ne
 * part (US4, scénario 3).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FicheMembre from '../FicheMembre';
import type { FicheMembre as Fiche } from '@/lib/moderation/fiche';

const ID = '3f2b8c1e-1d2a-4c3b-9a8e-7f6d5c4b3a21';
const LIE = '4a2b8c1e-1d2a-4c3b-9a8e-7f6d5c4b3a22';

function base(o: Partial<Fiche> = {}): Fiche {
  return {
    membre: { id: ID, pseudo: 'Julien_84', email: 'julien@exemple.test', inscritAt: '2026-11-10T00:00:00Z', vuLe: '2026-11-12', verifie: false, statut: 'actif', fiabilite: 'douteux', invitation: null, retrait: null, admin: false },
    cas: [{ type: 'report', id: 'rep-1', depuis: '2026-11-11T00:00:00Z', motif: 'scam', motifLibelle: 'Arnaque ou demande d’argent', description: 'Envoie-moi 200 €.', auteur: 'Signaleuse', enAttente: 3, reponsesAuMoment: [] }],
    reponses: [],
    signaux: [{ type: 'lexique_arnaque', libelle: 'Vocabulaire d’arnaque (paiement, rencontre tarifée)', force: 'fort', date: '2026-11-11T00:00:00Z', extrait: null, legitimePossible: null }],
    photos: [],
    historique: [{ at: '2026-11-11T00:00:00Z', action: 'INVITE_VERIFICATION', libelle: 'Invitation à la vérification', motif: null, auteur: 'automatique' }, { at: '2026-11-02T00:00:00Z', action: 'DISMISS_REPORT', libelle: 'Signalement classé sans suite', motif: null, auteur: 'Sam' }],
    ...o,
  };
}

let fiche: Fiche;
let ecritures: Array<{ url: string; method: string; corps: unknown }>;

beforeEach(() => {
  fiche = base();
  ecritures = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') return new Response(JSON.stringify(fiche), { status: 200 });
    ecritures.push({ url, method, corps: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function ouvrir(onChange = vi.fn(), onRetour = vi.fn(), onOuvrir = vi.fn()) {
  render(<FicheMembre id={ID} onRetour={onRetour} onChange={onChange} onOuvrir={onOuvrir} />);
  await screen.findByRole('heading', { level: 1, name: 'Julien_84' });
  return { onChange, onRetour, onOuvrir };
}

describe('sections et repères', () => {
  it('signalement pour demande d’argent : contenu, nombre, signaux, repère et gestes (US4, scénario 1)', async () => {
    await ouvrir();
    const carte = screen.getByRole('article');
    expect(within(carte).getByText('Envoie-moi 200 €.')).toBeInTheDocument();
    expect(within(carte).getByText(/3 signalements en attente pour ce membre/)).toBeInTheDocument();
    expect(within(carte).getByText(/Une demande d’argent à quelqu’un rencontré sur Libre suffit pour bannir/)).toBeInTheDocument();
    expect(within(carte).getAllByRole('button').map((b) => b.textContent)).toEqual(['Sans suite', 'Avertir', 'Bannir…']);
    expect(screen.getByText('Vocabulaire d’arnaque (paiement, rencontre tarifée)')).toBeInTheDocument();
  });

  it('sections dans l’ordre de FR-019', async () => {
    await ouvrir();
    const titres = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(titres).toEqual(['Julien_84', 'Arnaque ou demande d’argent', 'Indice de fiabilité Douteux', 'Historique', 'Autres gestes']);
  });

  it('historique : « par Sam » ou « automatique »', async () => {
    await ouvrir();
    expect(screen.getByText('· automatique')).toBeInTheDocument();
    expect(screen.getByText('· par Sam')).toBeInTheDocument();
  });
});

describe('bannir (FR-021, FR-022)', () => {
  it('rien ne part sans confirmation, le motif est exigé, et « Le membre verra » dit la vraie copie', async () => {
    const user = userEvent.setup();
    const { onChange } = await ouvrir();
    await user.click(within(screen.getByRole('article')).getByRole('button', { name: 'Bannir…' }));
    const feuille = screen.getByRole('dialog', { name: 'Bannir Julien_84 ?' });
    expect(within(feuille).getByText(/Votre compte a été suspendu\./)).toBeInTheDocument();
    const confirmer = within(feuille).getByRole('button', { name: 'Bannir' });
    expect(confirmer).toBeDisabled();
    await user.click(within(feuille).getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(ecritures).toEqual([]);

    await user.click(within(screen.getByRole('article')).getByRole('button', { name: 'Bannir…' }));
    const f2 = screen.getByRole('dialog');
    await user.selectOptions(within(f2).getByLabelText('Motif, inscrit à l’historique'), 'argent');
    await user.click(within(f2).getByRole('button', { name: 'Bannir' }));
    expect(ecritures).toEqual([{ url: '/api/admin/reports/rep-1', method: 'PATCH', corps: { action: 'BAN', reason: 'Demande d’argent' } }]);
    expect(onChange).toHaveBeenCalled();
  });

  it('Échap ferme la feuille sans rien envoyer', async () => {
    const user = userEvent.setup();
    await ouvrir();
    await user.click(within(screen.getByRole('article')).getByRole('button', { name: 'Bannir…' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(ecritures).toEqual([]);
  });
});

describe('supprimer (FR-S11)', () => {
  it('exige le pseudo exact et un motif, puis appelle la route confirmée et revient à la liste', async () => {
    const user = userEvent.setup();
    const { onRetour } = await ouvrir();
    await user.click(screen.getByText('Zone sensible'));
    await user.click(screen.getByRole('button', { name: 'Supprimer le compte…' }));
    const f = screen.getByRole('dialog', { name: 'Supprimer le compte de Julien_84 ?' });
    const confirmer = within(f).getByRole('button', { name: 'Supprimer' });
    await user.selectOptions(within(f).getByLabelText('Motif, inscrit à l’historique'), 'faux_profil');
    await user.type(within(f).getByLabelText(/écris son pseudo/), 'julien_84');
    expect(confirmer).toBeDisabled();
    await user.clear(within(f).getByLabelText(/écris son pseudo/));
    await user.type(within(f).getByLabelText(/écris son pseudo/), 'Julien_84');
    expect(confirmer).toBeEnabled();
    await user.click(confirmer);
    expect(ecritures).toEqual([{ url: `/api/admin/membres/${ID}`, method: 'DELETE', corps: { pseudo: 'Julien_84', motif: 'faux_profil' } }]);
    expect(onRetour).toHaveBeenCalled();
  });

  it('un compte admin ne propose pas la suppression', async () => {
    fiche = base({ membre: { ...base().membre, admin: true } });
    const user = userEvent.setup();
    await ouvrir();
    await user.click(screen.getByText('Zone sensible'));
    expect(screen.queryByRole('button', { name: 'Supprimer le compte…' })).toBeNull();
  });
});

describe('doublon probable (US4, scénario 2)', () => {
  beforeEach(() => {
    fiche = base({
      cas: [{ type: 'indice', id: ID, depuis: '2026-11-11T00:00:00Z', doublon: { id: LIE, pseudo: 'Ines_2' }, lies: [{ id: LIE, pseudo: 'Ines_2', existe: true, confirme: false }] }],
      signaux: [{ type: 'appareil_partage', libelle: 'Appareil partagé avec un autre compte', force: 'faible', date: '2026-11-11T00:00:00Z', extrait: null, legitimePossible: 'Peut être légitime : appareil de couple ou de famille.' }],
    });
  });

  it('le compte lié s’ouvre d’un geste', async () => {
    const user = userEvent.setup();
    const { onOuvrir } = await ouvrir();
    await user.click(screen.getByRole('button', { name: /Ines_2.*Compte lié/ }));
    expect(onOuvrir).toHaveBeenCalledWith(LIE);
  });

  it('« Supprimer » vise le compte jamais confirmé, le compte ouvert est gardé', async () => {
    const user = userEvent.setup();
    await ouvrir();
    await user.click(screen.getByRole('button', { name: 'Supprimer Ines_2…' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }));
    expect(ecritures).toEqual([{ url: '/api/admin/indices/doublon', method: 'POST', corps: { orphelinId: LIE, gardeId: ID } }]);
  });
});

describe('erreurs', () => {
  it('un refus du serveur s’affiche, la feuille reste ouverte', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET'
        ? new Response(JSON.stringify(fiche), { status: 200 })
        : new Response(JSON.stringify({ error: 'Le pseudo ressaisi ne correspond pas : rien n’a été supprimé.' }), { status: 400 })));
    const user = userEvent.setup();
    await ouvrir();
    await user.click(screen.getByRole('button', { name: 'Avertir' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avertir' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Le pseudo ressaisi ne correspond pas');
  });

  it('membre supprimé entre-temps : la fiche le dit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Membre introuvable.' }), { status: 404 })));
    render(<FicheMembre id={ID} onRetour={() => {}} onChange={() => {}} onOuvrir={() => {}} />);
    expect(await screen.findByText('Ce membre n’existe plus')).toBeInTheDocument();
  });
});
