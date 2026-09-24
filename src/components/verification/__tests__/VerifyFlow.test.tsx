/**
 * #436 — parcours du badge vérifié, tel que validé sur prototype.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifyFlow, { type VerifyApi } from '../VerifyFlow';
import type { Tirage } from '@/lib/verification/client';

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:apercu');
  URL.revokeObjectURL = vi.fn();
});

const tirage = (code: string, peutRetirer = true): Tirage => ({
  geste: { code, texte: `Geste ${code}`, type: 'main' },
  jeton: `jeton-${code}`,
  peutRetirer,
});

function client(over: Partial<VerifyApi> = {}): VerifyApi {
  return {
    lireStatut: vi.fn(async () => ({ ok: true as const, valeur: { statut: 'aucune' as const } })),
    tirerGeste: vi.fn(async (precedent?: string) => ({ ok: true as const, valeur: precedent ? tirage('b', false) : tirage('a') })),
    envoyerSelfie: vi.fn(async () => ({ ok: true as const, valeur: { statut: 'en_cours' as const } })),
    ...over,
  };
}

const selfie = () => new File([new Uint8Array([1])], 's.jpg', { type: 'image/jpeg' });

describe('VerifyFlow', () => {
  it('parcours complet : présentation → geste → aperçu → envoi → en cours d’examen', async () => {
    const c = client();
    render(<VerifyFlow client={c} onRetour={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Voir mon geste' }));
    expect(await screen.findByText('Geste a')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Prendre le selfie'), { target: { files: [selfie()] } });
    expect(await screen.findByRole('heading', { name: 'On l’envoie ?'.replace('’', "'") })).toBeInTheDocument();
    expect(screen.getByAltText('Aperçu de ton selfie')).toHaveAttribute('src', 'blob:apercu');
    expect(c.envoyerSelfie).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer pour vérification' }));
    expect(await screen.findByText('En cours d’examen'.replace('’', "'"))).toBeInTheDocument();
    expect(c.envoyerSelfie).toHaveBeenCalledWith(expect.any(File), 'jeton-a');
  });

  it('un seul nouveau tirage, avec le jeton du premier', async () => {
    const c = client();
    render(<VerifyFlow client={c} onRetour={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Voir mon geste' }));
    fireEvent.click(await screen.findByRole('button', { name: 'En tirer un autre' }));
    expect(await screen.findByText('Geste b')).toBeInTheDocument();
    expect(c.tirerGeste).toHaveBeenLastCalledWith('jeton-a');
    expect(screen.queryByRole('button', { name: 'En tirer un autre' })).not.toBeInTheDocument();
  });

  it('« Reprendre la photo » revient au même geste sans rien envoyer', async () => {
    const c = client();
    render(<VerifyFlow client={c} onRetour={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Voir mon geste' }));
    fireEvent.change(await screen.findByLabelText('Choisir un fichier'), { target: { files: [selfie()] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Reprendre la photo' }));
    expect(await screen.findByText('Geste a')).toBeInTheDocument();
    expect(c.envoyerSelfie).not.toHaveBeenCalled();
  });

  it('l’erreur serveur s’affiche telle quelle et laisse réessayer', async () => {
    const c = client({ envoyerSelfie: vi.fn(async () => ({ ok: false as const, erreur: "L'image ne doit pas dépasser 5 Mo." })) });
    render(<VerifyFlow client={c} onRetour={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Voir mon geste' }));
    fireEvent.change(await screen.findByLabelText('Prendre le selfie'), { target: { files: [selfie()] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer pour vérification' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("L'image ne doit pas dépasser 5 Mo.");
    expect(screen.getByRole('button', { name: 'Envoyer pour vérification' })).toBeEnabled();
  });

  it('refus : le motif, puis « Recommencer » tire un nouveau geste', async () => {
    const c = client({ lireStatut: vi.fn(async () => ({ ok: true as const, valeur: { statut: 'refusee' as const, motif: 'Le geste demandé ne se voit pas sur la photo.' } })) });
    render(<VerifyFlow client={c} onRetour={() => {}} />);
    expect(await screen.findByText('Le geste demandé ne se voit pas sur la photo.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer' }));
    await waitFor(() => expect(c.tirerGeste).toHaveBeenCalledWith(undefined));
    expect(await screen.findByText('Geste a')).toBeInTheDocument();
  });

  it.each([
    ['en_cours', 'En cours d’examen'.replace('’', "'")],
    ['validee', 'Ton profil est vérifié'],
  ] as const)('ouvre directement sur l’état « %s »', async (statut, texte) => {
    const c = client({ lireStatut: vi.fn(async () => ({ ok: true as const, valeur: { statut } })) });
    render(<VerifyFlow client={c} onRetour={() => {}} />);
    expect(await screen.findByText(texte)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voir mon geste' })).not.toBeInTheDocument();
  });

  it('« Plus tard » rend la main', async () => {
    const onRetour = vi.fn();
    render(<VerifyFlow client={client()} onRetour={onRetour} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Plus tard' }));
    expect(onRetour).toHaveBeenCalled();
  });
});
