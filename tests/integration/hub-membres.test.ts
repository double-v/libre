// @vitest-environment node
/**
 * Hub Membres de la spec 012 (lot 2) sur un vrai PostgreSQL.
 *
 * Un seul fichier, des morceaux importés : Vitest joue les fichiers en
 * parallèle sur la même base, et les compteurs du hub sont globaux. Réunis
 * ici, les gestes, la liste, la fiche et la suppression s'exécutent l'un après
 * l'autre et ne faussent pas les comptes les uns des autres.
 *
 * Seules les frontières qu'on ne contrôle pas sont simulées : la session
 * (next-auth), le stockage R2, le push et `after()`.
 */
import { vi } from 'vitest';

vi.mock('next-auth', async () => {
  const { session } = await import('./aides-hub');
  return { __esModule: true, default: vi.fn(), getServerSession: vi.fn(async () => (session.id ? { user: { id: session.id } } : null)) };
});
vi.mock('@/lib/r2', async () => {
  const { r2Effaces } = await import('./aides-hub');
  return {
    ...(await vi.importActual<typeof import('@/lib/r2')>('@/lib/r2')),
    deletePhoto: async (k: string) => { r2Effaces.push(k); },
    isR2Configured: () => false,
  };
});
vi.mock('@/lib/push/server', async () => ({
  ...(await vi.importActual<typeof import('@/lib/push/server')>('@/lib/push/server')),
  sendPushToUser: async () => {},
}));
vi.mock('next/server', async () => ({
  ...(await vi.importActual<typeof import('next/server')>('next/server')),
  after: () => {},
}));

import './hub/gestes.cas';
import './hub/liste.cas';
import './hub/fiche.cas';
