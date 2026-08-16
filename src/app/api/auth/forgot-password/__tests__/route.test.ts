/**
 * Garde de non-régression sur POST /api/auth/forgot-password (#334).
 *
 * Le flux échouait en silence : la route répondait « un lien a été envoyé »
 * dans trois cas où rien n'était envoyé, et un échec d'envoi consommait
 * quand même le quota horaire — trois tentatives suffisaient à verrouiller
 * un compte pendant une heure derrière un message de succès.
 *
 * Ces tests figent le contrat : la réponse reste uniforme (pas d'énumération
 * d'emails), mais chaque sortie sans envoi est tracée, et un envoi raté ne
 * laisse pas de jeton derrière lui.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// === Mocks ===

vi.mock('@/lib/email', () => ({
  __esModule: true,
  normalizeEmail: (e: string) => e.toLowerCase(),
}));

vi.mock('@/lib/client-ip', () => ({
  __esModule: true,
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 19, resetAt: Date.now() + 60_000 }),
  limits: { auth: { limit: 20, windowMs: 60_000 } },
}));

vi.mock('@/lib/reset-token', () => ({
  __esModule: true,
  createResetToken: vi.fn().mockResolvedValue('jeton-signe'),
}));

vi.mock('@/lib/token-hash', () => ({
  __esModule: true,
  hashToken: (t: string) => `hash-de-${t}`,
}));

const mockSendPasswordResetEmail = vi.fn();
vi.mock('@/lib/email-send', () => ({
  __esModule: true,
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
}));

// --- DB mock ---

const utilisateurAvecMotDePasse = {
  id: 'user-1',
  email: 'personne@example.com',
  normalizedEmail: 'personne@example.com',
  passwordHash: '$2a$12$hash',
};

const db = {
  user: { findUnique: vi.fn() },
  passwordResetToken: {
    count: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => db,
}));

const { POST } = await import('../route');

const MESSAGE_UNIFORME =
  'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.';

function requete(email: string): Request {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.user.findUnique.mockResolvedValue(utilisateurAvecMotDePasse);
    db.passwordResetToken.count.mockResolvedValue(0);
    db.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    db.passwordResetToken.create.mockResolvedValue({ id: 'jeton-1' });
    db.passwordResetToken.delete.mockResolvedValue({ id: 'jeton-1' });
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envoie le lien et crée le jeton pour un compte avec mot de passe', async () => {
    const res = await POST(requete('personne@example.com'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: MESSAGE_UNIFORME });
    expect(db.passwordResetToken.create).toHaveBeenCalledOnce();
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      'personne@example.com',
      expect.stringContaining('/reset-password?token='),
    );
  });

  it('trace la sortie quand aucun compte ne correspond, sans révéler l\'adresse', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await POST(requete('inconnu@example.com'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: MESSAGE_UNIFORME });
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('compte_introuvable'),
    );
    // L'adresse demandée ne doit jamais atterrir dans les logs (cf. #32).
    const logs = (console.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(' ');
    expect(logs).not.toContain('inconnu@example.com');
  });

  it('trace la sortie pour un compte sans mot de passe (OAuth)', async () => {
    db.user.findUnique.mockResolvedValue({ ...utilisateurAvecMotDePasse, passwordHash: null });

    const res = await POST(requete('personne@example.com'));

    expect(res.status).toBe(200);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('sans_mot_de_passe'));
  });

  it('trace la sortie quand le quota horaire est atteint', async () => {
    db.passwordResetToken.count.mockResolvedValue(3);

    const res = await POST(requete('personne@example.com'));

    expect(res.status).toBe(200);
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('quota_horaire'));
  });

  it('retire le jeton quand l\'envoi échoue, pour ne pas consommer le quota', async () => {
    mockSendPasswordResetEmail.mockRejectedValue(new Error('Resend 401'));

    const res = await POST(requete('personne@example.com'));

    expect(res.status).toBe(500);
    expect(db.passwordResetToken.create).toHaveBeenCalledOnce();
    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: 'jeton-1' } });
  });

  it('reste en 500 lisible si même le retrait du jeton échoue', async () => {
    mockSendPasswordResetEmail.mockRejectedValue(new Error('Resend 401'));
    db.passwordResetToken.delete.mockRejectedValue(new Error('DB indisponible'));

    const res = await POST(requete('personne@example.com'));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toHaveProperty('error');
  });
});
