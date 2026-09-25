/** The one door to account data. Not implemented yet. */
import type { Account } from './accounts';
import type { Session } from './sessions';

export class Forbidden extends Error {
  readonly status = 403;
}

export function viewAccount(_session: Session | null, _accountId: string, _now?: number): Account {
  throw new Error('viewAccount is not implemented');
}

export function changeAccount(
  _session: Session | null,
  _accountId: string,
  _patch: { displayName?: string; password?: string },
  _now?: number,
): Account {
  throw new Error('changeAccount is not implemented');
}
