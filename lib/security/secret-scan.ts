import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Looks for secrets committed to a repository. A check runs this over this repository and fails
 * the build if it finds anything, so "no secret is kept in the repository" is re-proved on every
 * commit rather than asserted once.
 */
export type SecretFinding = { file: string; line: number; rule: string; excerpt: string };

const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', 'out', 'dist', 'coverage', '.constat']);
const SKIP_FILES = /\.(png|jpe?g|gif|webp|avif|ico|svg|pdf|zip|t?gz|bz2|woff2?|ttf|otf|eot|mp[34]|mov|wasm)$/i;
const MAX_BYTES = 2 * 1024 * 1024;

/** A committed `.env` is a secret by convention even when nobody can read it here. */
const ENV_FILE = /(^|\/)\.env(\.|$)/;
const ENV_FILE_ALLOWED = /(^|\/)\.env\.(example|sample|template|defaults)$/;

const RULES: { rule: string; pattern: RegExp; accept?: (value: string) => boolean }[] = [
  {
    rule: 'private-key',
    pattern: /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----/g,
  },
  {
    rule: 'cloud-access-key',
    pattern: /\b(?:AKIA|ASIA|AGPA|AIDA)[0-9A-Z]{16}\b/g,
  },
  {
    rule: 'api-token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{24,}|xox[abprs]-[A-Za-z0-9-]{12,})\b/g,
  },
  {
    rule: 'connection-string-password',
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\/[^\s:/@]+:[^\s@/]{3,}@/g,
  },
  {
    // A secret-shaped name given a literal value: `secret = "…"`, `apiKey: '…'`.
    rule: 'secret-assignment',
    pattern:
      /(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret)["']?\s*[:=]\s*["']([^"'\n]{8,})["']/gi,
    accept: (value) => {
      if (/\s/.test(value)) return false; // an English phrase, not a credential
      if (!/[0-9]|[^A-Za-z0-9]/.test(value)) return false; // a bare word, like type="password"
      return !/^(?:process\.env|import\.meta|\$\{|<|\.\.\.|x{3,}|\*{3,}|change[-_]?me|your[-_]?|placeholder|redacted|example|dummy)/i.test(
        value,
      ) && !/example|placeholder|redacted/i.test(value);
    },
  },
];

function listFiles(root: string): string[] {
  try {
    const tracked = execFileSync('git', ['-C', root, 'ls-files', '-z'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
    const files = tracked.split('\0').filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    // Not a git repository (a fixture directory, say) — walk it instead.
  }
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
      } else if (entry.isFile()) {
        found.push(relative(root, join(dir, entry.name)).split(sep).join('/'));
      }
    }
  };
  walk(root);
  return found;
}

export function scanForSecrets(root: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const file of listFiles(root)) {
    if (SKIP_FILES.test(file)) continue;
    if (file.split('/').some((part) => SKIP_DIRS.has(part))) continue;

    if (ENV_FILE.test(file) && !ENV_FILE_ALLOWED.test(file)) {
      findings.push({ file, line: 1, rule: 'committed-env-file', excerpt: file });
      continue;
    }

    let text: string;
    try {
      if (statSync(join(root, file)).size > MAX_BYTES) continue;
      text = readFileSync(join(root, file), 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\u0000')) continue;

    text.split('\n').forEach((line, index) => {
      for (const { rule, pattern, accept } of RULES) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(line)) !== null) {
          if (accept && !accept(match[1] ?? match[0])) continue;
          findings.push({
            file,
            line: index + 1,
            rule,
            excerpt: `${match[0].slice(0, 24)}…`,
          });
        }
      }
    });
  }
  return findings;
}
