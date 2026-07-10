'use client';

import { useEffect, useRef, useState } from 'react';
import { lobbyFontVars } from '@/lib/fonts';
import LobbyThemeScript from './LobbyThemeScript';
import LobbyNav from './LobbyNav';
import {
  DEFAULT_LOBBY_THEME,
  readStoredLobbyTheme,
  storeLobbyTheme,
  type LobbyThemeId,
} from './lobby-theme';

interface HomeLobbyProps {
  /** Compteur d'utilisateurs (SSR). Non exploité par le shell ; branché au HERO (#246). */
  userCount?: number;
}

/**
 * Racine de la landing « lobby » (épic #243).
 *
 * En construction, ticket par ticket : NAV (#245) posée, HERO (#246) et suivants
 * remplaceront le shell provisoire ci-dessous. Cutover sur `/` au #250.
 *
 * No-flash / hydratation : `data-lobby` est rendu avec le défaut SSR (`cartoon`)
 * + `suppressHydrationWarning` ; `LobbyThemeScript` (premier enfant) réécrit
 * l'attribut avant paint depuis le storage. `data-lobby` n'est **jamais** relié à
 * l'état React (valeur littérale constante) : React ne le réécrit pas, donc la
 * valeur posée par le script/switcher survit aux re-rendus. L'état `theme` ne
 * sert qu'à l'affichage actif du switcher.
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

  const handleThemeChange = (id: LobbyThemeId) => {
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
      // overflow-x: clip (et non hidden) → clippe les débordements sans créer de
      // scroll-container, pour que la nav `position: sticky` colle au viewport.
      style={{ minHeight: '100vh', position: 'relative', overflowX: 'clip' }}
    >
      <LobbyThemeScript />

      <LobbyNav themeValue={theme} onThemeChange={handleThemeChange} />

      {/* --- Shell provisoire : remplacé par le HERO réel (#246) puis les sections suivantes --- */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
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
          Rencontrer devrait <span style={{ color: 'var(--lobby-accent)' }}>pas</span>{' '}
          coûter les yeux de la tête. 🫶
        </h1>
        <p style={{ color: 'var(--lobby-text-dim)', fontSize: 16, lineHeight: 1.6, margin: '0 0 28px' }}>
          Shell provisoire : la nav ci-dessus est posée (#245). Le HERO réel et les
          sections suivantes arrivent aux tickets suivants de l&apos;épic #243.
        </p>

        {/* Démo : carte-panneau (panel-bg + card-border + shadow + radius) */}
        <div
          style={{
            background: 'var(--lobby-panel-bg)',
            border: 'var(--lobby-card-border)',
            borderRadius: 'var(--lobby-radius-lg)',
            boxShadow: 'var(--lobby-shadow)',
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
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
