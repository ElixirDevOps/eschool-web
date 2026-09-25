import { findAccountById, saveAccount, type Account } from './accounts';
import { hashPassword } from './passwords';
import { useSession, type Session } from './sessions';

export class Forbidden extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'Forbidden';
  }
}

/**
 * The one door to account data. Everything that reads or writes an account comes through here,
 * and here the only account a session can reach is its own. The refusal says nothing about the
 * account that was asked for — not whether it exists, not whose it is.
 */
const NOT_YOURS = 'This account is not yours to see.';

function ownAccount(session: Session | null, accountId: string, now: number): Account {
  if (!session) throw new Forbidden('You are not signed in.');
  const live = useSession(session.token, now);
  if (!live) throw new Forbidden('Your session has ended. Sign in again.');
  if (live.accountId !== accountId) throw new Forbidden(NOT_YOURS);
  const account = findAccountById(accountId);
  if (!account) throw new Forbidden(NOT_YOURS);
  return account;
}

export function viewAccount(session: Session | null, accountId: string, now: number = Date.now()): Account {
  return ownAccount(session, accountId, now);
}

export function changeAccount(
  session: Session | null,
  accountId: string,
  patch: { displayName?: string; password?: string },
  now: number = Date.now(),
): Account {
  const account = ownAccount(session, accountId, now);
  const changed: Account = {
    ...account,
    displayName: patch.displayName ?? account.displayName,
    passwordHash: patch.password === undefined ? account.passwordHash : hashPassword(patch.password),
  };
  saveAccount(changed);
  return changed;
}
