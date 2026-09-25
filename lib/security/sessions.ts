import { randomBytes } from 'node:crypto';
import { SESSION_IDLE_MS } from './policy';

/**
 * Sessions, with a sliding thirty-day window. `lastUsedAt` moves forward every time the
 * session is used, so "thirty days" is thirty days of *disuse*, not thirty days of life.
 */
export type Session = {
  token: string;
  accountId: string;
  createdAt: number;
  lastUsedAt: number;
};

const sessions = new Map<string, Session>();

export function resetSessions(): void {
  sessions.clear();
}

export function createSession(accountId: string, now: number = Date.now()): Session {
  const session: Session = {
    token: randomBytes(32).toString('base64url'),
    accountId,
    createdAt: now,
    lastUsedAt: now,
  };
  sessions.set(session.token, session);
  return { ...session };
}

/** The moment this session ends if it is never used again. */
export function expiresAt(session: Session): number {
  return session.lastUsedAt + SESSION_IDLE_MS;
}

/** Reads a session without touching it — for rendering, not for authorising. */
export function getSession(token: string): Session | null {
  const session = sessions.get(token);
  return session ? { ...session } : null;
}

/**
 * Uses a session: slides its window forward and hands it back, or, if thirty days have passed
 * without use, forgets it and hands back nothing. Forgetting rather than refusing is the point —
 * an expired token cannot be revived by asking again at an earlier clock.
 */
export function useSession(token: string, now: number = Date.now()): Session | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (now >= expiresAt(session)) {
    sessions.delete(token);
    return null;
  }
  session.lastUsedAt = now;
  return { ...session };
}

/** How the session token travels: not readable by script, not sent in the clear, not cross-site. */
export function sessionCookieOptions(): Record<string, unknown> {
  return {
    name: 'session',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_IDLE_MS / 1000,
  };
}
