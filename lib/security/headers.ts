import { HSTS_MAX_AGE_SECONDS } from './policy';

/**
 * The headers every response carries. One list, used by the middleware that runs on every path
 * and again by `next.config.mjs`, so a response that somehow skips the middleware is still
 * covered rather than silently bare.
 */
export function securityHeaders(): Record<string, string> {
  return {
    // Two years, subdomains included, and eligible for the browser preload list: after the
    // first visit, the browser will not speak plain HTTP to us at all.
    'Strict-Transport-Security': `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains; preload`,
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "font-src 'self'",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-DNS-Prefetch-Control': 'off',
  };
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Where a request should be sent if it did not arrive over TLS, or `null` if it did.
 *
 * `x-forwarded-proto` is what a load balancer or CDN puts the *original* scheme in; without
 * reading it, a request that reached the edge over plain HTTP and was forwarded on inside the
 * network would look encrypted and be served as a page.
 */
export function httpsRedirectFor(url: URL, forwardedProto: string | null): string | null {
  const scheme = (forwardedProto?.split(',')[0] ?? url.protocol.replace(':', '')).trim().toLowerCase();
  if (scheme === 'https') return null;
  // A developer on their own machine has no certificate; in production there is no exemption.
  if (process.env.NODE_ENV !== 'production' && LOOPBACK.has(url.hostname)) return null;
  const secure = new URL(url.toString());
  secure.protocol = 'https:';
  return secure.toString();
}
