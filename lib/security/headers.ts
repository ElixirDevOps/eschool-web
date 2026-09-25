/** The secure headers every response carries. Not implemented yet. */

export function securityHeaders(): Record<string, string> {
  return {};
}

export function httpsRedirectFor(_url: URL, _forwardedProto: string | null): string | null {
  return null;
}
