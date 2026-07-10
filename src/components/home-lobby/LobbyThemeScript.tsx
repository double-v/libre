import { LOBBY_NOFLASH_SCRIPT } from './lobby-theme';

/**
 * Script no-flash du thème lobby. À rendre en **premier enfant** du conteneur
 * racine du lobby (`data-lobby`) : il applique le thème stocké avant le premier
 * paint, sans flash de la valeur SSR par défaut. Cf. `lobby-theme.ts`.
 */
export default function LobbyThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: LOBBY_NOFLASH_SCRIPT }} />;
}
