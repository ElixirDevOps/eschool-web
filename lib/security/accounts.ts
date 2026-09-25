/** The account store. Not implemented yet. */

export type Account = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  failedSignIns: number;
  lockedUntil: number | null;
};

export function resetAccounts(): void {
  throw new Error('resetAccounts is not implemented');
}

export function createAccount(_email: string, _password: string, _displayName?: string): Account {
  throw new Error('createAccount is not implemented');
}

export function findAccountByEmail(_email: string): Account | undefined {
  throw new Error('findAccountByEmail is not implemented');
}

export function findAccountById(_id: string): Account | undefined {
  throw new Error('findAccountById is not implemented');
}

export function saveAccount(_account: Account): void {
  throw new Error('saveAccount is not implemented');
}
