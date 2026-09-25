/** Sign-in, with the lockout. Not implemented yet. */
import type { Session } from './sessions';

export type SignInResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'bad-credentials' | 'locked'; message: string; retryAfterMs: number };

export function signIn(_email: string, _password: string, _now?: number): SignInResult {
  throw new Error('signIn is not implemented');
}
