'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const inputClass = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-coral focus:outline-none focus:ring-coral dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-coral-light';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Erreur lors de l\'envoi, veuillez réessayer.');
        return;
      }

      setSent(true);
    } catch {
      setError('Erreur réseau, veuillez vérifier votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {sent ? (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <p className="font-medium">Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.</p>
          <p className="mt-1">Vérifiez votre boîte de réception (et les spams) dans quelques minutes.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="font-medium text-coral hover:text-terracotta">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
