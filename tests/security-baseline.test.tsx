import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { AccountScreen } from '../app/account/AccountScreen';
import { SignInScreen } from '../app/signin/SignInScreen';
import {
  createAccount,
  findAccountById,
  resetAccounts,
  saveAccount,
  type Account,
} from '../lib/security/accounts';
import { Forbidden, changeAccount, viewAccount } from '../lib/security/authz';
import { securityHeaders } from '../lib/security/headers';
import { hashPassword, looksHashed, verifyPassword } from '../lib/security/passwords';
import { LOCKOUT_MS, MAX_FAILED_SIGN_INS, SESSION_IDLE_MS } from '../lib/security/policy';
import { scanForSecrets } from '../lib/security/secret-scan';
import {
  createSession,
  expiresAt,
  resetSessions,
  sessionCookieOptions,
  useSession,
} from '../lib/security/sessions';
import { signIn } from '../lib/security/signin';
import { config as middlewareConfig, middleware } from '../middleware';
import { page, takePicture, takePictureOfHtml } from './support/picture';
import { fetchOverTls, startTlsServer } from './support/tls';

const REPO_ROOT = resolve(__dirname, '..');
const PASSWORD = 'correct horse battery staple';
const T0 = Date.UTC(2026, 0, 5, 9, 30, 0);

beforeEach(() => {
  resetAccounts();
  resetSessions();
});

