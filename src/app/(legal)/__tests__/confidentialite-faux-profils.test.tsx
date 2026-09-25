/**
 * Tests — Confidentialité, lutte contre les faux profils (spec 006, T027).
 *
 * Corollaire de #328 : la copie promet deux choses, on vérifie aussi que le
 * code les tient — la lecture des photos ne sort pas de nos serveurs, et
 * aucune décision n'est prise sans un admin.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Confidentialite from '@/app/(legal)/confidentialite/page';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('page Confidentialité — faux profils', () => {
  it('nomme la finalité, sa base légale, et l’absence de décision automatique', () => {
    render(<Confidentialite />);
    expect(screen.getAllByText(/Lutte contre les faux profils/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/protéger les utilisateurs des arnaques/)).toBeInTheDocument();
    expect(screen.getByText(/vos photos ne sont transmises à aucun tiers/)).toBeInTheDocument();
    expect(screen.getByText(/aucune sanction automatique/).textContent).toMatch(/un membre de l.équipe, qui décide lui-même/);
  });

  it('les empreintes : un nombre, pas l’image ; celles des bannis gardées un an', () => {
    render(<Confidentialite />);
    expect(screen.getByText(/une empreinte de chaque photo/).textContent).toMatch(/ne permet pas de reconstituer/);
    // Ce que la base garde vraiment : un entier, jamais d'image.
    const schema = read('prisma/schema.prisma');
    const modele = schema.slice(schema.indexOf('model BannedPhotoFingerprint'), schema.indexOf('}', schema.indexOf('model BannedPhotoFingerprint')));
    expect(modele).toMatch(/hash\s+BigInt/);
    expect(modele).not.toMatch(/photoKey|url|Bytes/);
    expect(read('src/lib/retention/regles.ts')).toMatch(/empreintesBannies[^\n]*jours: 365/);
  });

  it('la lecture des photos n’appelle aucun service extérieur', () => {
    const src = read('src/lib/fraude/lecture-photo.ts');
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).toMatch(/langPath: cheminModele\(\)/);
  });

  it('les décisions passent par un admin, jamais par un signal', () => {
    expect(read('src/app/api/admin/profils-a-verifier/[userId]/route.ts')).toMatch(/requireAdmin\(\)/);
    // Lire `isBanned` pour filtrer est permis ; écrire une sanction ne l'est pas.
    for (const f of ['src/lib/fraude/signaux.ts', 'src/lib/fraude/analyse.ts']) {
      expect(read(f), f).not.toMatch(/data:\s*\{[^}]*(isBanned|retraitAt)/);
      expect(read(f), f).not.toMatch(/user\.update/);
    }
  });
});
