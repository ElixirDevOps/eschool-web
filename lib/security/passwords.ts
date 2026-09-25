import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password storage. A password is never written down: what is kept is a scrypt key derived
 * from it and a salt that is different for every password, in the form
 *
 *     scrypt$N$r$p$<salt base64>$<derived key base64>
 *
 * so the cost parameters travel with the stored value and can be raised later without
 * invalidating what is already stored.
 */

const SCHEME = 'scrypt';
const COST = 16384; // N
const BLOCK_SIZE = 8; // r
const PARALLELISM = 1; // p
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

const SHAPE = /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/;

function derive(plain: string, salt: Buffer, cost: number, blockSize: number, parallelism: number): Buffer {
  return scryptSync(plain.normalize('NFKC'), salt, KEY_LENGTH, {
    N: cost,
    r: blockSize,
    p: parallelism,
    maxmem: 256 * cost * blockSize,
  });
}

/** What goes into storage in place of the password. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = derive(plain, salt, COST, BLOCK_SIZE, PARALLELISM);
  return [SCHEME, COST, BLOCK_SIZE, PARALLELISM, salt.toString('base64'), key.toString('base64')].join('$');
}

/** True only for something this module produced — never for a password as written. */
export function looksHashed(value: string): boolean {
  return typeof value === 'string' && SHAPE.test(value);
}

/** Constant-time: a wrong password takes the same time to refuse whatever is wrong with it. */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!looksHashed(stored)) return false;
  const [, cost, blockSize, parallelism, salt, key] = stored.split('$');
  const expected = Buffer.from(key, 'base64');
  let actual: Buffer;
  try {
    actual = derive(plain, Buffer.from(salt, 'base64'), Number(cost), Number(blockSize), Number(parallelism));
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
