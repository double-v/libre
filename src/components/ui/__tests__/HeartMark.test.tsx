/**
 * Tests — HeartMark, glyphe cœur de référence unique de la marque (#294, épic #273).
 * Verrouille la forme de référence (path unique, pas les rayons de l'ancien
 * cœur-soleil) et le comportement décoratif/theme-aware.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import HeartMark from '../HeartMark';

const HEART_D =
  'M12 21s-7.5-4.6-10-9.3C.4 8.1 2 4 6 4c2.2 0 3.8 1.3 6 3.7C14.2 5.3 15.8 4 18 4c4 0 5.6 4.1 4 7.7C19.5 16.4 12 21 12 21z';

describe('<HeartMark /> — glyphe de référence (#294)', () => {
  it('rend le cœur de référence (path unique, viewBox 24, currentColor)', () => {
    const { container } = render(<HeartMark />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'currentColor');
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveAttribute('d', HEART_D);
    // l'ancien cœur-soleil avait 5 <rect> de rayons — plus aucun.
    expect(container.querySelectorAll('rect')).toHaveLength(0);
  });

  it('est décoratif par défaut (aria-hidden) et transmet className + props SVG', () => {
    const { container } = render(<HeartMark className="h-8 w-8" width={18} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('h-8', 'w-8');
    expect(svg).toHaveAttribute('width', '18');
  });
});
