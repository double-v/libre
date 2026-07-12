'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import TurnstileProvider from '@/components/TurnstileProvider';
import PrivacyTip from '@/components/PrivacyTip';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

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
  // Device id créé/lu au premier rendu client via l'initialiseur paresseux de
  // useState (pas d'effet → pas de setState-in-effect). Non rendu dans le JSX,
  // donc aucun risque d'écart d'hydratation ('' côté serveur).
  const [deviceId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('libre_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('libre_device_id', id);
    }
    return id;
  });
  const [consentGiven, setConsentGiven] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

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
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
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
        body: JSON.stringify({ displayName, email, password, turnstileToken: turnstileToken ?? undefined, deviceId, consentGiven }),
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

  const canSubmit = !loading && consentGiven && (!siteKey || !!turnstileToken || turnstileBlocked);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-content">Créer un compte</h1>
        <p className="mt-1 text-sm text-muted">Gratuit. Sans limites.</p>
      </div>

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {turnstileBlocked && !turnstileToken && (
        <Alert variant="warning">
          Le captcha de sécurité n&apos;a pas pu se charger. Cela arrive souvent avec les bloqueurs de publicités. Vous pouvez quand même créer votre compte — si le problème persiste, essayez de désactiver temporairement votre bloqueur.
        </Alert>
      )}

      <form onSubmit={handleSubmit} aria-label="Formulaire d'inscription" className="space-y-4">
        <div>
          <Input
            id="displayName"
            type="text"
            label="Pseudo"
            required
            autoComplete="username"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Un pseudo qui vous ressemble"
          />
          <PrivacyTip tip="Un pseudo, c'est plus safe qu'un vrai nom. Vos matches ne verront que ça." />
        </div>

        <Input
          id="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
        />

        <Input
          id="password"
          type="password"
          label="Mot de passe"
          required
          autoComplete="new-password"
          hint="8 caractères min, avec majuscule, minuscule et chiffre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 caractères"
        />

        {siteKey && (
          <TurnstileProvider
            siteKey={siteKey}
            onSuccess={(token) => {
              setTurnstileToken(token);
              setTurnstileBlocked(false);
            }}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileBlocked(true)}
          />
        )}

        <div className="flex items-start gap-2">
          <input
            id="consent"
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-hairline-strong text-coral focus:ring-coral"
            required
          />
          <label htmlFor="consent" className="text-xs leading-snug text-muted">
            J&apos;accepte les{' '}
            <Link href="/cgu" className="text-coral hover:underline">Conditions générales d&apos;utilisation</Link>
            {' '}et la{' '}
            <Link href="/confidentialite" className="text-coral hover:underline">Politique de confidentialité</Link>
            . Le traitement de mes données est conforme au RGPD.
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          loading={loading}
        >
          {loading ? 'Création…' : 'Créer mon compte'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-coral hover:text-terracotta">
          Se connecter
        </Link>
      </p>
    </div>
  );
}