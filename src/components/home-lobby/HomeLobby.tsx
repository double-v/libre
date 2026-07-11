'use client';

import { useEffect, useRef, useState } from 'react';
import { lobbyFontVars } from '@/lib/fonts';
import LobbyThemeScript from './LobbyThemeScript';
import LobbyNav from './LobbyNav';
import LobbyHero from './LobbyHero';
import AmbientBand from './AmbientBand';
import LobbyHumans from './LobbyHumans';
import LobbySafety from './LobbySafety';
import LobbyClosing from './LobbyClosing';
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
  const [reducedMotion, setReducedMotion] = useState(false);

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

  // Détection reduced-motion (+ suivi des changements) pour le bandeau ambiant.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
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

      <LobbyHero userCount={userCount} />

      <AmbientBand reducedMotion={reducedMotion} />

      <LobbyHumans />
      <LobbySafety />
      <LobbyClosing />
    </div>
  );
}
