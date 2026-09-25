import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RetraitNotice, { COPY_RETRAIT } from '../RetraitNotice';

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
