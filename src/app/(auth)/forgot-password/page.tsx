'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

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
        <h1 className="text-2xl font-bold text-content">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-muted">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {sent ? (
        <Alert variant="success" title="Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.">
          Vérifiez votre boîte de réception (et les spams) dans quelques minutes.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-coral hover:text-terracotta">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
