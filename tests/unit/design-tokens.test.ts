import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GLOBALS_CSS_PATH = path.join(ROOT, 'src/app/globals.css');
const COMPONENTS_DIR = path.join(ROOT, 'src/components');

// Tailwind v4 native palette families (declared by tailwindcss/theme.css) — always available,
// never need a matching entry in our own `@theme` block.
const NATIVE_COLOR_FAMILIES = [
  'gray', 'slate', 'zinc', 'neutral', 'stone', 'mauve', 'olive', 'mist', 'taupe',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const NATIVE_COLOR_KEYWORDS = ['black', 'white', 'transparent', 'current', 'inherit'];
const NATIVE_NON_COLOR_KEYWORDS = [
  // border sides / styles
  't', 'b', 'l', 'r', 'x', 'y', 'dashed', 'dotted', 'solid', 'double', 'hidden', 'none',
  // text/shadow size scale + alignment
  '2xs', 'xs', 'sm', 'md', 'lg', 'xl',
  '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
  'base', 'center', 'left', 'right',
];

const BORDER_SIDES = ['t', 'b', 'l', 'r', 'x', 'y'];

function isNativeColorName(name: string): boolean {
  if (NATIVE_COLOR_KEYWORDS.includes(name)) return true;
  return NATIVE_COLOR_FAMILIES.some(
    (family) => name === family || new RegExp(`^${family}-\\d{2,3}$`).test(name),
  );
}

// Strips a leading directional side (border-t-coral -> coral) so the remainder
// can be checked like any other color name, both against natives and @theme tokens.
function stripBorderSide(name: string): string {
  const side = BORDER_SIDES.find((s) => name.startsWith(`${s}-`));
  return side ? name.slice(side.length + 1) : name;
}

function isNativeToken(prefix: string, name: string): boolean {
  if (NATIVE_NON_COLOR_KEYWORDS.includes(name)) return true;
  if (prefix === 'bg' && /^gradient-to-[trbl]{1,2}$/.test(name)) return true; // bg-gradient-to-br etc.
  if (prefix === 'shadow') return false; // no native shadow-<name> beyond the size scale above
  return isNativeColorName(name);
}

function extractThemeBlock(css: string): string {
  const start = css.indexOf('@theme');
  if (start === -1) throw new Error('No @theme block found in globals.css');
  const openBrace = css.indexOf('{', start);
  let depth = 0;
  for (let i = openBrace; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(openBrace + 1, i);
    }
  }
  throw new Error('Unbalanced @theme block in globals.css');
}

function declaredTokens(themeBlock: string, namespace: 'color' | 'shadow'): Set<string> {
  const re = new RegExp(`--${namespace}-([a-zA-Z0-9-]+)\\s*:`, 'g');
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(themeBlock))) names.add(m[1]);
  return names;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

// Matches `bg-`, `text-`, `border-`, `shadow-` utilities (with any leading variant
// prefixes like `dark:`, `hover:`, `focus-visible:`), capturing the token name.
// Arbitrary-value classes (e.g. `shadow-[0_0_0_3px_...]`) never match since `[`
// isn't a valid leading token character.
const USAGE_RE = /(?:^|[\s"'`{])(?:[a-z-]+:)*(bg|text|border|shadow)-([a-zA-Z][a-zA-Z0-9-]*)/g;

interface Violation {
  file: string;
  prefix: string;
  token: string;
}

function findViolations(colorTokens: Set<string>, shadowTokens: Set<string>): Violation[] {
  const violations: Violation[] = [];
  for (const file of walk(COMPONENTS_DIR)) {
    const content = fs.readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = USAGE_RE.exec(content))) {
      const [, prefix, rawName] = m;
      const opacityStripped = rawName.split('/')[0]; // strip opacity modifier, e.g. bg-black/5
      const name = prefix === 'border' ? stripBorderSide(opacityStripped) : opacityStripped;
      if (isNativeToken(prefix, name)) continue;
      const known = prefix === 'shadow'
        ? shadowTokens.has(name)
        : colorTokens.has(name) || name === 'background' || name === 'foreground';
      if (!known) {
        violations.push({ file: path.relative(ROOT, file), prefix, token: opacityStripped });
      }
    }
  }
  return violations;
}

describe('design tokens (DESIGN.md <-> globals.css @theme)', () => {
  it('every color/shadow utility referenced by a shared component has a matching @theme token', () => {
    const css = fs.readFileSync(GLOBALS_CSS_PATH, 'utf8');
    const themeBlock = extractThemeBlock(css);
    const colorTokens = declaredTokens(themeBlock, 'color');
    const shadowTokens = declaredTokens(themeBlock, 'shadow');

    const violations = findViolations(colorTokens, shadowTokens);

    if (violations.length > 0) {
      const message = violations
        .map((v) => `  ${v.file}: \`${v.prefix}-${v.token}\` (missing --${v.prefix === 'shadow' ? 'shadow' : 'color'}-${v.token} in @theme)`)
        .join('\n');
      throw new Error(`Undeclared design tokens referenced by components:\n${message}`);
    }

    expect(violations).toEqual([]);
  });
});
