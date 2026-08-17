import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { rateLimit, limits } from '@/lib/rate-limit';
import {
  escrowDisponible,
  wrapPrivateKey,
  publiqueCorrespondALaPrivee,
} from '@/lib/crypto-escrow';

async function isValidECDHPublicKey(base64: string): Promise<boolean> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    await crypto.subtle.importKey(
      'spki',
      bytes.buffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`api:${session.user.id}`, limits.api.limit, limits.api.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json();
    const { publicKey, privateKey } = body;

    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: { publicKey: ['Required and must be a string'] } },
        { status: 400 },
      );
    }

    if (!(await isValidECDHPublicKey(publicKey))) {
      return NextResponse.json(
        { error: 'Invalid public key: must be a valid SPKI ECDH P-256 key' },
        { status: 400 },
      );
    }

    // Une clé publique déjà enregistrée ne s'écrase pas. C'est LE geste qui a
    // détruit des historiques : l'`upsert` d'origine remplaçait la clé sans en
    // garder trace, et tout ce qui avait été chiffré pour l'ancienne devenait
    // illisible. Une vraie rotation viendra par un chemin explicite (#199).
    const existante = await getDb().userKey.findUnique({
      where: { userId: session.user.id },
      select: { publicKey: true },
    });
    if (existante && existante.publicKey !== publicKey) {
      return NextResponse.json({ error: 'cle_deja_enregistree' }, { status: 409 });
    }

    let encryptedPrivateKey: string | undefined;
    if (typeof privateKey === 'string' && privateKey.length > 0) {
      if (!publiqueCorrespondALaPrivee(publicKey, privateKey)) {
        // Sceller une privée qui n'ouvre pas cette publique empoisonnerait le
        // coffre : le compte garderait une clé publique valide, recevrait des
        // messages, et ne pourrait plus jamais les lire.
        return NextResponse.json({ error: 'cle_non_appariee' }, { status: 400 });
      }
      if (!escrowDisponible()) {
        return NextResponse.json({ error: 'escrow_indisponible' }, { status: 503 });
      }
      encryptedPrivateKey = wrapPrivateKey(privateKey, session.user.id);
    }

    const escrow = encryptedPrivateKey
      ? { encryptedPrivateKey, escrowedAt: new Date() }
      : {};

    await getDb().userKey.upsert({
      where: { userId: session.user.id },
      update: { publicKey, ...escrow },
      create: {
        userId: session.user.id,
        publicKey,
        ...escrow,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('User key update error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}