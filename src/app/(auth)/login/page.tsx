'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const justRegistered = searchParams.get('registered') === 'true';
  const justVerified = searchParams.get('verified') === 'true';
  const errorParam = searchParams.get('error');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        turnstileToken: turnstileToken ?? '',
      });

      if (result?.error) {
        if (result.error === 'EMAIL_NOT_VERIFIED') {
          setError('Veuillez vérifier votre email avant de vous connecter.');
          setUnverifiedEmail(email);
        } else {
          setError('Email ou mot de passe incorrect');
        }
        return;
      }

      router.push('/discover');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: string) {
    await signIn(provider, { callbackUrl: '/discover' });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Se connecter</h1>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {unverifiedEmail && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/auth/send-verification', { method: 'POST' });
              setResendSent(true);
            }}
            className="text-sm font-medium text-coral hover:text-terracotta"
            disabled={resendSent}
          >
            {resendSent ? 'Email renvoyé !' : "Renvoyer l'email de vérification"}
          </button>
        </div>
      )}

      {justVerified && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Email vérifié ! Vous pouvez maintenant vous connecter.
        </div>
      )}

      {errorParam === 'invalid-token' && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Le lien de vérification est invalide ou a expiré.
        </div>
      )}

      {justRegistered && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Inscription réussie ! Connectez-vous avec vos identifiants.
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label="Formulaire de connexion" className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-800">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-coral focus:outline-none focus:ring-coral"
            placeholder="vous@exemple.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-800">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-coral focus:outline-none focus:ring-coral"
            placeholder="Votre mot de passe"
          />
        </div>

        {siteKey && (
          <Turnstile
            siteKey={siteKey}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
        )}

        <button
          type="submit"
          disabled={loading || (!!siteKey && !turnstileToken)}
          className="w-full rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-coral hover:text-terracotta">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}