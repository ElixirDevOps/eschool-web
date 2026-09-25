/** Password storage. Not implemented yet — the checks for it are red on purpose. */

export function hashPassword(_plain: string): string {
  throw new Error('hashPassword is not implemented');
}

export function verifyPassword(_plain: string, _stored: string): boolean {
  throw new Error('verifyPassword is not implemented');
}

export function looksHashed(_value: string): boolean {
  throw new Error('looksHashed is not implemented');
}
