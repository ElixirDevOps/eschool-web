import { findAccountByEmail, saveAccount } from './accounts';
import { verifyPassword } from './passwords';
import { LOCKOUT_MS, MAX_FAILED_SIGN_INS } from './policy';
import { createSession, type Session } from './sessions';

export type SignInResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'bad-credentials' | 'locked'; message: string; retryAfterMs: number };

/** Deliberately the same words whether the address is unknown or the password is wrong. */
const REFUSED = 'That email address and password do not match an account.';

function lockedMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return (
    'Too many failed sign-ins. For safety this account waits 15 minutes before the next try — ' +
    `about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left.`
  );
}

/**
 * Five consecutive failures shut an account for fifteen minutes. While it is shut, even the
 * right password is refused — otherwise the lock would tell an attacker when they had guessed
 * correctly. A successful sign-in puts the count back to zero.
 */
export function signIn(email: string, password: string, now: number = Date.now()): SignInResult {
  const account = findAccountByEmail(email);
  if (!account) return { ok: false, reason: 'bad-credentials', message: REFUSED, retryAfterMs: 0 };

  if (account.lockedUntil !== null) {
    if (now < account.lockedUntil) {
      const retryAfterMs = account.lockedUntil - now;
      return { ok: false, reason: 'locked', message: lockedMessage(retryAfterMs), retryAfterMs };
    }
    // The wait is over: the slate is clean before this try is judged.
    account.lockedUntil = null;
    account.failedSignIns = 0;
  }

  if (!verifyPassword(password, account.passwordHash)) {
    account.failedSignIns += 1;
    if (account.failedSignIns >= MAX_FAILED_SIGN_INS) {
      account.lockedUntil = now + LOCKOUT_MS;
      saveAccount(account);
      return { ok: false, reason: 'locked', message: lockedMessage(LOCKOUT_MS), retryAfterMs: LOCKOUT_MS };
    }
    saveAccount(account);
    return { ok: false, reason: 'bad-credentials', message: REFUSED, retryAfterMs: 0 };
  }

  account.failedSignIns = 0;
  account.lockedUntil = null;
  saveAccount(account);
  return { ok: true, session: createSession(account.id, now) };
}
