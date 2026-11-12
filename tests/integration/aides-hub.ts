/**
 * Comptes factices des tests du hub Membres (spec 012, lot 2).
 *
 * Chaque fichier tire son propre préfixe : les fichiers d'intégration tournent
 * en parallèle sur la même base, et aucun ne doit voir ni effacer les comptes
 * d'un autre. Domaine réservé `.test`, aucune donnée réelle.
 */
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { normalizeEmail } from '@/lib/email';

export function prefixe(nom: string): string {
  return `${nom}-${randomUUID().slice(0, 8)}`;
}

export interface CompteFactice {
  pseudo: string;
  role?: 'USER' | 'ADMIN';
  isBanned?: boolean;
  isVerified?: boolean;
  emailVerified?: Date | null;
  retraitAt?: Date | null;
  verifInviteeAt?: Date | null;
  createdAt?: Date;
  lastSeenAt?: Date | null;
  deviceId?: string | null;
  photos?: string[];
}

/** Crée un compte et son profil ; l'adresse dérive du pseudo, en minuscules. */
export async function creerCompte(p: string, c: CompteFactice): Promise<string> {
  const email = `${p}-${c.pseudo}@exemple.test`.toLowerCase();
  const u = await getDb().user.create({
    data: {
      email,
      normalizedEmail: normalizeEmail(email),
      displayName: c.pseudo,
      role: c.role ?? 'USER',
      isBanned: c.isBanned ?? false,
      isVerified: c.isVerified ?? false,
      emailVerified: c.emailVerified === undefined ? new Date('2026-11-01T10:00:00Z') : c.emailVerified,
      retraitAt: c.retraitAt ?? null,
      verifInviteeAt: c.verifInviteeAt ?? null,
      deviceId: c.deviceId ?? null,
      lastSeenAt: c.lastSeenAt ?? null,
      ...(c.createdAt ? { createdAt: c.createdAt } : {}),
      profile: { create: { photos: c.photos ?? [], orientation: [], relationshipType: [], interests: [] } },
    },
    select: { id: true },
  });
  return u.id;
}

/** Efface les comptes du préfixe ; la cascade emporte leurs cas et leur journal. */
export async function effacerPrefixe(p: string): Promise<void> {
  await getDb().user.deleteMany({ where: { email: { startsWith: `${p}-`.toLowerCase() } } });
}
