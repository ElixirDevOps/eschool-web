/** Sessions. Not implemented yet. */

export type Session = {
  token: string;
  accountId: string;
  createdAt: number;
  lastUsedAt: number;
};

export function resetSessions(): void {
  throw new Error('resetSessions is not implemented');
}

export function createSession(_accountId: string, _now?: number): Session {
  throw new Error('createSession is not implemented');
}

export function useSession(_token: string, _now?: number): Session | null {
  throw new Error('useSession is not implemented');
}

export function expiresAt(_session: Session): number {
  throw new Error('expiresAt is not implemented');
}

export function sessionCookieOptions(): Record<string, unknown> {
  throw new Error('sessionCookieOptions is not implemented');
}
