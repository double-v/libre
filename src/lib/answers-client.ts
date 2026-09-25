/**
 * Enregistrer ou retirer une réponse côté client (spec 009). La règle vit sur
 * le serveur : on relaie son message tel quel, sans la redoubler ici.
 */
import type { SerializedAnswer } from '@/lib/answers';

export type SaveAnswerResult = { ok: true; answer: SerializedAnswer } | { ok: false; error: string };

const ECHEC = 'L’enregistrement a échoué. Réessaie dans un instant.';

export async function saveAnswer(key: string, choices: string[], text: string): Promise<SaveAnswerResult> {
  try {
    const res = await fetch('/api/users/me/answers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, choices, text }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error ?? ECHEC };
    return { ok: true, answer: body.answer };
  } catch {
    return { ok: false, error: ECHEC };
  }
}

export async function removeAnswer(key: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/users/me/answers?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
