'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { NiveauFiabiliteTag, type Niveau } from '@/components/admin/AdminFiabilite';

interface UserRow {
  id: string;
  displayName: string;
  emailMasque: string;
  role: string;
  isBanned: boolean;
  isVerified: boolean;
  createdAt: string;
  lastActive: string;
  photoCount: number;
  niveau: Niveau;
  signauxRecents: number;
}

// Spec 010, US3 : filtrer et trier par indice de fiabilité.
const FILTRES: Array<{ valeur: '' | Niveau; libelle: string }> = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'douteux', libelle: 'Douteux' },
  { valeur: 'a_surveiller', libelle: 'À surveiller' },
  { valeur: 'fiable', libelle: 'Fiables' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [niveau, setNiveau] = useState<'' | Niveau>('');
  const [triFiabilite, setTriFiabilite] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: '20', search });
      if (niveau) params.set('niveau', niveau);
      if (triFiabilite) params.set('tri', 'fiabilite');
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      // error handled below
    } finally {
      setLoading(false);
    }
  }, [page, search, niveau, triFiabilite]);

  useEffect(() => {
    // Fetch au montage : IIFE async → aucun setState synchrone dans le corps
    // de l'effet (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await fetchUsers(); })();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-content">Utilisateurs</h1>
      <input
        type="search"
        placeholder="Rechercher par pseudo ou email…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="mb-4 w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-content shadow-sm focus:border-coral focus:outline-none focus:ring-coral"
      />
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par indice de fiabilité">
        {FILTRES.map((f) => (
          <button
            key={f.valeur || 'tous'}
            type="button"
            aria-pressed={niveau === f.valeur}
            onClick={() => { setNiveau(f.valeur); setPage(1); }}
            className={`min-h-11 rounded-full px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${niveau === f.valeur ? 'bg-coral text-white' : 'bg-fill-subtle text-content hover:bg-sunken'}`}
          >
            {f.libelle}
          </button>
        ))}
        <label className="ml-auto inline-flex min-h-11 items-center gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={triFiabilite}
            onChange={(e) => { setTriFiabilite(e.target.checked); setPage(1); }}
            className="h-4 w-4 accent-coral"
          />
          Les moins fiables d’abord
        </label>
      </div>
      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline">
                <tr>
                  <th className="px-3 py-2 font-medium text-muted">Pseudo</th>
                  <th className="px-3 py-2 font-medium text-muted">Email</th>
                  <th className="px-3 py-2 font-medium text-muted">Rôle</th>
                  <th className="px-3 py-2 font-medium text-muted">Statut</th>
                  <th className="px-3 py-2 font-medium text-muted">Fiabilité</th>
                  <th className="px-3 py-2 font-medium text-muted">Inscrit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-fill-subtle">
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${u.id}`} className="text-coral hover:underline">{u.displayName}</Link>
                    </td>
                    <td className="px-3 py-2 text-muted">{u.emailMasque}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-fill-subtle text-muted'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {u.isBanned ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">Banni</span>
                      ) : u.isVerified ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Vérifié</span>
                      ) : (
                        <span className="text-muted">Actif</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <NiveauFiabiliteTag niveau={u.niveau ?? 'fiable'} />
                      {u.signauxRecents > 0 && <span className="ml-2 text-xs text-muted">{u.signauxRecents} indice{u.signauxRecents > 1 ? 's' : ''}</span>}
                    </td>
                    <td className="px-3 py-2 text-muted">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-md border border-hairline-strong px-3 py-1 text-sm disabled:opacity-50">Précédent</button>
              <span className="px-3 py-1 text-sm text-muted">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-md border border-hairline-strong px-3 py-1 text-sm disabled:opacity-50">Suivant</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}