describe('security baseline', () => {
  it('Passwords are stored hashed, never as written', () => {
    const stored = hashPassword(PASSWORD);

    // Nothing of the written password survives into what is stored.
    expect(stored).not.toContain(PASSWORD);
    expect(stored.toLowerCase()).not.toContain('horse');
    expect(looksHashed(stored)).toBe(true);
    expect(looksHashed(PASSWORD)).toBe(false);

    // Salted: the same password stored twice is two different rows.
    expect(hashPassword(PASSWORD)).not.toEqual(stored);

    // And it is still a password, not a one-way dead end.
    expect(verifyPassword(PASSWORD, stored)).toBe(true);
    expect(verifyPassword('correct horse battery stapl', stored)).toBe(false);
    expect(verifyPassword('', stored)).toBe(false);

    // The account an app actually keeps holds the hash and nothing else.
    const account = createAccount('ada@example.test', PASSWORD, 'Ada Lovelace');
    expect(account.passwordHash).not.toContain(PASSWORD);
    expect(looksHashed(account.passwordHash)).toBe(true);
    expect(JSON.stringify(account)).not.toContain(PASSWORD);
    expect(Object.keys(account)).not.toContain('password');
    expect(verifyPassword(PASSWORD, account.passwordHash)).toBe(true);

    // The store refuses to be handed a password as written.
    expect(() => saveAccount({ ...account, passwordHash: PASSWORD })).toThrow(/hashed/i);
  });

  it('After 5 failed sign-ins, an account waits 15 minutes before the next try', () => {
    expect(MAX_FAILED_SIGN_INS).toBe(5);
    expect(LOCKOUT_MS).toBe(15 * 60 * 1000);
    createAccount('grace@example.test', PASSWORD, 'Grace Hopper');

    // Four wrong tries are refused, but the door is still open.
    for (let attempt = 1; attempt < MAX_FAILED_SIGN_INS; attempt += 1) {
      const result = signIn('grace@example.test', 'wrong', T0);
      expect(result).toMatchObject({ ok: false, reason: 'bad-credentials' });
    }

    // The fifth shuts it.
    const fifth = signIn('grace@example.test', 'wrong', T0);
    expect(fifth.ok).toBe(false);
    if (fifth.ok) throw new Error('unreachable');
    expect(fifth.reason).toBe('locked');
    expect(fifth.retryAfterMs).toBe(LOCKOUT_MS);

    // While it is shut, even the right password waits.
    const rightButLocked = signIn('grace@example.test', PASSWORD, T0 + 60_000);
    expect(rightButLocked).toMatchObject({ ok: false, reason: 'locked' });
    if (rightButLocked.ok) throw new Error('unreachable');
    expect(rightButLocked.retryAfterMs).toBe(LOCKOUT_MS - 60_000);
    expect(rightButLocked.message).toMatch(/15 minutes/);

    // One millisecond short of fifteen minutes is still short.
    expect(signIn('grace@example.test', PASSWORD, T0 + LOCKOUT_MS - 1)).toMatchObject({
      ok: false,
      reason: 'locked',
    });

    // Fifteen minutes after the fifth failure, the next try is allowed.
    const afterTheWait = signIn('grace@example.test', PASSWORD, T0 + LOCKOUT_MS);
    expect(afterTheWait.ok).toBe(true);

    // And a good sign-in wipes the count, so the next four failures start again from zero.
    const account = findAccountById(useSession((afterTheWait as { session: { token: string } }).session.token, T0 + LOCKOUT_MS)!.accountId)!;
    expect(account.failedSignIns).toBe(0);
    expect(account.lockedUntil).toBeNull();

    // What the person waiting is told.
    const html = renderToStaticMarkup(
      <SignInScreen email="grace@example.test" error={rightButLocked.message} />,
    );
    expect(html).toContain('15 minutes');
    takePictureOfHtml(
      'security baseline > After 5 failed sign-ins, an account waits 15 minutes before the next try',
      page('Sign in', html),
      { height: 620 },
    );
  });

  it('Every page is served over HTTPS, with secure headers', async () => {
    // Every path goes through the middleware — not just some of them.
    expect(middlewareConfig.matcher).toBe('/:path*');

    // A plain-HTTP request is not answered with a page; it is sent to HTTPS.
    for (const path of ['/', '/signin', '/account', '/api/v1/version']) {
      const plain = middleware(new NextRequest(`http://eschool.example${path}?a=1`));
      expect(plain.status).toBe(308);
      expect(plain.headers.get('location')).toBe(`https://eschool.example${path}?a=1`);
    }

    // So is a request that reached a proxy over plain HTTP and was forwarded on.
    const forwarded = middleware(
      new NextRequest('https://eschool.example/signin', { headers: { 'x-forwarded-proto': 'http' } }),
    );
    expect(forwarded.status).toBe(308);
    expect(forwarded.headers.get('location')).toBe('https://eschool.example/signin');

    // Over a real TLS connection, every page carries the secure headers.
    const body = page('Sign in', renderToStaticMarkup(<SignInScreen />));
    const server = await startTlsServer((path) => {
      const response = middleware(
        new NextRequest(`https://localhost${path}`, { headers: { 'x-forwarded-proto': 'https' } }),
      );
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        if (!name.startsWith('x-middleware')) headers[name] = value;
      });
      return { status: 200, headers, body };
    });

    try {
      const seen: Record<string, string> = {};
      for (const path of ['/', '/signin', '/account']) {
        const response = await fetchOverTls(server.port, path);
        expect(response.status).toBe(200);
        const h = response.headers as Record<string, string>;
        expect(h['strict-transport-security']).toBe(
          'max-age=63072000; includeSubDomains; preload',
        );
        expect(h['content-security-policy']).toContain("default-src 'self'");
        expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
        expect(h['x-content-type-options']).toBe('nosniff');
        expect(h['x-frame-options']).toBe('DENY');
        expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(h['permissions-policy']).toContain('camera=()');
        expect(h['cross-origin-opener-policy']).toBe('same-origin');
        Object.assign(seen, h);
      }

      // The header list the middleware applies is the header list the app declares.
      for (const [name, value] of Object.entries(securityHeaders())) {
        expect(seen[name.toLowerCase()]).toBe(value);
      }

      // A page fetched over TLS, and the headers that came with it.
      const rows = Object.entries(securityHeaders())
        .map(([name, value]) => `<tr><td>${name}</td><td>${value}</td></tr>`)
        .join('');
      takePictureOfHtml(
        'security baseline > Every page is served over HTTPS, with secure headers',
        page(
          'Sign in',
          `${renderToStaticMarkup(<SignInScreen />)}
           <section class="card"><h2>Served over HTTPS</h2>
           <p class="lock">&#128274; https://localhost/signin &mdash; TLS, and these response headers:</p>
           <table>${rows}</table></section>`,
        ),
        { height: 1180 },
      );
      // And the same page, photographed through a browser over the real TLS port.
      takePicture(
        'security baseline > Every page is served over HTTPS, with secure headers > browser',
        `https://localhost:${server.port}/signin`,
        { extraArgs: ['--ignore-certificate-errors', '--host-resolver-rules=MAP localhost 127.0.0.1'] },
      );
    } finally {
      await server.close();
    }
  });

  it('No secret is kept in the repository', () => {
    // Nothing secret-shaped is committed anywhere in this repository.
    expect(scanForSecrets(REPO_ROOT)).toEqual([]);

    // And the scanner that says so can actually see one when it is there.
    const planted = mkdtempSync(join(tmpdir(), 'constat-secrets-'));
    writeFileSync(
      join(planted, 'config.ts'),
      [
        'export const dbUrl = "postgres://app:s3cr3t-pa55word@db.example:5432/app";',
        'export const awsKey = "AKIA' + 'IOSFODNN7EXAMPLE";',
        'export const sessionSecret = "9f2b1c7d4e6a8b0c2d4e6f8a1b3c5d7e";',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(
      join(planted, 'id_rsa'),
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----\n',
      'utf8',
    );
    const planted_findings = scanForSecrets(planted);
    expect(planted_findings.length).toBeGreaterThanOrEqual(4);
    expect(planted_findings.map((f) => f.rule)).toEqual(
      expect.arrayContaining(['private-key', 'cloud-access-key', 'connection-string-password']),
    );

    // The names of the things that need secrets are in the repository; the values are not.
    const example = scanForSecrets(REPO_ROOT).filter((f) => f.file.includes('.env'));
    expect(example).toEqual([]);
  });

  it('A signed-in person can only see and change their own account', () => {
    const ada = createAccount('ada@example.test', PASSWORD, 'Ada Lovelace');
    const bob = createAccount('bob@example.test', 'a different password', 'Bob Kahn');
    const adasSession = createSession(ada.id, T0);

    // Her own account: she can see it, and change it.
    expect(viewAccount(adasSession, ada.id, T0).email).toBe('ada@example.test');
    expect(changeAccount(adasSession, ada.id, { displayName: 'Ada L.' }, T0).displayName).toBe('Ada L.');
    expect(findAccountById(ada.id)!.displayName).toBe('Ada L.');

    // His: neither.
    expect(() => viewAccount(adasSession, bob.id, T0)).toThrow(Forbidden);
    expect(() => changeAccount(adasSession, bob.id, { displayName: 'stolen' }, T0)).toThrow(Forbidden);
    expect(findAccountById(bob.id)!.displayName).toBe('Bob Kahn');
    expect(() => changeAccount(adasSession, bob.id, { password: 'taken over' }, T0)).toThrow(Forbidden);
    expect(verifyPassword('a different password', findAccountById(bob.id)!.passwordHash)).toBe(true);

    // Nobody signed in sees anything at all.
    expect(() => viewAccount(null, ada.id, T0)).toThrow(Forbidden);
    expect(() => changeAccount(null, ada.id, { displayName: 'nobody' }, T0)).toThrow(Forbidden);

    // Nor does a session that has run out.
    const stale = createSession(ada.id, T0);
    expect(() => viewAccount(stale, ada.id, T0 + SESSION_IDLE_MS)).toThrow(Forbidden);

    // What she sees, and what she is told when she asks for his.
    let refusal = '';
    try {
      viewAccount(adasSession, bob.id, T0);
    } catch (error) {
      refusal = (error as Error).message;
    }
    expect(refusal).not.toContain('bob@example.test');
    expect(refusal).not.toContain('Bob Kahn');

    const mine = renderToStaticMarkup(
      <AccountScreen viewerEmail="ada@example.test" account={viewAccount(adasSession, ada.id, T0)} />,
    );
    const theirs = renderToStaticMarkup(
      <AccountScreen viewerEmail="ada@example.test" account={null} error={refusal} />,
    );
    expect(mine).toContain('ada@example.test');
    expect(theirs).not.toContain('bob@example.test');
    takePictureOfHtml(
      'security baseline > A signed-in person can only see and change their own account',
      page('Your account', `${mine}${theirs}`),
      { height: 720 },
    );
  });

  it('A session ends after 30 days without use', () => {
    expect(SESSION_IDLE_MS).toBe(30 * 24 * 60 * 60 * 1000);
    const ada = createAccount('ada@example.test', PASSWORD, 'Ada Lovelace');
    const session = createSession(ada.id, T0);
    expect(expiresAt(session)).toBe(T0 + SESSION_IDLE_MS);

    // The cookie it travels in ends at the same moment, and is not readable or sendable in the clear.
    expect(sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_IDLE_MS / 1000,
    });

    // Using it slides the thirty days forward from the last use, not from the first.
    const used = useSession(session.token, T0 + 29 * 24 * 60 * 60 * 1000);
    expect(used).not.toBeNull();
    expect(used!.lastUsedAt).toBe(T0 + 29 * 24 * 60 * 60 * 1000);
    expect(expiresAt(used!)).toBe(T0 + 29 * 24 * 60 * 60 * 1000 + SESSION_IDLE_MS);

    // A millisecond short of thirty days without use, it still works.
    const lastUse = used!.lastUsedAt;
    expect(useSession(session.token, lastUse + SESSION_IDLE_MS - 1)).not.toBeNull();

    // Thirty days without use, and it is over.
    const fresh = createSession(ada.id, T0);
    expect(useSession(fresh.token, T0 + SESSION_IDLE_MS)).toBeNull();

    // Over for good: it is forgotten, not merely refused, so it cannot come back.
    expect(useSession(fresh.token, T0 + SESSION_IDLE_MS + 1)).toBeNull();
    expect(useSession(fresh.token, T0 + 1)).toBeNull();
  });
});
