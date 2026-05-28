/**
 * Normalizes an email address to detect multi-account attempts.
 *
 * Gmail-specific rules:
 * - Remove dots from local part (user.name@gmail.com → username@gmail.com)
 * - Remove +alias tags (user+tag@gmail.com → user@gmail.com)
 * - Normalize googlemail.com → gmail.com
 *
 * General rules:
 * - Lowercase everything
 */
export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const atIdx = lower.indexOf('@');
  if (atIdx === -1) return lower;

  let local = lower.slice(0, atIdx);
  let domain = lower.slice(atIdx + 1);

  // Normalize googlemail.com → gmail.com
  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  // Gmail-specific: remove dots and +aliases
  if (domain === 'gmail.com') {
    // Strip +alias
    const plusIdx = local.indexOf('+');
    if (plusIdx !== -1) {
      local = local.slice(0, plusIdx);
    }
    // Remove dots
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}