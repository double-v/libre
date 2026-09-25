/**
 * Enregistrement du pseudo côté client (#459) — partagé par l'écran `/pseudo`
 * et la section des Paramètres. La règle vit sur le serveur : on relaie son
 * message tel quel, sans la redoubler ici.
 */
export type SavePseudoResult = { ok: true; displayName: string } | { ok: false; error: string };

export async function savePseudo(displayName: string): Promise<SavePseudoResult> {
  try {
    const res = await fetch('/api/users/me/pseudo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error ?? 'Une erreur est survenue, réessaie.' };
    return { ok: true, displayName: body.displayName ?? displayName };
  } catch {
    return { ok: false, error: 'Une erreur est survenue, réessaie.' };
  }
}
