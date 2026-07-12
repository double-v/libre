'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  // État dérivé du token (dans l'URL) → calculé au rendu, pas dans un effet.
  const tokenError = token ? '' : 'Lien de réinitialisation manquant ou invalide.';

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
        <h1 className="text-2xl font-bold text-content">Nouveau mot de passe</h1>
      </div>

      {tokenError && (
        <Alert variant="error" title={tokenError}>
          <div className="mt-2 text-center">
            <Link href="/forgot-password" className="font-medium text-coral hover:text-terracotta">
              Demander un nouveau lien
            </Link>
          </div>
        </Alert>
      )}

      {done && (
        <Alert variant="success" title="Mot de passe mis à jour !">
          <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <div className="mt-3 text-center">
            <Button
              variant="primary"
              onClick={() => router.push('/login?reset=success')}
            >
              Se connecter
            </Button>
          </div>
        </Alert>
      )}

      {!done && !tokenError && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error">{error}</Alert>
          )}

          <Input
            id="password"
            type="password"
            label="Nouveau mot de passe"
            required
            autoComplete="new-password"
            hint="8 caractères min, avec majuscule, minuscule et chiffre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 caractères min, majuscule, minuscule, chiffre"
          />

          <Input
            id="confirm"
            type="password"
            label="Confirmer le mot de passe"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Répétez le mot de passe"
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
          </Button>
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
