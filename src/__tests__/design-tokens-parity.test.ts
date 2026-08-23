/**
 * Garde de parité home ↔ app — le langage visuel du lobby promu en couche
 * sémantique (#282, épic #273, prérequis de #347).
 *
 * `lobby-confinement.test.ts` interdit de **copier** l'ambiance home hors de la
 * home. Ce test-ci vérifie le mouvement inverse, celui qui rend cette interdiction
 * tenable : les tokens sémantiques (theme-aware, clair × sombre × 5 skins) sont
 * **calibrés sur** leurs homologues `--lobby-*`, au lieu que chaque surface
 * recopie une valeur au jugé. Les deux gardes se complètent — l'une ferme la
 * porte du copier-coller, l'autre garantit qu'on n'en a pas besoin.
 *
 * On lit `globals.css` en texte : c'est la seule source de vérité des tokens, et
 * un test de classes Tailwind ne verrait pas une valeur qui dérive. Cf.
 * DESIGN.md § Theming et § Échelle de largeurs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CSS = stripComments(
  readFileSync(path.resolve(__dirname, '..', 'app', 'globals.css'), 'utf8'),
);

/** Retire les commentaires CSS — ils contiennent des accolades et des exemples. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Corps d'un bloc CSS repéré par son sélecteur **en début de ligne**. */
function blockOf(selector: string): string {
  const start = CSS.search(new RegExp(`^${escapeRe(selector)}\\s*\\{`, 'm'));
  if (start === -1) throw new Error(`bloc CSS introuvable : ${selector}`);
  const open = CSS.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === '{') depth += 1;
    else if (CSS[i] === '}') {
      depth -= 1;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  throw new Error(`bloc CSS non refermé : ${selector}`);
}

