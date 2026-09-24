/**
 * Harnais commun des tests de routes du journal (spec 007) : session admin,
 * base factice, revalidation observée. Importé **avant** la route testée.
 */
import { vi } from 'vitest';
import { randomUUID } from 'crypto';

export const ADMIN = randomUUID();

export const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

export const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({ __esModule: true, revalidatePath: mockRevalidatePath }));

export const fakeDb = {
  user: { findUnique: vi.fn() },
  journalPost: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  moderationLog: { create: vi.fn<(args: { data: Record<string, unknown> }) => Promise<object>>(async () => ({})) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

export function reinitialiser() {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ADMIN, email: 'a@x.fr' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  fakeDb.moderationLog.create.mockResolvedValue({});
}

export function nonAdmin() {
  fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
}

export const json = (body: unknown, method = 'POST') =>
  new Request('http://x/api/admin/journal', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

export const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

export const BROUILLON = {
  id: 'p1', slug: null, titre: 'Titre', corps: 'Corps propre.', statut: 'brouillon',
  publieeAt: null, modifieeAt: new Date('2026-09-25T10:00:00Z'), createdAt: new Date('2026-09-25T09:00:00Z'),
  auteurId: ADMIN, commentsOpen: false,
};
