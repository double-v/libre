import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Garde de non-régression pour le scaffold Digital Asset Links (#196).
// Le fichier public/.well-known/assetlinks.json prouve la propriété du domaine
// à Android → enlève la barre d'URL de la TWA. On valide sa STRUCTURE (contrat
// Google), pas la valeur du fingerprint : le SHA-256 réel arrive à la génération
// de l'AAB et remplacera le placeholder sans casser ce test.
describe('assetlinks.json (Digital Asset Links, TWA Play Store)', () => {
  const file = path.resolve(process.cwd(), 'public/.well-known/assetlinks.json');
  const raw = readFileSync(file, 'utf-8');

  it('est un JSON valide', () => {
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('déclare au moins une cible android_app avec la relation handle_all_urls', () => {
    const statements = JSON.parse(raw) as Array<{
      relation: string[];
      target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
    }>;
    expect(Array.isArray(statements)).toBe(true);
    expect(statements.length).toBeGreaterThan(0);

    const [statement] = statements;
    expect(statement.relation).toContain('delegate_permission/common.handle_all_urls');
    expect(statement.target.namespace).toBe('android_app');
    expect(typeof statement.target.package_name).toBe('string');
    expect(statement.target.package_name.length).toBeGreaterThan(0);
    expect(Array.isArray(statement.target.sha256_cert_fingerprints)).toBe(true);
    expect(statement.target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
  });
});
