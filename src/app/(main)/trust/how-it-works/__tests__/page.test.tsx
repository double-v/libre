/**
 * Tests — page « Comment marche la confiance » (issue #162, #509).
 *
 * La page promettait des gestes que le code ne récompense pas (« depuis tes
 * paramètres » pour un email déjà vérifié à l'inscription, « une vraie
 * rencontre » pour un simple match) et parlait du check-in en pause. Ces tests
 * verrouillent le miroir de compute-level.ts et des interrupteurs (#418).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// La page lit les interrupteurs côté serveur (#509).
let features = { checkin: false, crossings: true, square: true, journal_comments: false };
vi.mock('@/lib/features-server', () => ({
  getFeatures: async () => features,
}));

const { default: TrustHowItWorksPage } = await import('../page');
const vue = async () => render(await TrustHowItWorksPage());

beforeEach(() => {
  features = { checkin: false, crossings: true, square: true, journal_comments: false };
});

describe('<TrustHowItWorksPage />', () => {
  it('présente les 4 niveaux de confiance', async () => {
    await vue();
    for (const label of ['Nouveau', 'Membre', 'Fiable', 'Ancre']) {
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    }
  });

  it('affiche les facteurs de score clés (miroir de compute-level)', async () => {
    await vue();
    expect(screen.getByText('+20')).toBeInTheDocument(); // selfie
    expect(screen.getByText('+10 / +10 / +10')).toBeInTheDocument(); // ancienneté
    expect(screen.getByText('−15')).toBeInTheDocument();
    expect(screen.getByText('−30')).toBeInTheDocument();
  });

  it('ne présente pas l’email comme un geste à faire : il est vérifié à l’inscription', async () => {
    const { container } = await vue();
    expect(container.textContent).not.toMatch(/depuis tes paramètres/i);
    expect(container.textContent).toMatch(/inscription/i);
  });

  it('ne promet pas une « vraie rencontre » : le code compte un match', async () => {
    const { container } = await vue();
    expect(container.textContent).not.toMatch(/rencontre confirmée/i);
  });

  it('dit qu’un signalement classé sans suite ne compte pas', async () => {
    const { container } = await vue();
    expect(container.textContent).toMatch(/sans suite/i);
  });

  it('ne parle jamais du check-in, coupé ou non (#483)', async () => {
    for (const checkin of [false, true]) {
      features = { ...features, checkin };
      const { container, unmount } = await vue();
      expect(container.textContent).not.toMatch(/check-in|en pause/i);
      unmount();
    }
  });

  it('explique le Cercle, qui compte dans le score quel que soit l’interrupteur', async () => {
    await vue();
    expect(screen.getByRole('heading', { name: /Cercle de Confiance/ })).toBeInTheDocument();
    expect(screen.getByText('Déclarer ton Cercle')).toBeInTheDocument();
  });

  it('montre La Place (+5) seulement quand elle est ouverte', async () => {
    const ouverte = await vue();
    expect(ouverte.container.textContent).toMatch(/La Place/);
    ouverte.unmount();

    features = { ...features, square: false };
    const { container } = await vue();
    expect(container.textContent).not.toMatch(/La Place/);
  });

  it('propose un lien retour vers /settings/trust', async () => {
    await vue();
    const link = screen.getByRole('link', { name: /mon niveau et mon Cercle/i });
    expect(link).toHaveAttribute('href', '/settings/trust');
  });

  it('utilise les tokens design (blush/coral), pas de gris brut de fond', async () => {
    const { container } = await vue();
    expect(container.innerHTML).toMatch(/bg-blush/);
    expect(container.innerHTML).not.toMatch(/bg-gray-\d00\b/);
  });
});
