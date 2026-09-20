/**
 * Envoi d'une photo de profil — le même appel que la page profil, extrait
 * pour que le parcours d'accueil (spec 005) passe par la même route, les
 * mêmes contraintes (6 photos, formats, modération) et la même
 * auto-déclaration (#332), sans dupliquer la mécanique multipart.
 */

export type UploadPhotoResult =
  | { ok: true; photos: string[]; photo: string }
  | { ok: false; error: string };

export const UPLOAD_PHOTO_FALLBACK_ERROR = "Erreur lors de l'envoi";

export async function uploadPhoto(
  file: File,
  opts: { sensitive?: boolean } = {},
): Promise<UploadPhotoResult> {
  const formData = new FormData();
  formData.append('photo', file);
  if (opts.sensitive) formData.append('sensitivity', 'suggestive');
  try {
    const res = await fetch('/api/users/photos', { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || UPLOAD_PHOTO_FALLBACK_ERROR };
    return { ok: true, photos: data.photos ?? [], photo: data.photo ?? '' };
  } catch {
    return { ok: false, error: UPLOAD_PHOTO_FALLBACK_ERROR };
  }
}
