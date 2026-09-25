# Session notes

## Requirement 1 — Security baseline (10801701-0adf-48df-bf2a-fabcabaeb05c)

### What is here now

- `lib/security/` holds the whole baseline: `passwords`, `accounts`, `sessions`, `signin`,
  `authz`, `headers`, `secret-scan`, and `policy` (the numbers — 5 tries, 15 minutes, 30 days).
  `docs/security.md` says what each one does and why.
- `middleware.ts` runs on every path: HTTPS redirect plus the secure headers.
  `next.config.ts` declares the same headers again at the framework level.
- Screens: `app/signin/SignInScreen.tsx` and `app/account/AccountScreen.tsx`, each with a thin
  `page.tsx` around it. `app/layout.tsx` and `app/styles.ts` are new — the template had no root
  layout at all, so `next build` could not have worked before this.
- `tests/security-baseline.test.tsx`: one check per acceptance criterion, named word for word
  after it. `tests/support/picture.ts` drives the system Chrome (no puppeteer — the runner has
  `google-chrome` and CI already checks for it) and writes `.constat/pictures/<slug>.png`.
  `tests/support/tls.ts` makes a throwaway self-signed cert with `openssl` and runs a real TLS
  listener so the header check is made over a real connection, not a mock.

### Decisions worth keeping

- **The account and session stores are in memory.** `db/schema.sql` carries the tables they map
  onto (`accounts`, `sessions`) including the `password_hash LIKE 'scrypt$%'` check constraint,
  but nothing talks to Postgres yet — CI has no database service, and the baseline had to be
  provable without one. Whoever wires up `pg` should keep `lib/security/authz.ts` as the only
  door to account data: every rule about who may see what lives there and nowhere else.
- **`authz` takes a session, never a caller-supplied account id as authority.** `viewAccount`
  and `changeAccount` both re-open the session (which is also what expires it), then compare.
  Adding a new account route means going through those two functions, not around them.
- **Time is a parameter, not a clock.** Everything that ages — `signIn`, `useSession`,
  `viewAccount`, `changeAccount` — takes `now` with a `Date.now()` default. That is why the
  lockout and expiry checks need no fake timers. Keep the parameter on anything new.
- **The secret scanner runs against this repository in a check, and will fail the build.** If
  you add a fixture that contains something secret-shaped, assemble it from pieces at runtime
  the way `tests/security-baseline.test.tsx` does, or the check will rightly fail on your file.
  Its `secret-assignment` rule deliberately ignores values with whitespace or with no digit or
  punctuation, so `type="password"` and English passphrases in tests do not trip it.
- **`.gitignore` ignores `.env` and `.env.*` except `.env.example`.** Names there, values in the
  environment.

### Half-true, and worth knowing

- There is no sign-in *route* yet — `app/signin/page.tsx` renders the screen and its form posts
  to `/signin`, but nothing handles that POST, and nothing sets the session cookie.
  `lib/security/sessions.ts` already says how the cookie should be set
  (`sessionCookieOptions()`); wiring the POST and the cookie is the obvious next job.
- `app/page.tsx` still says the product is called "A new app". Naming it was the template's own
  first requirement and was not this one; it is still unclaimed.
- Constat's runner could not open the pull request for this branch — GitHub refused with
  "GitHub Actions is not permitted to create or approve pull requests". The branch is pushed;
  because this repository's CI runs only on `main` and on pull requests, no CI run exists for
  it yet. The next requirement will hit the same wall unless that repository setting changes.
