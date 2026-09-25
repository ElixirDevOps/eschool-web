import { NextResponse, type NextRequest } from 'next/server';

/** Not implemented yet: lets everything past, sets nothing. */
export function middleware(_request: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = { matcher: '/:path*' };
