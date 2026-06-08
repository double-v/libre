/**
 * Extract the client IP from a Next.js Request, in order of preference.
 *
 * On Vercel, the deployment platform forwards the original client IP in
 * `x-forwarded-for` (chain of proxies) or `x-real-ip` (single proxy).
 * The leftmost entry of x-forwarded-for is the original client.
 *
 * Returns 'unknown' if no IP can be determined (e.g. direct call in tests).
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = request.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}
