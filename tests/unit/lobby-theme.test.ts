import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_LOBBY_THEME,
  LOBBY_STORAGE_KEY,
  LOBBY_THEME_IDS,
  LOBBY_THEMES,
  LOBBY_NOFLASH_SCRIPT,
  isLobbyTheme,
  readStoredLobbyTheme,
  storeLobbyTheme,
} from '@/components/home-lobby/lobby-theme';

describe('lobby-theme', () => {
  beforeEach(() => {
    localStorage.removeItem(LOBBY_STORAGE_KEY);
  });

  it('défaut = cartoon, clé de storage dédiée (jamais libre-theme/libre-skin)', () => {
    expect(DEFAULT_LOBBY_THEME).toBe('cartoon');
    expect(LOBBY_STORAGE_KEY).toBe('libre-lobby-theme');
    expect(LOBBY_THEME_IDS).toEqual(['cartoon', 'arcade', 'retro']);
    expect(LOBBY_THEMES.map((t) => t.id)).toEqual(['cartoon', 'arcade', 'retro']);
  });

  it('isLobbyTheme valide uniquement les 3 ids', () => {
    expect(isLobbyTheme('cartoon')).toBe(true);
    expect(isLobbyTheme('arcade')).toBe(true);
    expect(isLobbyTheme('retro')).toBe(true);
    expect(isLobbyTheme('libre')).toBe(false);
    expect(isLobbyTheme(null)).toBe(false);
    expect(isLobbyTheme(undefined)).toBe(false);
  });

  it('readStoredLobbyTheme retombe sur le défaut si absent ou invalide', () => {
    expect(readStoredLobbyTheme()).toBe('cartoon');
    localStorage.setItem(LOBBY_STORAGE_KEY, 'nawak');
    expect(readStoredLobbyTheme()).toBe('cartoon');
  });

  it('storeLobbyTheme persiste et readStoredLobbyTheme relit', () => {
    storeLobbyTheme('retro');
    expect(localStorage.getItem(LOBBY_STORAGE_KEY)).toBe('retro');
    expect(readStoredLobbyTheme()).toBe('retro');
  });

  it('le script no-flash cible currentScript.parentElement et la bonne clé', () => {
    expect(LOBBY_NOFLASH_SCRIPT).toContain('currentScript.parentElement');
    expect(LOBBY_NOFLASH_SCRIPT).toContain(LOBBY_STORAGE_KEY);
    expect(LOBBY_NOFLASH_SCRIPT).toContain('data-lobby');
    // n'utilise ni la clé de mode ni celle de skin
    expect(LOBBY_NOFLASH_SCRIPT).not.toContain('libre-theme');
    expect(LOBBY_NOFLASH_SCRIPT).not.toContain('libre-skin');
  });
});
