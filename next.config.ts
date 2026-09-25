import type { NextConfig } from 'next';
import { securityHeaders } from './lib/security/headers';

/**
 * The same secure headers the middleware sets, declared again at the framework level so a
 * response that never reaches the middleware — a static file, an error page — is not bare.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: Object.entries(securityHeaders()).map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
