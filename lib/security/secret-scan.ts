/** Looks for secrets committed to the repository. Not implemented yet. */

export type SecretFinding = { file: string; line: number; rule: string; excerpt: string };

export function scanForSecrets(_root: string): SecretFinding[] {
  throw new Error('scanForSecrets is not implemented');
}
