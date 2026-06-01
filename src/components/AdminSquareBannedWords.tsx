'use client';

import { useState, useEffect, useCallback } from 'react';

interface BannedWord {
  id: string;
  word: string;
  severity: string;
  createdAt: string;
}

export default function AdminSquareBannedWords() {
  const [words, setWords] = useState<BannedWord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form
  const [newWord, setNewWord] = useState('');
  const [newSeverity, setNewSeverity] = useState('block');

  const perPage = 50;

  const fetchWords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
      });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/square/banned-words?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWords(data.words);
      setTotal(data.total);
    } catch {
      setError('Erreur lors du chargement des mots interdits.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const handleAdd = async () => {
    if (!newWord.trim()) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/square/banned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: newWord.trim(), severity: newSeverity }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setError('Ce mot est déjà dans la liste.');
        } else {
          throw new Error();
        }
        return;
      }
      setNewWord('');
      setSuccess('Mot ajouté avec succès.');
      fetchWords();
    } catch {
      setError("Erreur lors de l'ajout du mot.");
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/square/banned-words/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSuccess('Mot supprimé.');
      fetchWords();
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const severityLabel: Record<string, string> = {
    block: 'Bloquer',
    censor: 'Censurer',
  };

  const severityColor: Record<string, string> = {
    block: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    censor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Mots interdits</h2>

      {error && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>}
      {success && <div className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">{success}</div>}

      {/* Add form */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Nouveau mot interdit..."
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <select
          value={newSeverity}
          onChange={(e) => setNewSeverity(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="block">Bloquer</option>
          <option value="censor">Censurer</option>
        </select>
        <button
          onClick={handleAdd}
          className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
        >
          Ajouter
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Word list */}
      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : words.length === 0 ? (
        <p className="text-gray-500">Aucun mot interdit.</p>
      ) : (
        <div className="space-y-2">
          {words.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900 dark:text-gray-100">{w.word}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor[w.severity] ?? 'bg-gray-100 text-gray-700'}`}>
                  {severityLabel[w.severity] ?? w.severity}
                </span>
              </div>
              <button
                onClick={() => handleDelete(w.id)}
                className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600"
          >
            Précédent
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}