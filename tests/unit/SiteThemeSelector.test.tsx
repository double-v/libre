import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SiteThemeSelector from '@/components/admin/SiteThemeSelector';
import { SITE_THEMES } from '@/lib/site-themes';

function getRadio(id: string): HTMLInputElement {
  // The label wraps the input without htmlFor, so getByLabelText can miss.
  // Query by name+value which is unambiguous here.
  return screen.getByDisplayValue(id) as HTMLInputElement;
}

describe('SiteThemeSelector', () => {
  it('renders a radio for each registered theme', () => {
    render(<SiteThemeSelector current="default" onChange={() => {}} />);
    for (const t of SITE_THEMES) {
      expect(getRadio(t.id)).toBeInTheDocument();
    }
  });

  it('marks the current theme as checked', () => {
    const current = SITE_THEMES[1].id;
    render(<SiteThemeSelector current={current} onChange={() => {}} />);
    expect(getRadio(current).checked).toBe(true);
  });

  it('calls onChange with the new theme id when a different radio is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SiteThemeSelector current="default" onChange={onChange} />);

    const next = SITE_THEMES[1];
    await user.click(getRadio(next.id));
    expect(onChange).toHaveBeenCalledWith(next.id);
  });

  it('shows a description hint per theme', () => {
    render(<SiteThemeSelector current="default" onChange={() => {}} />);
    for (const t of SITE_THEMES) {
      expect(screen.getByText(t.description)).toBeInTheDocument();
    }
  });
});
