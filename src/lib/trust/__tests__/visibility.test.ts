/**
 * Tests unitaires — publicBand (logique anti-stalk).
 */
import { describe, it, expect } from 'vitest';
import { publicBand } from '../visibility';

describe('publicBand', () => {
  describe('target = null → toujours newcomer', () => {
    it('newcomer viewer, null target → newcomer', () => {
      expect(publicBand('newcomer', null)).toBe('newcomer');
    });
    it('anchor viewer, null target → newcomer', () => {
      expect(publicBand('anchor', null)).toBe('newcomer');
    });
  });

  describe('anchor viewer → voit tout (rank+1 = 4 ≥ 3)', () => {
    it('anchor voit anchor', () => {
      expect(publicBand('anchor', 'anchor')).toBe('anchor');
    });
    it('anchor voit trusted', () => {
      expect(publicBand('anchor', 'trusted')).toBe('trusted');
    });
    it('anchor voit member', () => {
      expect(publicBand('anchor', 'member')).toBe('member');
    });
    it('anchor voit newcomer', () => {
      expect(publicBand('anchor', 'newcomer')).toBe('newcomer');
    });
  });

  describe('trusted viewer → voit anchor max (rank+1 = 3 = anchor)', () => {
    it('trusted voit trusted', () => {
      expect(publicBand('trusted', 'trusted')).toBe('trusted');
    });
    it('trusted voit anchor (rank+1 = anchor)', () => {
      // Spec : viewer+1 = max visible. trusted+1 = anchor, donc anchor reste visible.
      expect(publicBand('trusted', 'anchor')).toBe('anchor');
    });
    it('trusted voit member', () => {
      expect(publicBand('trusted', 'member')).toBe('member');
    });
    it('trusted voit newcomer', () => {
      expect(publicBand('trusted', 'newcomer')).toBe('newcomer');
    });
  });

  describe('member viewer → voit trusted max (rank+1 = 2 = trusted)', () => {
    it('member voit trusted', () => {
      expect(publicBand('member', 'trusted')).toBe('trusted');
    });
    it('member ne voit PAS anchor (clamp à trusted)', () => {
      expect(publicBand('member', 'anchor')).toBe('trusted');
    });
    it('member voit member', () => {
      expect(publicBand('member', 'member')).toBe('member');
    });
    it('member voit newcomer', () => {
      expect(publicBand('member', 'newcomer')).toBe('newcomer');
    });
  });

  describe('newcomer viewer → voit member max (rank+1 = 1 = member)', () => {
    it('newcomer ne voit PAS trusted (clamp à member)', () => {
      expect(publicBand('newcomer', 'trusted')).toBe('member');
    });
    it('newcomer ne voit PAS anchor (clamp à member)', () => {
      expect(publicBand('newcomer', 'anchor')).toBe('member');
    });
    it('newcomer voit member', () => {
      expect(publicBand('newcomer', 'member')).toBe('member');
    });
    it('newcomer voit newcomer', () => {
      expect(publicBand('newcomer', 'newcomer')).toBe('newcomer');
    });
  });

  describe('cas limite : rank+1 dépasse anchor (anchor viewer)', () => {
    it('anchor viewer + anchor target → anchor (max visible atteint)', () => {
      expect(publicBand('anchor', 'anchor')).toBe('anchor');
    });
  });
});
