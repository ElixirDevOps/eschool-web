import { NextResponse, type NextRequest } from 'next/server';
import { httpsRedirectFor, securityHeaders } from './lib/security/headers';

/**
 * Runs on every path this app serves. A request that did not arrive over TLS is not answered
 * with a page — it is sent, permanently, to the same address on HTTPS. Whatever is answered
 * carries the secure headers.
 */
export function middleware(request: NextRequest): NextResponse {
  const url = new URL(request.url);
  const secure = httpsRedirectFor(url, request.headers.get('x-forwarded-proto'));
  const response = secure ? NextResponse.redirect(secure, 308) : NextResponse.next();
  for (const [name, value] of Object.entries(securityHeaders())) response.headers.set(name, value);
  return response;
}

export const config = { matcher: '/:path*' };
