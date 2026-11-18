/**
 * Parcours du badge vérifié au code manuscrit (spec 012, US1/US2), tel que
 * le prototype validé. Le client est un faux serveur à état : il tire de
 * vrais codes, en révoque, refuse un code périmé. L'écran est jugé sur ce
 * qu'il montre et sur ce que le serveur a reçu, pas sur des appels.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifyFlow, { type VerifyApi } from '../VerifyFlow';
import type { StatutVerification } from '@/lib/verification/client';

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:apercu');
  URL.revokeObjectURL = vi.fn();
});

const apos = (s: string) => s.replace(/’/g, "'");

function serveur(depart: StatutVerification = { statut: 'aucune' }) {
  const etat = {
    statut: depart,
    codes: ['7358', '2694', '4926', '8253'],
    courant: null as string | null,
    recus: [] as Array<{ code: string; fichier: string }>,
    vus: 0,
    expireAuProchainEnvoi: false,
  };
  const api: VerifyApi = {
    lireStatut: async () => ({ ok: true, valeur: etat.statut }),
    tirerCode: async () => {
      if (etat.statut.statut === 'refusee' && etat.statut.reessaiAt) {
        return { ok: false, erreur: 'Tu pourras refaire ton selfie après cette date.', reessaiAt: etat.statut.reessaiAt };
      }
      etat.courant = etat.codes.shift()!;
      return { ok: true, valeur: { code: etat.courant, expireAt: new Date(Date.now() + 30 * 60_000).toISOString() } };
    },
    envoyerSelfie: async (f: File, code: string) => {
      if (etat.expireAuProchainEnvoi || code !== etat.courant) {
        etat.expireAuProchainEnvoi = false;
        etat.courant = null;
        return { ok: false, erreur: 'Ce code a expiré ou a été remplacé.', nouveauCode: true };
      }
      etat.recus.push({ code, fichier: f.name });
      etat.courant = null;
      etat.statut = { statut: 'en_cours' };
      return { ok: true, valeur: { statut: 'en_cours' } };
    },
    marquerVu: async () => { etat.vus += 1; },
  };
  return { etat, api };
}

const selfie = (nom = 's.jpg') => new File([new Uint8Array([1])], nom, { type: 'image/jpeg' });
const refusee = (o: Partial<Extract<StatutVerification, { statut: 'refusee' }>> = {}): StatutVerification => ({
  statut: 'refusee',
  motif: { cle: 'code', texte: 'Le code n’est pas écrit à la main, pas lisible ou pas exact.', conseil: 'Écris les chiffres en gros.' },
  tentative: 2,
  nonVu: true,
  ...o,
});

describe('VerifyFlow', () => {
  it('parcours complet : code → consignes → aperçu → envoi du bon code → en cours d’examen', async () => {
    const { etat, api } = serveur();
    render(<VerifyFlow client={api} onRetour={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mon code' }));
    expect(await screen.findByText('LIBRE 7358')).toBeInTheDocument();
    expect(screen.getByText('Ton code, valable 30 minutes')).toBeInTheDocument();
    // FR-003 : tenir ou poser la feuille, et quelqu'un peut écrire pour toi.
    expect(screen.getByText(/pose-la à côté de toi/)).toBeInTheDocument();
    expect(screen.getByText(/peut écrire le code pour toi/)).toBeInTheDocument();
    // FR-S04 : l'appareil photo d'abord.
    expect(screen.getByLabelText('Prendre le selfie')).toHaveAttribute('capture', 'user');

    fireEvent.change(screen.getByLabelText('Prendre le selfie'), { target: { files: [selfie('moi.jpg')] } });
    expect(await screen.findByRole('heading', { name: apos('On l’envoie ?') })).toBeInTheDocument();
    expect(screen.getByText(/LIBRE 7358/, { selector: 'p' })).toBeInTheDocument();
    expect(etat.recus).toEqual([]); // rien ne part avant le clic

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer pour vérification' }));
    expect(await screen.findByText(apos('En cours d’examen'))).toBeInTheDocument();
    expect(etat.recus).toEqual([{ code: '7358', fichier: 'moi.jpg' }]);
  });

  it('code expiré à l’envoi : un nouveau code s’affiche, la photo est à refaire, rien n’est perdu', async () => {
    const { etat, api } = serveur();
    render(<VerifyFlow client={api} onRetour={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mon code' }));
    fireEvent.change(await screen.findByLabelText('Prendre le selfie'), { target: { files: [selfie()] } });
    etat.expireAuProchainEnvoi = true;
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer pour vérification' }));
    expect(await screen.findByText('LIBRE 2694')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Ton code avait expiré');
    expect(screen.getByLabelText('Prendre le selfie')).toBeInTheDocument();
    expect(etat.recus).toEqual([]);
  });

  it('« Reprendre la photo » garde le même code', async () => {
    const { etat, api } = serveur();
    render(<VerifyFlow client={api} onRetour={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mon code' }));
    fireEvent.change(await screen.findByLabelText('Prendre le selfie'), { target: { files: [selfie()] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Reprendre la photo' }));
    expect(await screen.findByText('LIBRE 7358')).toBeInTheDocument();
    expect(etat.courant).toBe('7358');
  });

  it('FR-011 : refus → motif, conseil et nouveau code déjà tiré ; « Refaire mon selfie » le reprend', async () => {
    const { etat, api } = serveur(refusee());
    render(<VerifyFlow client={api} onRetour={() => {}} />);
    expect(await screen.findByRole('heading', { name: apos('Ton selfie n’a pas pu être validé') })).toBeInTheDocument();
    expect(screen.getByText('Le code n’est pas écrit à la main, pas lisible ou pas exact.')).toBeInTheDocument();
    expect(screen.getByText('Écris les chiffres en gros.')).toBeInTheDocument();
    expect(await screen.findByText('LIBRE 7358')).toBeInTheDocument();
    expect(screen.getByText('Ton nouveau code, valable 30 minutes')).toBeInTheDocument();
    await waitFor(() => expect(etat.vus).toBe(1)); // le repère s'éteint

    fireEvent.click(screen.getByRole('button', { name: 'Refaire mon selfie' }));
    fireEvent.change(await screen.findByLabelText('Prendre le selfie'), { target: { files: [selfie()] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer pour vérification' }));
    expect(await screen.findByText(apos('En cours d’examen'))).toBeInTheDocument();
    expect(etat.recus.map((r) => r.code)).toEqual(['7358']);
  });

  it('FR-012 : après trois refus, la date de reprise est écrite, aucun code n’est tiré, la sortie reste', async () => {
    const reessaiAt = '2026-11-13T15:30:00.000Z';
    const { etat, api } = serveur(refusee({ reessaiAt, tentative: 4 }));
    const retour = vi.fn();
    render(<VerifyFlow client={api} onRetour={retour} />);
    expect(await screen.findByText(/Tu pourras refaire ton selfie à partir du/)).toHaveTextContent('13 novembre');
    expect(screen.queryByText(/^LIBRE/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refaire mon selfie' })).not.toBeInTheDocument();
    expect(etat.codes).toHaveLength(4); // rien tiré
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(retour).toHaveBeenCalled();
  });

  it('erreur au tirage : message du serveur, et le bouton reste là pour réessayer', async () => {
    const { api } = serveur();
    let premiere = true;
    const tirer = api.tirerCode;
    api.tirerCode = async () => {
      if (premiere) { premiere = false; return { ok: false, erreur: 'Confirme d’abord ton adresse e-mail.' }; }
      return tirer();
    };
    render(<VerifyFlow client={api} onRetour={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mon code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirme d’abord ton adresse e-mail.');
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code' }));
    expect(await screen.findByText('LIBRE 7358')).toBeInTheDocument();
  });

  it('validée : le dit, et marque la décision vue', async () => {
    const { etat, api } = serveur({ statut: 'validee' });
    render(<VerifyFlow client={api} onRetour={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Ton profil est vérifié' })).toBeInTheDocument();
    await waitFor(() => expect(etat.vus).toBe(1));
  });

  it('« Plus tard » rend la main', async () => {
    const retour = vi.fn();
    render(<VerifyFlow client={serveur().api} onRetour={retour} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Plus tard' }));
    expect(retour).toHaveBeenCalled();
  });
});
