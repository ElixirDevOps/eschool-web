import { randomUUID } from 'node:crypto';
import { hashPassword, looksHashed } from './passwords';

/**
 * The account store. Nothing here ever holds a password as written: `createAccount` takes one,
 * hashes it, and lets it go, and `saveAccount` refuses a row whose password is not hashed, so
 * there is no path through this module that could store one by accident.
 *
 * Kept in memory for now; `db/schema.sql` carries the table it maps onto.
 */
export type Account = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  failedSignIns: number;
  lockedUntil: number | null;
};

const accounts = new Map<string, Account>();

export function resetAccounts(): void {
  accounts.clear();
}

export function saveAccount(account: Account): void {
  if (!looksHashed(account.passwordHash)) {
    throw new Error('refusing to store an account whose password is not hashed');
  }
  accounts.set(account.id, { ...account });
}

export function createAccount(email: string, password: string, displayName = email): Account {
  const normalised = email.trim().toLowerCase();
  if (findAccountByEmail(normalised)) throw new Error(`an account already exists for ${normalised}`);
  const account: Account = {
    id: randomUUID(),
    email: normalised,
    displayName,
    passwordHash: hashPassword(password),
    failedSignIns: 0,
    lockedUntil: null,
  };
  saveAccount(account);
  return { ...account };
}

export function findAccountById(id: string): Account | undefined {
  const found = accounts.get(id);
  return found ? { ...found } : undefined;
}

export function findAccountByEmail(email: string): Account | undefined {
  const normalised = email.trim().toLowerCase();
  for (const account of accounts.values()) {
    if (account.email === normalised) return { ...account };
  }
  return undefined;
}
