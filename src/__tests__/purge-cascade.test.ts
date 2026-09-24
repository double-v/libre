/**
 * #202 — rompre un match ou supprimer son compte détruit vraiment la messagerie.
 *
 * La politique promet que les messages partent avec le match (blocage) et avec
 * le compte. Deux maillons portent cette promesse : la route qui supprime la
 * ligne parente, et la clé étrangère qui propage. On n'a pas de base réelle en
 * CI ; on lit donc les **migrations** — ce que la prod applique — plutôt que
 * `schema.prisma`, qui peut dériver de la base sans rien casser (cf. #188).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Fk = { table: string; colonne: string; cible: string; onDelete: string };

/** Rejoue les migrations dans l'ordre et rend l'état final des clés étrangères. */
function clesEtrangeres(): Map<string, Fk> {
  const dossier = join(process.cwd(), 'prisma/migrations');
  const fks = new Map<string, Fk>();
  const instruction =
    /ALTER TABLE "(\w+)" ADD CONSTRAINT "(\w+)" FOREIGN KEY \("(\w+)"\) REFERENCES "(\w+)"\("\w+"\)(?: ON DELETE (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION))?|ALTER TABLE "\w+" DROP CONSTRAINT (?:IF EXISTS )?"(\w+)"|DROP TABLE (?:IF EXISTS )?"(\w+)"/g;
  for (const migration of readdirSync(dossier).filter((d) => /^\d/.test(d)).sort()) {
    const sql = readFileSync(join(dossier, migration, 'migration.sql'), 'utf8')
      .replace(/--.*$/gm, '')
      .replace(/\s+/g, ' ');
    for (const m of sql.matchAll(instruction)) {
      if (m[2]) fks.set(m[2], { table: m[1], colonne: m[3], cible: m[4], onDelete: m[5] ?? 'NO ACTION' });
      else if (m[6]) fks.delete(m[6]);
      else if (m[7]) for (const [nom, fk] of fks) if (fk.table === m[7]) fks.delete(nom);
    }
  }
  return fks;
}

function fk(fks: Map<string, Fk>, table: string, colonne: string): Fk | undefined {
  return [...fks.values()].find((f) => f.table === table && f.colonne === colonne);
}

describe('cascade dans les migrations', () => {
  const fks = clesEtrangeres();

  it('rompre un match emporte la conversation, qui emporte ses messages', () => {
    expect(fk(fks, 'conversations', 'matchId')).toMatchObject({ cible: 'matches', onDelete: 'CASCADE' });
    expect(fk(fks, 'messages', 'conversationId')).toMatchObject({ cible: 'conversations', onDelete: 'CASCADE' });
  });

  it('supprimer un compte emporte ses matchs, conversations, messages, clés et coffre', () => {
    for (const [table, colonne] of [
      ['matches', 'userA'], ['matches', 'userB'],
      ['conversations', 'userA'], ['conversations', 'userB'],
      ['messages', 'senderId'],
      // Le coffre : la clé privée chiffrée par escrow vit dans `user_keys`.
      ['user_keys', 'userId'],
      ['user_key_history', 'userId'],
    ]) {
      expect(fk(fks, table, colonne), `${table}.${colonne}`).toMatchObject({ cible: 'users', onDelete: 'CASCADE' });
    }
  });

  it('aucune clé vers users ne bloque la suppression d’un compte', () => {
    // Une FK en RESTRICT/NO ACTION ferait échouer `user.delete` : le compte
    // resterait, messages compris, derrière une erreur 500.
    const bloquantes = [...fks.entries()]
      .filter(([, f]) => f.cible === 'users' && !['CASCADE', 'SET NULL'].includes(f.onDelete))
      .map(([nom]) => nom);
    expect(bloquantes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Les routes suppriment bien la ligne parente — sans elle, la cascade ne part pas.
// ---------------------------------------------------------------------------

const ME = '11111111-1111-4111-8111-111111111111';
const PAIR = '22222222-2222-4222-8222-222222222222';

const fakeDb = {
  block: { findUnique: vi.fn(), create: vi.fn() },
  match: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  user: { findUnique: vi.fn(), delete: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
vi.mock('@/lib/auth', () => ({ __esModule: true, authOptions: {} }));
vi.mock('@/lib/r2', () => ({ __esModule: true, deletePhoto: vi.fn(), isR2Configured: () => false }));
vi.mock('next-auth', () => ({ __esModule: true, getServerSession: vi.fn(async () => ({ user: { id: ME } })) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('routes qui déclenchent la cascade', () => {
  it('bloquer rompt le match dans les deux sens', async () => {
    fakeDb.block.findUnique.mockResolvedValue(null);
    const { POST } = await import('@/app/api/blocks/route');
    const res = await POST(new Request('http://x/api/blocks', { method: 'POST', body: JSON.stringify({ blockedId: PAIR }) }));
    expect(res.status).toBe(201);
    expect(fakeDb.match.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ userA: ME, userB: PAIR }, { userA: PAIR, userB: ME }] },
    });
  });

  it('supprimer son compte supprime la ligne users (pas un effacement logique)', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ passwordHash: null, profile: null, photoModerations: [], verificationRequests: [] });
    const { DELETE } = await import('@/app/api/users/me/route');
    const res = await DELETE(new Request('http://x/api/users/me', { method: 'DELETE', body: '{}' }));
    expect(res.status).toBe(204);
    expect(fakeDb.user.delete).toHaveBeenCalledWith({ where: { id: ME } });
  });
});
