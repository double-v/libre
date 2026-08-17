/**
 * #198 — ce qui doit disparaître de l'appareil à la déconnexion.
 *
 * Le cache de messages en clair est le vrai point de fuite : sur un appareil
 * partagé, il rend les conversations lisibles à qui ouvre le navigateur après
 * coup, escrow ou pas.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { purgerSecretsLocaux } from '../session-cleanup';

beforeEach(() => localStorage.clear());

describe('purgerSecretsLocaux', () => {
  it('efface les messages en clair de toutes les conversations', () => {
    localStorage.setItem('libre_chat_cache_conv-1', '{"m1":"coucou"}');
    localStorage.setItem('libre_chat_cache_conv-2', '{"m2":"salut"}');

    purgerSecretsLocaux();

    expect(localStorage.getItem('libre_chat_cache_conv-1')).toBeNull();
    expect(localStorage.getItem('libre_chat_cache_conv-2')).toBeNull();
  });

  it('épargne les clés héritées — sur un compte d’avant l’escrow, ce sont peut-être les seules copies', () => {
    localStorage.setItem('libre_private_key', 'CHIFFRE_LOCAL');
    localStorage.setItem('libre_device_key', 'CLE_APPAREIL');

    purgerSecretsLocaux();

    expect(localStorage.getItem('libre_private_key')).toBe('CHIFFRE_LOCAL');
    expect(localStorage.getItem('libre_device_key')).toBe('CLE_APPAREIL');
  });

  it('laisse les préférences tranquilles', () => {
    localStorage.setItem('libre_theme_mode', 'dark');
    purgerSecretsLocaux();
    expect(localStorage.getItem('libre_theme_mode')).toBe('dark');
  });
});
