import { getDb } from '@/lib/db';
import { deletePhoto, isR2Configured } from '@/lib/r2';

/**
 * Effacer un compte entièrement : la ligne (la cascade SQL emporte profil,
 * likes, matchs, messages…) et ce qui vit sur R2, hors cascade — photos,
 * dérivés floutés, selfies de vérification (#142, #428). Sans ce passage,
 * « toutes vos données seront effacées » serait faux.
 *
 * Source unique pour la suppression par le membre, par l'admin, et pour la
 * purge des comptes en retrait jamais vérifiés (#437). Une panne du stockage
 * ne retient pas le compte : l'objet orphelin est journalisé, sans PII.
 */
export async function effacerCompte(userId: string): Promise<void> {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      profile: { select: { photos: true } },
      photoModerations: { select: { blurredKey: true } },
      verificationRequests: { select: { selfieUrl: true } },
    },
  });
  if (!user) return;

  // Le selfie est souvent une photo du profil, d'où l'ensemble.
  const cles = new Set<string>(user.profile?.photos ?? []);
  for (const { blurredKey } of user.photoModerations ?? []) cles.add(blurredKey);
  for (const { selfieUrl } of user.verificationRequests ?? []) {
    const cle = cleR2DepuisSelfieUrl(selfieUrl);
    if (cle) cles.add(cle);
  }
  if (cles.size > 0 && isR2Configured()) {
    await Promise.all(
      [...cles].map(async (key) => {
        try {
          await deletePhoto(key);
        } catch (error) {
          console.error('Account deletion — orphan photo left on R2:', key, error);
        }
      }),
    );
  }

  await db.user.delete({ where: { id: userId } });
}

/**
 * `selfieUrl` est validé à l'envoi comme un chemin `/api/photos/<userId>/…`,
 * relatif ou absolu selon l'époque : on ne garde que la clé R2 derrière.
 */
export function cleR2DepuisSelfieUrl(selfieUrl: string): string | null {
  const marqueur = '/api/photos/';
  const i = selfieUrl.indexOf(marqueur);
  if (i === -1) return null;
  const cle = selfieUrl.slice(i + marqueur.length).split(/[?#]/)[0];
  return cle ? decodeURIComponent(cle) : null;
}
