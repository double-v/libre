'use client';

import { useEffect, useRef, useState } from 'react';
import { lobbyFontVars } from '@/lib/fonts';
import LobbyThemeScript from './LobbyThemeScript';
import LobbyThemeSwitcher from './LobbyThemeSwitcher';
import {
  DEFAULT_LOBBY_THEME,
  readStoredLobbyTheme,
  storeLobbyTheme,
  type LobbyThemeId,
} from './lobby-theme';

interface HomeLobbyProps {
  /** Compteur d'utilisateurs (SSR). Non exploité par le shell #244 ; branché au HERO (#246). */
  userCount?: number;
}

/**
 * Racine de la landing « lobby » (épic #243).
 *
 * **PR #244 (foundation)** : shell minimal validant les fondations (polices
 * `next/font`, tokens des 3 thèmes, switcher, no-flash, reduced-motion). Les
 * sections réelles (NAV, HERO, bandeau ambiant, contenu persisté…) arrivent dans
 * les PRs suivantes ; le shell ci-dessous est provisoire et sera remplacé.
 *
 * No-flash / hydratation : `data-lobby` est rendu avec le défaut SSR
 * (`cartoon`) + `suppressHydrationWarning`. `LobbyThemeScript` (premier enfant)
 * réécrit l'attribut avant paint depuis le storage. On ne relie **jamais**
 * `data-lobby` à l'état React (valeur littérale constante) : React ne le
 * réécrit donc pas, et la valeur posée impérativement par le switcher/script
 * survit aux re-rendus. L'état `theme` ne sert qu'à l'affichage actif du switcher.
 */
export default function HomeLobby({ userCount }: HomeLobbyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<LobbyThemeId>(DEFAULT_LOBBY_THEME);

  // Après hydratation : aligner l'état du switcher sur ce que le script no-flash
  // a déjà appliqué (ou le storage), sans provoquer de flash.
  useEffect(() => {
    const applied = rootRef.current?.dataset.lobby;
    setTheme(
      applied === 'cartoon' || applied === 'arcade' || applied === 'retro'
        ? applied
        : readStoredLobbyTheme(),
    );
  }, []);

  const handleChange = (id: LobbyThemeId) => {
    storeLobbyTheme(id);
    if (rootRef.current) rootRef.current.dataset.lobby = id;
    setTheme(id);
  };

  return (
    <div
      ref={rootRef}
      data-lobby={DEFAULT_LOBBY_THEME}
      suppressHydrationWarning
      className={lobbyFontVars}
      style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}
    >
      <LobbyThemeScript />

      {/* --- Shell provisoire #244 : preview des fondations (remplacé par les vraies sections) --- */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--lobby-font-head)',
              fontWeight: 700,
              fontSize: 22,
              color: 'var(--lobby-text)',
            }}
          >
            Libre · fondations lobby
          </span>
          <LobbyThemeSwitcher value={theme} onChange={handleChange} />
        </header>

        <p
          style={{
            fontFamily: 'var(--lobby-font-eyebrow)',
            fontSize: 10,
            letterSpacing: '0.02em',
            color: 'var(--lobby-gold)',
            marginBottom: 20,
          }}
        >
          ✦ Aperçu des tokens du thème {theme}
        </p>

        <h1
          style={{
            fontFamily: 'var(--lobby-font-head)',
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.1,
            margin: '0 0 12px',
            color: 'var(--lobby-text)',
          }}
        >
          Matcher devrait <span style={{ color: 'var(--lobby-accent)' }}>pas</span>{' '}
          coûter les yeux de la tête. 🫶
        </h1>
        <p style={{ color: 'var(--lobby-text-dim)', fontSize: 16, lineHeight: 1.6, margin: '0 0 28px' }}>
          Ce shell provisoire sert à valider les fondations #244 (polices, tokens
          des 3 thèmes, switcher, no-flash, reduced-motion). Les sections réelles
          arrivent aux tickets suivants.
        </p>

        {/* Démo : carte-panneau (panel-bg + card-border + shadow + radius) */}
        <div
          style={{
            background: 'var(--lobby-panel-bg)',
            border: 'var(--lobby-card-border)',
            borderRadius: 'var(--lobby-radius-lg)',
            boxShadow: 'var(--lobby-shadow)',
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {/* CTA (accent + btn-clip + cta-shadow) */}
            <button
              type="button"
              style={{
                background: 'var(--lobby-accent)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 22px',
                borderRadius: 'var(--lobby-radius-sm)',
                clipPath: 'var(--lobby-btn-clip)',
                boxShadow: 'var(--lobby-cta-shadow)',
                cursor: 'pointer',
              }}
            >
              Rejoindre la bande
            </button>
            {/* Chip (bg-elev + chip-border) */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--lobby-text)',
                background: 'var(--lobby-bg-elev)',
                border: 'var(--lobby-chip-border)',
                padding: '8px 13px',
                borderRadius: 999,
              }}
            >
              💳 Gratuit
            </span>
            {userCount ? (
              <span style={{ color: 'var(--lobby-text-dim)', fontSize: 13 }}>
                {userCount.toLocaleString('fr-FR')} inscrit·es
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
