import { describe, it, expect } from 'vitest';
import { normalizeEmail } from '../email';

describe('normalizeEmail', () => {
  it('lowercases email', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('removes Gmail dots', () => {
    expect(normalizeEmail('u.s.e.r@gmail.com')).toBe('user@gmail.com');
  });

  it('removes Gmail +alias', () => {
    expect(normalizeEmail('user+tag@gmail.com')).toBe('user@gmail.com');
  });

  it('removes both dots and +alias for Gmail', () => {
    expect(normalizeEmail('u.s.e.r+work@gmail.com')).toBe('user@gmail.com');
  });

  it('normalizes googlemail.com to gmail.com', () => {
    expect(normalizeEmail('user@googlemail.com')).toBe('user@gmail.com');
  });

  it('does not remove dots for non-Gmail providers', () => {
    expect(normalizeEmail('user.name@yahoo.com')).toBe('user.name@yahoo.com');
  });

  it('does not remove +alias for non-Gmail providers', () => {
    expect(normalizeEmail('user+tag@outlook.com')).toBe('user+tag@outlook.com');
  });

  it('handles plain email without special chars', () => {
    expect(normalizeEmail('user@gmail.com')).toBe('user@gmail.com');
  });
});