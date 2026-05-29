'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenError('Lien de réinitialisation manquant ou invalide.');
    }
  }, [token]);

  const inputClass = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-coral focus:outline-none focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-coral-light';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('8 caractères min, avec majuscule, minuscule et chiffre.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
        return;
      }

      setDone(true);
    } catch {
      setError('Erreur réseau, veuillez vérifier votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nouveau mot de passe</h1>
      </div>

      {tokenError && (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {tokenError}
          <div className="mt-2 text-center">
            <Link href="/forgot-password" className="font-medium text-coral hover:text-terracotta">
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      )}

      {done && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <p className="font-medium">Mot de passe mis à jour !</p>
          <p className="mt-1">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <div className="mt-3 text-center">
            <button
              onClick={() => router.push('/login?reset=success')}
              className="inline-block rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta"
            >
              Se connecter
            </button>
          </div>
        </div>
      )}

      {!done && !tokenError && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="8 caractères min, majuscule, minuscule, chiffre"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              placeholder="Répétez le mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {loading ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
