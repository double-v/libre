import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, beforeAll, vi } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('libre-theme');
  });

  it('renders the toggle button', () => {
    render(<ThemeToggle />);
    const button = screen.getByLabelText('Changer le thème');
    expect(button).toBeInTheDocument();
  });

  it('toggles dark class on html element on click', () => {
    render(<ThemeToggle />);
    const button = screen.getByLabelText('Changer le thème');

    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists theme in localStorage', () => {
    render(<ThemeToggle />);
    const button = screen.getByLabelText('Changer le thème');

    fireEvent.click(button);
    expect(localStorage.getItem('libre-theme')).toBe('dark');

    fireEvent.click(button);
    expect(localStorage.getItem('libre-theme')).toBe('light');
  });
});