/**
 * Thèmes « lobby » de la landing publique (épic #243).
 *
 * Axe de thème **distinct** des skins app (`data-theme`) et du mode (`.dark`) :
 * porté par `data-lobby` sur le seul conteneur racine du lobby, persisté sous une
 * clé dédiée, jamais mêlé à `libre-theme` / `libre-skin`.
 * Cf. DESIGN.md § Theming — Axe 3.
 */

export const LOBBY_THEME_IDS = ['cartoon', 'arcade', 'retro'] as const;
export type LobbyThemeId = (typeof LOBBY_THEME_IDS)[number];

export const DEFAULT_LOBBY_THEME: LobbyThemeId = 'cartoon';
export const LOBBY_STORAGE_KEY = 'libre-lobby-theme';

/** Ordre + libellés affichés par le switcher. */
export const LOBBY_THEMES: readonly { id: LobbyThemeId; label: string }[] = [
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'retro', label: 'Rétro 8-bit' },
];

export function isLobbyTheme(value: unknown): value is LobbyThemeId {
  return (
    typeof value === 'string' &&
    (LOBBY_THEME_IDS as readonly string[]).includes(value)
  );
}

/** Thème stocké (ou défaut). Sûr côté serveur et si le storage est indisponible. */
export function readStoredLobbyTheme(): LobbyThemeId {
  if (typeof window === 'undefined') return DEFAULT_LOBBY_THEME;
  try {
    const stored = window.localStorage.getItem(LOBBY_STORAGE_KEY);
    return isLobbyTheme(stored) ? stored : DEFAULT_LOBBY_THEME;
  } catch {
    return DEFAULT_LOBBY_THEME;
  }
}

/** Persiste le thème lobby. Ignore silencieusement un storage indisponible. */
export function storeLobbyTheme(id: LobbyThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOBBY_STORAGE_KEY, id);
  } catch {
    /* mode privé / quota : on n'échoue jamais pour un réglage cosmétique */
  }
}

/**
 * Script no-flash : posé en **premier enfant** du conteneur lobby, il lit le
 * thème stocké et pose `data-lobby` sur son parent AVANT le premier paint —
 * via `document.currentScript.parentElement`. Même patron que le script mode/skin
 * de `layout.tsx`. Les valeurs sont inlinées en dur (le script tourne hors bundle
 * TS) mais restent alignées sur LOBBY_STORAGE_KEY / LOBBY_THEME_IDS ci-dessus.
 */
export const LOBBY_NOFLASH_SCRIPT =
  `(function(){try{var e=document.currentScript.parentElement;` +
  `var t=localStorage.getItem('${LOBBY_STORAGE_KEY}');` +
  `if(t==='cartoon'||t==='arcade'||t==='retro')e.setAttribute('data-lobby',t);}catch(e){}})()`;
