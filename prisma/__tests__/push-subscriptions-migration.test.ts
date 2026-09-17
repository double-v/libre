/**
 * Tests — migration `push_subscriptions` (#392, T044).
 *
 * La suppression de compte (FR-022) ne fait rien d'explicite pour les
 * abonnements push : elle repose sur `ON DELETE CASCADE`. Et l'`upsert` sur
 * `endpoint` (R15) repose sur l'index unique. Deux invariants portés par du SQL
 * manuscrit, jamais exécuté en local (base partagée) : on les lit ici, et on
 * vérifie que le schéma Prisma dit la même chose que la migration.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sql = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260917120000_add_push_subscriptions/migration.sql'),
  'utf8',
);
const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const model = schema.slice(schema.indexOf('model PushSubscription'));

describe('migration push_subscriptions', () => {
  it('cascade la suppression du compte', () => {
    expect(sql).toMatch(/REFERENCES "users"\("id"\) ON DELETE CASCADE/);
    expect(model).toMatch(/onDelete: Cascade/);
  });

  it('rend endpoint unique (upsert) et indexe userId (envoi)', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"\("endpoint"\)/);
    expect(sql).toMatch(/CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"\("userId"\)/);
    expect(model).toMatch(/endpoint\s+String\s+@unique/);
    expect(model).toMatch(/@@index\(\[userId\]\)/);
  });

  it('ne stocke ni contenu ni historique — seulement où envoyer', () => {
    const columns = [...sql.matchAll(/^\s+"(\w+)"\s+(?:UUID|TEXT|TIMESTAMP)/gm)].map((m) => m[1]);
    expect(columns).toEqual(['id', 'userId', 'endpoint', 'p256dh', 'auth', 'userAgent', 'createdAt', 'lastUsedAt']);
  });

  it('est additive et sans @map de colonne', () => {
    expect(sql).not.toMatch(/DROP|ALTER COLUMN/);
    // `@map` de colonne (un seul @) interdit ; `@@map` de table attendu.
    expect(model).not.toMatch(/(?<!@)@map\(/);
    expect(model).toMatch(/@@map\("push_subscriptions"\)/);
  });
});
