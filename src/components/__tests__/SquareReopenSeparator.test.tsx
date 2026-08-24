/**
 * Tests composant — le séparateur de réouverture de La Place (#358).
 *
 * Le fil recommence à zéro chaque jour, mais rien ne le disait : on arrivait
 * sur des messages sans savoir qu'ils dataient tous d'après la purge. Le canvas
 * ouvre le fil sur un jalon — et l'heure qu'il porte doit être celle que le
 * serveur a réellement appliquée, pas le « minuit » que le canvas dessine.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import SquareReopenSeparator from '../SquareReopenSeparator';
import SquareMessageList from '../SquareMessageList';
import type { SquareMessage } from '@/lib/square/store';

beforeEach(() => {
  vi.useFakeTimers();
  // 21h40 UTC : la borne du jour (2h UTC) est passée.
  vi.setSystemTime(new Date('2026-08-24T21:40:00Z'));
  process.env.TZ = 'UTC';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SquareReopenSeparator', () => {
  it('annonce la réouverture à l’heure appliquée par le serveur', () => {
    render(<SquareReopenSeparator />);
    // 2h UTC, lu en UTC dans ce test. Surtout pas « minuit », qui est
    // l'approximation du canvas — celle-là même que #13 a corrigée en base.
    expect(screen.getByText(/La Place a rouvert à 02:00/)).toBeTruthy();
  });

  it('ne se lit pas comme un message de quelqu’un', () => {
    const { container } = render(<SquareReopenSeparator />);
    // C'est un jalon de temps, pas une prise de parole : il ne doit pas
    // s'annoncer comme une voix de plus dans le fil (cf. PRODUCT.md).
    expect(container.querySelector('[role="separator"]')).toBeTruthy();
  });
});

const MESSAGE: SquareMessage = {
  id: 'm1',
  pseudonym: 'Amédée',
  content: "Première fois que je viens ici.",
  type: 'text',
  isAdmin: false,
  isSystem: false,
  timestamp: Date.parse('2026-08-24T21:04:00Z'),
};

describe('SquareMessageList — le jalon ouvre le fil', () => {
  it('place le séparateur en tête, avant le premier message', () => {
    render(<SquareMessageList messages={[MESSAGE]} reactions={{}} />);
    const fil = screen.getByRole('log');
    const jalon = within(fil).getByRole('separator');
    const premier = within(fil).getByText(MESSAGE.content);
    // `compareDocumentPosition` : le jalon doit précéder le message dans le
    // document, pas seulement exister quelque part.
    expect(jalon.compareDocumentPosition(premier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marque aussi la réouverture d’une Place encore vide', () => {
    // Le vide est le cas nominal au lancement : « rien depuis 02:00 » est une
    // information, « rien » tout court n'en est pas une.
    render(<SquareMessageList messages={[]} reactions={{}} />);
    expect(screen.getByRole('separator')).toBeTruthy();
  });
});
