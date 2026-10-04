import { Resend } from 'resend';

const FROM = process.env.EMAIL_FROM || 'Libre <noreply@on.resend.dev>';

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const resend = getResend();
  if (!resend) {
    // NEVER log the verifyUrl in production — it contains a long-lived JWT
    // (24h) that can be used to take over the account. In dev, log masked
    // info only (recipient + presence of token), not the URL itself.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] verify-email skipped (no RESEND_API_KEY) — recipient=${to}`);
    } else {
      console.error('[email] RESEND_API_KEY missing in production — verification email NOT sent');
    }
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Vérifiez votre email — Libre',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;padding:24px">
        <h1 style="color:#c0563f;font-size:24px;margin:0 0 16px">Bienvenue sur Libre</h1>
        <p style="font-size:16px;color:#333;margin:0 0 24px">
          Confirmez votre adresse email pour activer votre compte :
        </p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#c0563f;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-size:16px;font-weight:600">
          Vérifier mon email
        </a>
        <p style="font-size:14px;color:#666;margin:24px 0 0">
          Si le bouton ne fonctionne pas, copiez-collez ce lien :<br>
          <a href="${verifyUrl}" style="color:#c0563f;word-break:break-all">${verifyUrl}</a>
        </p>
        <p style="font-size:12px;color:#999;margin:24px 0 0">
          Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte sur Libre, ignorez cet email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getResend();
  if (!resend) {
    // NEVER log the resetUrl in production — it contains a 15-min JWT that
    // allows account takeover. In dev, log masked info only.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] password-reset skipped (no RESEND_API_KEY) — recipient=${to}`);
    } else {
      console.error('[email] RESEND_API_KEY missing in production — password-reset email NOT sent');
    }
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Réinitialisation de votre mot de passe — Libre',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;padding:24px">
        <h1 style="color:#c0563f;font-size:24px;margin:0 0 16px">Mot de passe oublié ?</h1>
        <p style="font-size:16px;color:#333;margin:0 0 24px">
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#c0563f;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-size:16px;font-weight:600">
          Réinitialiser mon mot de passe
        </a>
        <p style="font-size:14px;color:#666;margin:24px 0 0">
          Si le bouton ne fonctionne pas, copiez-collez ce lien :<br>
          <a href="${resetUrl}" style="color:#c0563f;word-break:break-all">${resetUrl}</a>
        </p>
        <p style="font-size:12px;color:#999;margin:24px 0 0">
          Ce lien expire dans 15 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe reste inchangé.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Prévient l'auteur d'un retour que l'équipe a répondu (#477).
 *
 * Volontairement vide de contenu : ni le texte de la réponse, ni celui du
 * retour, ni le pseudo — une boîte partagée ne doit rien apprendre. Le lien
 * mène à « Mes retours », derrière la connexion. Envoyé même sans push : c'est
 * la suite d'une demande du membre, pas une sollicitation.
 */
export async function sendFeedbackReplyEmail(to: string, url: string) {
  const resend = getResend();
  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] feedback-reply email skipped (no RESEND_API_KEY)');
    } else {
      console.error('[email] RESEND_API_KEY missing in production — feedback-reply email NOT sent');
    }
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'L’équipe Libre t’a répondu',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;padding:24px">
        <p style="font-size:16px;color:#333;margin:0 0 16px">Bonjour,</p>
        <p style="font-size:16px;color:#333;margin:0 0 24px">
          Tu nous as envoyé un retour depuis Libre, et l’équipe t’a répondu. Pour lire la réponse, ouvre Libre.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#c0563f;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-size:16px;font-weight:600">
          Lire la réponse
        </a>
        <p style="font-size:13px;color:#666;margin:24px 0 0">
          Tu reçois cet e-mail parce que tu nous as écrit depuis l’application. Nous ne t’écrirons pas pour autre chose.
        </p>
      </div>
    `,
  });

  if (error) {
    // Sans destinataire ni contenu dans le journal : le motif suffit.
    console.error('[email] feedback-reply failed', { name: (error as { name?: string }).name ?? 'unknown' });
    throw error;
  }
}
