/**
 * Carte de demande de badge dans la file admin (#436, spec 012 US1/US2).
 *
 * Le selfie se juge à côté du code attendu et des photos du profil ; la
 * lecture automatique est un indice affiché, ses divergences soulignées ;
 * trois oui pour valider, un motif de la liste pour refuser (FR-006, FR-007).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminVerificationCard, { type Decision, type VerificationRow } from '../AdminVerificationCard';

const demande = (over: Partial<VerificationRow> = {}): VerificationRow => ({
  id: 'v1',
  selfieUrl: '/api/photos/u1%2Fverif%2Fs.jpg',
  status: 'pending',
  createdAt: '2026-11-10T10:00:00Z',
  codeAttendu: '4926',
  codeLu: '4926',
  tentative: 1,
  sansDonneesAppareil: false,
  ancienGeste: null,
  motif: null,
  refusPrecedent: null,
  user: { id: 'u1', displayName: 'Camille', emailMasque: 'ca***@ex***.org', photos: ['/api/photos/u1%2Fa.jpg', '/api/photos/u1%2Fb.jpg'] },
  ...over,
});

function decisions() {
  const recues: Decision[] = [];
  return { recues, onDecision: async (d: Decision) => { recues.push(d); } };
}

describe('AdminVerificationCard', () => {
  it('recherche inversée sur les photos du profil, jamais sur le selfie (#442)', () => {
    render(<AdminVerificationCard v={demande()} onDecision={vi.fn()} />);
    const lens = screen.getAllByRole('link', { name: 'Google Lens', hidden: true });
    expect(lens.map((a) => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('cle'))).toEqual(['u1/a.jpg', 'u1/b.jpg']);
  });

  it('code attendu, selfie et photos du profil côte à côte', () => {
    render(<AdminVerificationCard v={demande()} onDecision={vi.fn()} />);
    expect(screen.getByAltText('Selfie de vérification de Camille')).toHaveAttribute('src', '/api/photos/u1%2Fverif%2Fs.jpg');
    expect(screen.getByText('4926')).toBeInTheDocument();
    expect(screen.getAllByAltText(/Photo \d du profil/)).toHaveLength(2);
  });

  it.each([
    [null, 'Lecture automatique en cours…'],
    ['', 'Lecture automatique impossible : lis-le toi-même.'],
    ['4926', 'Lu automatiquement : 4926'],
  ])('lecture %j : « %s »', (codeLu, texte) => {
    render(<AdminVerificationCard v={demande({ codeLu })} onDecision={vi.fn()} />);
    expect(screen.getByText(texte)).toBeInTheDocument();
  });

  it('lecture divergente : seuls les chiffres différents sont soulignés', () => {
    const { container } = render(<AdminVerificationCard v={demande({ codeLu: '4962' })} onDecision={vi.fn()} />);
    expect([...container.querySelectorAll('u')].map((u) => u.textContent)).toEqual(['6', '2']);
  });

  it('« Valider » n’est actif qu’avec trois oui, la lecture automatique ne décide rien', async () => {
    const { recues, onDecision } = decisions();
    render(<AdminVerificationCard v={demande()} onDecision={onDecision} />);
    const valider = screen.getByRole('button', { name: 'Valider' });
    expect(valider).toBeDisabled(); // code bien lu, mais aucun oui
    fireEvent.click(screen.getByLabelText('Le code est écrit à la main et je lis bien 4926.'));
    fireEvent.click(screen.getByLabelText('C’est la même personne que sur les photos.'));
    expect(valider).toBeDisabled();
    fireEvent.click(screen.getByLabelText('C’est une vraie photo, pas un écran ni une image générée.'));
    fireEvent.click(valider);
    await waitFor(() => expect(recues).toEqual([{ action: 'APPROVE_VERIFICATION' }]));
  });

  it('« Refuser » : les quatre motifs de la spec, et seulement eux', async () => {
    const { recues, onDecision } = decisions();
    render(<AdminVerificationCard v={demande()} onDecision={onDecision} />);
    const options = [...(screen.getByLabelText('Motif de refus') as HTMLSelectElement).options].map((o) => o.value).filter(Boolean);
    expect(options).toEqual(['code', 'personne', 'ecran', 'visage']);
    const refuser = screen.getByRole('button', { name: 'Refuser' });
    expect(refuser).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motif de refus'), { target: { value: 'ecran' } });
    fireEvent.click(refuser);
    await waitFor(() => expect(recues).toEqual([{ action: 'REJECT_VERIFICATION', motif: 'ecran' }]));
  });

  it('2e tentative : le rang et le refus précédent', () => {
    render(<AdminVerificationCard v={demande({ tentative: 2, refusPrecedent: { motif: 'Visage peu visible', at: '2026-11-08T10:00:00Z' } })} onDecision={vi.fn()} />);
    expect(screen.getByText(/Tentative n° 2\. La précédente a été refusée le 08\/11\/2026 \(visage peu visible\)\./)).toBeInTheDocument();
  });

  it('1re tentative : pas de rang affiché', () => {
    render(<AdminVerificationCard v={demande()} onDecision={vi.fn()} />);
    expect(screen.queryByText(/Tentative n°/)).not.toBeInTheDocument();
  });

  it('indice « sans données d’appareil » affiché seulement quand il est vrai', () => {
    const { rerender } = render(<AdminVerificationCard v={demande({ sansDonneesAppareil: true })} onDecision={vi.fn()} />);
    expect(screen.getByText(/aucune donnée d’appareil/)).toBeInTheDocument();
    rerender(<AdminVerificationCard v={demande({ id: 'v2', sansDonneesAppareil: null })} onDecision={vi.fn()} />);
    expect(screen.queryByText(/aucune donnée d’appareil/)).not.toBeInTheDocument();
  });

  it('FR-008 : demande au geste, le geste et sa question à la place du code', () => {
    render(<AdminVerificationCard v={demande({ codeAttendu: null, codeLu: null, ancienGeste: 'Pouce levé, sous ton menton' })} onDecision={vi.fn()} />);
    expect(screen.getByText('Pouce levé, sous ton menton')).toBeInTheDocument();
    expect(screen.getByLabelText('Le geste demandé se voit sur la photo.')).toBeInTheDocument();
    expect(screen.queryByText(/Code attendu/)).not.toBeInTheDocument();
  });

  it('une demande tranchée n’a plus d’actions, et un refus rappelle son motif', () => {
    render(<AdminVerificationCard v={demande({ status: 'rejected', motif: 'Ton visage n’est pas assez visible.' })} onDecision={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument();
    expect(screen.getByText(/Ton visage n’est pas assez visible/)).toBeInTheDocument();
  });
});
