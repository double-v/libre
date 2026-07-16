'use client';

import { useEffect, useState } from 'react';
import { SiteNavView } from '@/components/ui/SiteNav';
import LobbyHero from './LobbyHero';
import AmbientBand from './AmbientBand';
import LobbyHumans from './LobbyHumans';
import LobbySafety from './LobbySafety';
import LobbyClosing from './LobbyClosing';
import LobbyFooter from './LobbyFooter';

interface HomeLobbyProps {
  /** Compteur d'utilisateurs (SSR). Non exploité par le shell ; branché au HERO (#246). */
  userCount?: number;
}

/**
 * Racine de la landing « lobby » (épic #243).
 *
 * L'ambiance (hero ambiant sombre-chaud) est portée par `data-lobby` +
 * les classes `.lobby-*` de `globals.css`. La **nav** est désormais la barre
 * unifiée `SiteNav` (épic #273) : `[data-lobby]` surcharge les tokens `--nav-*`
 * en instance **always-dark**, donc la barre reprend le look `LobbyNav` historique
 * sans nav bespoke (variante `guest` — contexte invité). Le **thème** n'est plus
 * un axe séparé : il suit le thème global (`html[data-theme]`) — les tokens
 * `--lobby-*` cascadent depuis `html[data-theme]`. La landing **n'expose aucun sélecteur**
 * (thème = défaut du site) ; le choix du thème vit dans les Paramètres (app) et
 * le ThemeMenu de l'admin. Plus de switcher lobby, plus de clé `libre-lobby-theme`,
 * plus de script no-flash local : le script de `layout.tsx` pose déjà
 * `data-theme` avant paint. `data-lobby` est un simple marqueur constant.
 */
export default function HomeLobby({ userCount }: HomeLobbyProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  // Détection reduced-motion (+ suivi des changements) pour le bandeau ambiant.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <div
      data-lobby
      // overflow-x: clip (et non hidden) → clippe les débordements sans créer de
      // scroll-container, pour que la nav `position: sticky` colle au viewport.
      style={{ minHeight: '100vh', position: 'relative', overflowX: 'clip' }}
    >
      <SiteNavView variant="guest" width="content" />

      <main id="main-content">
        <LobbyHero userCount={userCount} />

        <AmbientBand reducedMotion={reducedMotion} />

        <LobbyHumans />
        <LobbySafety />
        <LobbyClosing />
      </main>

      <LobbyFooter />
    </div>
  );
}