/** Valeur d'une déclaration dans un corps de bloc, ou `null` si absente. */
function decl(block: string, prop: string): string | null {
  const m = block.match(new RegExp(`(?:^|;)\\s*${escapeRe(prop)}\\s*:\\s*([^;]+);`, 'm'));
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/**
 * Valeur *effective* d'un token pour un skin × mode : on parcourt la chaîne de
 * cascade réelle et on garde la dernière définition. Un bloc sombre n'est qu'un
 * delta (« un thème = un delta », DESIGN.md) — chercher le token dans le seul
 * bloc sombre donnerait un faux négatif sur tout ce qui hérite du clair.
 */
function effective(chain: string[], prop: string): string | null {
  let value: string | null = null;
  for (const selector of chain) {
    const found = decl(blockOf(selector), prop);
    if (found !== null) value = found;
  }
  return value;
}

/** Les 5 skins × 2 modes, avec leur chaîne de cascade et leur bloc lobby. */
const SKINS = [
  { id: 'libre', light: [':root', "[data-theme='libre']"], darkExtra: ':root.dark', lobby: '[data-lobby]' },
  { id: 'libre-warm', light: [':root', "[data-theme='libre-warm']"], darkExtra: "html[data-theme='libre-warm'].dark", lobby: '[data-lobby]' },
  { id: 'cartoon', light: [':root', "[data-theme='cartoon']"], darkExtra: "[data-theme='cartoon'].dark", lobby: '[data-lobby]' },
  { id: 'arcade', light: [':root', "[data-theme='arcade']"], darkExtra: "[data-theme='arcade'].dark", lobby: "html[data-theme='arcade'] [data-lobby]" },
  { id: 'retro', light: [':root', "[data-theme='retro']"], darkExtra: "[data-theme='retro'].dark", lobby: "html[data-theme='retro'] [data-lobby]" },
] as const;

/** Les 10 déclinaisons, aplaties — chaque token doit résoudre sur chacune. */
const VARIANTS = SKINS.flatMap((skin) => [
  { name: `${skin.id} clair`, chain: [...skin.light], lobby: skin.lobby },
  { name: `${skin.id} sombre`, chain: [...skin.light, skin.darkExtra], lobby: skin.lobby },
]);

/**
 * Longueurs d'une `box-shadow` (`0 18px 40px -12px …` → `['0','18px','40px','-12px']`).
 * Le rayon de flou est la 3e — c'est lui qui porte la *profondeur*, indépendamment
 * de la teinte (déjà corail) et du caractère (glow arcade, ombre dure retro).
 */
function shadowLengths(shadow: string): string[] {
  return shadow.replace(/(rgba?|color-mix|var)\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean);
}

function blurRadius(shadow: string): string {
  return shadowLengths(shadow)[2] ?? '0';
}

describe('parité home ↔ app — tokens sémantiques calibrés sur --lobby-* (#282)', () => {
  describe('1. rayon de carte aligné sur --lobby-radius-lg', () => {
    it.each(VARIANTS)('$name : --rad-card == --lobby-radius-lg du skin', ({ chain, lobby }) => {
      const radCard = effective(chain, '--rad-card');
      const lobbyRadius = decl(blockOf(lobby), '--lobby-radius-lg');
      expect(radCard).not.toBeNull();
      expect(radCard).toBe(lobbyRadius);
    });
  });

  describe('2. profondeur d’ombre alignée sur --lobby-shadow', () => {
    it('--shadow-soft / --shadow-pop passent par une indirection var() (donc skinnables)', () => {
      // Un littéral dans `@theme inline` est figé à la compilation : il ne peut
      // PAS re-skinner (cf. DESIGN.md § Contrat de tokens sémantiques). C'est
      // exactement le bug qui avait figé l'accent corail.
      const theme = blockOf('@theme inline');
      expect(decl(theme, '--shadow-soft')).toBe('var(--elev-soft)');
      expect(decl(theme, '--shadow-pop')).toBe('var(--elev-pop)');
    });

    it.each(VARIANTS)('$name : --elev-pop a la profondeur de --lobby-shadow', ({ chain, lobby }) => {
      const pop = effective(chain, '--elev-pop');
      const lobbyShadow = decl(blockOf(lobby), '--lobby-shadow');
      expect(pop).not.toBeNull();
      expect(blurRadius(pop!)).toBe(blurRadius(lobbyShadow!));
    });

    it.each(VARIANTS)('$name : --elev-soft est défini et moins profond que --elev-pop', ({ chain }) => {
      const soft = effective(chain, '--elev-soft');
      const pop = effective(chain, '--elev-pop');
      expect(soft).not.toBeNull();
      const px = (v: string) => parseFloat(v) || 0;
      expect(px(blurRadius(soft!))).toBeLessThanOrEqual(px(blurRadius(pop!)));
    });
  });

  describe('3. panneau vitré theme-aware (modèle --nav-bg)', () => {
    it.each(VARIANTS)('$name : --panel-bg / --panel-border / --panel-blur résolvent', ({ chain }) => {
      expect(effective(chain, '--panel-bg')).not.toBeNull();
      expect(effective(chain, '--panel-border')).not.toBeNull();
      expect(effective(chain, '--panel-blur')).not.toBeNull();
    });

    it('expose bordure et flou dans @theme inline, avec indirection var()', () => {
      const theme = blockOf('@theme inline');
      expect(decl(theme, '--color-panel-border')).toBe('var(--panel-border)');
      expect(decl(theme, '--blur-panel')).toBe('var(--panel-blur)');
    });

    it('.panel-glass ne consomme que des tokens (aucune couleur littérale)', () => {
      const glass = blockOf('.panel-glass');
      expect(glass).toContain('var(--panel-bg)');
      expect(glass).toContain('backdrop-filter');
      // Safari : le préfixe -webkit- reste nécessaire (comme sur .lobby-steps).
      expect(glass).toContain('-webkit-backdrop-filter');
      expect(glass).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(glass).not.toMatch(/\brgba?\(/);
    });
  });

  describe('4. échelle de largeurs complète', () => {
    it('déclare les cinq échelons, wide (1180) et bleed (1400) compris', () => {
      const theme = blockOf('@theme inline');
      expect(decl(theme, '--container-bleed')).toBe('1400px');
      expect(decl(theme, '--container-wide')).toBe('1180px');
      expect(decl(theme, '--container-content')).toBe('1080px');
      expect(decl(theme, '--container-reading')).toBe('720px');
    });

    it('la home consomme ces échelons au lieu de recopier 1180 / 1400', () => {
      expect(decl(blockOf('.lobby-hero__inner'), 'max-width')).toBe('var(--container-wide)');
      expect(decl(blockOf('.lobby-band'), 'max-width')).toBe('var(--container-bleed)');
      expect(decl(blockOf('.lobby-section__inner'), 'max-width')).toBe('var(--container-content)');
    });
  });

  describe('5. rythme de section tokenisé', () => {
    it('déclare le pas vertical, la gouttière et le gap de grille', () => {
      const theme = blockOf('@theme inline');
      expect(decl(theme, '--spacing-section')).toBe('72px');
      expect(decl(theme, '--spacing-gutter')).toBe('24px');
      expect(decl(theme, '--spacing-grid')).toBe('20px');
    });

    it('la home consomme le rythme au lieu de le recopier', () => {
      expect(decl(blockOf('.lobby-section'), 'padding')).toBe(
        'var(--spacing-section) var(--spacing-gutter)',
      );
      expect(decl(blockOf('.lobby-humans__grid'), 'gap')).toBe('var(--spacing-grid)');
    });
  });

  describe('garde-fou — le confinement lobby n’est pas contourné', () => {
    it('les tokens promus ne réintroduisent pas les valeurs always-dark du lobby', () => {
      // `--lobby-bg` & co restent sombres par design : un token sémantique qui
      // pointerait dessus rendrait l'app always-dark (cf. issue #282, « ce qui
      // interdit le copier-coller »).
      for (const prop of ['--panel-bg', '--panel-border', '--elev-soft', '--elev-pop']) {
        for (const { name, chain } of VARIANTS) {
          const value = effective(chain, prop);
          expect(String(value ?? ""), `${name} · ${prop}`).not.toMatch(/var\(--lobby-/);
        }
      }
    });
  });
});
