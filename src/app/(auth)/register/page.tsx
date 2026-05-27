'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PrivacyTip from '@/components/PrivacyTip';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.details ? Object.values(data.details).flat().join(' ') : 'Erreur lors de l\'inscription');
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Créer un compte</h1>
        <p className="mt-1 text-sm text-gray-500">Gratuit. Pour toujours.</p>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label="Formulaire d'inscription" className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
            Pseudo
          </label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            placeholder="Un pseudo qui vous ressemble"
          />
          <PrivacyTip tip="Un pseudo, c'est plus safe qu'un vrai nom. Vos matches ne verront que ça." />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            placeholder="vous@exemple.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            aria-describedby="password-requirements"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            placeholder="Minimum 8 caractères"
          />
          <p id="password-requirements" className="mt-1 text-xs text-gray-500">8 caractères min, avec majuscule, minuscule et chiffre</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Se connecter
        </Link>
      </p>
    </div>
  );
}