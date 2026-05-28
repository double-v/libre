import { Resend } from 'resend';

const FROM = process.env.EMAIL_FROM || 'Libre <noreply@on.resend.dev>';

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const resend = getResend();
  if (!resend) {
    console.log(`[DEV] Verification URL for ${to}: ${verifyUrl}`);
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