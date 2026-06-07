export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Fail closed: don't silently bypass the captcha in prod.
      // Surface the misconfiguration explicitly so it shows up in alerts
      // instead of being masked as a successful verification.
      throw new Error('TURNSTILE_SECRET_KEY must be set in production');
    }
    console.error('[Turnstile] TURNSTILE_SECRET_KEY not configured, skipping verification (DEV ONLY)');
    return true;
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });

  const data = await response.json();
  return data.success === true;
}