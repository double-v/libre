'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import PrivacyTip from '@/components/PrivacyTip';

const TURNSTILE_LOAD_TIMEOUT = 5000;

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileBlocked, setTurnstileBlocked] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    let id = localStorage.getItem('libre_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('libre_device_id', id);
    }
    setDeviceId(id);
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    const timer = setTimeout(() => {
      if (!turnstileToken) setTurnstileBlocked(true);
    }, TURNSTILE_LOAD_TIMEOUT);
    return () => clearTimeout(timer);
  }, [siteKey, turnstileToken]);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/discover');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        Chargement…
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password, turnstileToken: turnstileToken ?? undefined, deviceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'inscription, veuillez réessayer');
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-coral focus:outline-none focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-coral-light';

  const canSubmit = !loading && (!siteKey || !!turnstileToken || turnstileBlocked);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Créer un compte</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gratuit. Sans limites.</p>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {turnstileBlocked && !turnstileToken && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Le captcha de sécurité n&apos;a pas pu se charger. Cela arrive souvent avec les bloqueurs de publicités. Vous pouvez quand même créer votre compte — si le problème persiste, essayez de désactiver temporairement votre bloqueur.
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label="Formulaire d'inscription" className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            Pseudo
          </label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
            placeholder="Un pseudo qui vous ressemble"
          />
          <PrivacyTip tip="Un pseudo, c'est plus safe qu'un vrai nom. Vos matches ne verront que ça." />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="vous@exemple.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            aria-describedby="password-requirements"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Minimum 8 caractères"
          />
          <p id="password-requirements" className="mt-1 text-xs text-gray-600 dark:text-gray-400">8 caractères min, avec majuscule, minuscule et chiffre</p>
        </div>

        {siteKey && (
          <Turnstile
            siteKey={siteKey}
            onSuccess={(token) => {
              setTurnstileToken(token);
              setTurnstileBlocked(false);
            }}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileBlocked(true)}
          />
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
        >
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-coral hover:text-terracotta">
          Se connecter
        </Link>
      </p>
    </div>
  );
}