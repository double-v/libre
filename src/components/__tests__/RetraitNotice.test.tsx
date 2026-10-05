import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RetraitNotice, { COPY_RETRAIT, COPY_INVITATION, CLE_INVITATION_ECARTEE } from '../RetraitNotice';

afterEach(() => vi.unstubAllGlobals());

const profil = (retrait: boolean) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ retrait }), { status: 200 })));

describe('<RetraitNotice /> (#444)', () => {
  it('invite à se faire vérifier quand le profil est en retrait', async () => {
    profil(true);
    render(<RetraitNotice />);
    expect(await screen.findByText(COPY_RETRAIT.texte)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY_RETRAIT.action })).toHaveAttribute('href', '/verify');
  });

  it('ne dit rien d’un soupçon', () => {
    expect(COPY_RETRAIT.texte).not.toMatch(/signal|suspect|soupçon|faux|fraude|arnaque/i);
  });

  it('rien sans retrait', async () => {
    profil(false);
    const { container } = render(<RetraitNotice />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('<RetraitNotice /> — invitation automatique (spec 010)', () => {
  const reponse = (d: Record<string, unknown>) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(d), { status: 200 })));

  afterEach(() => { try { localStorage.clear(); } catch { /* */ } });

  it('invite sans masquer : lien vers la vérification et « Plus tard »', async () => {
    reponse({ invitationVerification: true });
    render(<RetraitNotice />);
    expect(await screen.findByText(COPY_INVITATION.texte)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY_INVITATION.action })).toHaveAttribute('href', '/verify');
    expect(screen.getByRole('button', { name: COPY_INVITATION.plusTard })).toBeInTheDocument();
  });

  it('« Plus tard » écarte le bandeau 24 h sur cet appareil', async () => {
    reponse({ invitationVerification: true });
    const { container, unmount } = render(<RetraitNotice />);
    fireEvent.click(await screen.findByRole('button', { name: COPY_INVITATION.plusTard }));
    expect(container).toBeEmptyDOMElement();
    unmount();
    const { container: c2 } = render(<RetraitNotice />);
    await new Promise((r) => setTimeout(r, 0));
    expect(c2).toBeEmptyDOMElement();
  });

  it('revient après 24 h : c’est le rappel', async () => {
    localStorage.setItem(CLE_INVITATION_ECARTEE, String(Date.now() - 25 * 3600 * 1000));
    reponse({ invitationVerification: true });
    render(<RetraitNotice />);
    expect(await screen.findByText(COPY_INVITATION.texte)).toBeInTheDocument();
  });

  it('le retrait l’emporte sur l’invitation', async () => {
    reponse({ retrait: true, invitationVerification: true });
    render(<RetraitNotice />);
    expect(await screen.findByText(COPY_RETRAIT.texte)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: COPY_INVITATION.plusTard })).toBeNull();
  });

  it('ni motif, ni soupçon, ni chiffre', () => {
    expect(COPY_INVITATION.texte).not.toMatch(/signal|suspect|soupçon|faux|fraude|arnaque|douteu|indice|\d/i);
  });
});
