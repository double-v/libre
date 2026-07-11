import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AmbientBand from '@/components/home-lobby/AmbientBand';

function band(container: HTMLElement) {
  const el = container.querySelector('.lobby-band');
  if (!el) throw new Error('bande introuvable');
  return el as HTMLElement;
}

describe('AmbientBand', () => {
  it('est décoratif (aria-hidden) et rend 4 personnages', () => {
    const { container } = render(<AmbientBand skyMode="day" />);
    expect(band(container)).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.lobby-critter__body')).toHaveLength(4);
  });

  it('anime marche + skyline quand le mouvement est autorisé', () => {
    const { container } = render(<AmbientBand reducedMotion={false} skyMode="day" />);
    const html = band(container).innerHTML;
    expect(html).toContain('lobbyCritterWalk');
    expect(html).toContain('lobbySkylineScroll');
  });

  it('reduced-motion : aucune animation, personnages statiques conservés', () => {
    const { container } = render(<AmbientBand reducedMotion skyMode="day" />);
    const html = band(container).innerHTML;
    expect(html).not.toContain('lobbyCritterWalk');
    expect(html).not.toContain('lobbySkylineScroll');
    expect(html).not.toContain('lobbyStarTwinkle');
    expect(html).not.toContain('lobbyCritterBubble');
    // les personnages restent présents (settle statique, pas de disparition)
    expect(container.querySelectorAll('.lobby-critter__body')).toHaveLength(4);
  });

  it('ciel : oiseaux le jour, aucun oiseau la nuit ; étoiles la nuit', () => {
    const day = render(<AmbientBand skyMode="day" />);
    expect(band(day.container).innerHTML).toContain('lobbyBirdDrift');

    const night = render(<AmbientBand skyMode="night" />);
    const nightHtml = band(night.container).innerHTML;
    expect(nightHtml).not.toContain('lobbyBirdDrift');
    // étoiles présentes la nuit (twinkle animé)
    expect(nightHtml).toContain('lobbyStarTwinkle');
  });
});
