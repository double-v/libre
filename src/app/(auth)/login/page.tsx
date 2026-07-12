'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Suspense } from 'react';
import TurnstileProvider from '@/components/TurnstileProvider';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

const TURNSTILE_LOAD_TIMEOUT = 5000;

function LoginForm() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileBlocked, setTurnstileBlocked] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    const timer = setTimeout(() => {
      if (!turnstileToken) setTurnstileBlocked(true);
    }, TURNSTILE_LOAD_TIMEOUT);
    return () => clearTimeout(timer);
  }, [siteKey, turnstileToken]);

  const justRegistered = searchParams.get('registered') === 'true';
  const justVerified = searchParams.get('verified') === 'true';
  const errorParam = searchParams.get('error');
  const sessionExpired = errorParam === 'session_expiree';
  const accountBanned = errorParam === 'account_banned';
  const callbackUrlRaw = searchParams.get('callbackUrl') || '/discover';
  // Defense-in-depth: only allow relative paths starting with `/` (and not
  // protocol-relative `//evil.com`). The NextAuth `redirect` callback does
  // the authoritative check, but sanitizing here avoids round-tripping a
  // malicious URL through signIn() in the first place.
  const callbackUrl =
    callbackUrlRaw.startsWith('/') && !callbackUrlRaw.startsWith('//')
      ? callbackUrlRaw
      : '/discover';

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

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
        } else if (result.error === 'ACCOUNT_BANNED') {
          setError('Votre compte a été suspendu. Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.');
        } else {
          setError('Email ou mot de passe incorrect');
        }
        return;
      }

      router.push(callbackUrl);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: string) {
    await signIn(provider, { callbackUrl });
  }

  const canSubmit = !loading && (!siteKey || !!turnstileToken || turnstileBlocked);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-content">Se connecter</h1>
      </div>

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {unverifiedEmail && (
        <Alert variant="warning" title="Votre email n'est pas encore vérifié.">
          <p>Vérifiez votre boîte de réception (et les spams).</p>
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/auth/send-verification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: unverifiedEmail }),
                });
                setResendSent(true);
              }}
              className="text-sm font-medium text-coral hover:text-terracotta"
              disabled={resendSent}
            >
              {resendSent ? 'Email renvoyé ! Vérifiez votre boîte de réception.' : "Renvoyer l'email de vérification"}
            </button>
          </div>
        </Alert>
      )}

      {justVerified && (
        <Alert variant="success">Email vérifié ! Vous pouvez maintenant vous connecter.</Alert>
      )}

      {errorParam === 'invalid-token' && (
        <Alert variant="error">Le lien de vérification est invalide ou a expiré.</Alert>
      )}

      {sessionExpired && (
        <Alert variant="info" title="Votre session a expiré">
          Pour votre sécurité, nous vous demandons de vous reconnecter. Vos
          informations sont intactes.
        </Alert>
      )}

      {accountBanned && (
        <Alert variant="error" title="Votre compte a été suspendu">
          Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez
          le support à <a href="mailto:support@getlibre.fr" className="underline">support@getlibre.fr</a>.
        </Alert>
      )}

      {justRegistered && (
        <Alert variant="success">Inscription réussie ! Connectez-vous avec vos identifiants.</Alert>
      )}

      {searchParams.get('reset') === 'success' && (
        <Alert variant="success">Mot de passe réinitialisé ! Connectez-vous avec votre nouveau mot de passe.</Alert>
      )}

      {turnstileBlocked && !turnstileToken && (
        <Alert variant="warning">
          Le captcha de sécurité n&apos;a pas pu se charger. Cela arrive souvent avec les bloqueurs de publicités. Vous pouvez quand même vous connecter — si le problème persiste, essayez de désactiver temporairement votre bloqueur.
        </Alert>
      )}

      <form onSubmit={handleSubmit} aria-label="Formulaire de connexion" className="space-y-4">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Votre mot de passe"
        />

        {siteKey && (
          <TurnstileProvider
            siteKey={siteKey}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileBlocked(true)}
          />
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          loading={loading}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-coral hover:text-terracotta">
          Créer un compte
        </Link>
      </p>

      <p className="text-center text-sm text-muted">
        <Link href="/forgot-password" className="font-medium text-coral hover:text-terracotta">
          Mot de passe oublié ?
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