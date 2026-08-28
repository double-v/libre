/**
 * Tests de la purge des secrets de messagerie à la déconnexion (#368).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { clearChatSecrets } from '../chat-secrets';

describe('clearChatSecrets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('supprime la clé privée, publique et device', () => {
    localStorage.setItem('libre_private_key', 'pk');
    localStorage.setItem('libre_public_key', 'pub');
    localStorage.setItem('libre_device_key', 'dev');
    clearChatSecrets();
    expect(localStorage.getItem('libre_private_key')).toBeNull();
    expect(localStorage.getItem('libre_public_key')).toBeNull();
    expect(localStorage.getItem('libre_device_key')).toBeNull();
  });

  it('supprime tous les caches de conversation en clair', () => {
    localStorage.setItem('libre_chat_cache_abc', 'cache1');
    localStorage.setItem('libre_chat_cache_def', 'cache2');
    localStorage.setItem('libre_other', 'keep');
    clearChatSecrets();
    expect(localStorage.getItem('libre_chat_cache_abc')).toBeNull();
    expect(localStorage.getItem('libre_chat_cache_def')).toBeNull();
    expect(localStorage.getItem('libre_other')).toBe('keep');
  });

  it('ne lève pas si localStorage est inaccessible', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: () => { throw new Error('blocked'); },
        key: () => null,
        length: 0,
      },
      writable: true,
      configurable: true,
    });
    expect(() => clearChatSecrets()).not.toThrow();
    Object.defineProperty(window, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});
