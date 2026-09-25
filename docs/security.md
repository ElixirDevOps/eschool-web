# Security baseline

The guardrails every release is checked against. Each one has a check named word for word
after it in `tests/security-baseline.test.tsx`, so none of this is a promise — it is re-proved
on every run.

## Passwords are stored hashed, never as written

`lib/security/passwords.ts`. A password is turned into a scrypt-derived key
(N=16384, r=8, p=1, 32 bytes) over 16 random bytes of salt, and stored as
`scrypt$N$r$p$<salt>$<key>` — cost parameters included, so they can be raised later without
invalidating what is already stored. Verification is constant-time. `saveAccount` refuses any
row whose password is not in that shape, so there is no path through the store that could keep
a password as written.

## After 5 failed sign-ins, an account waits 15 minutes before the next try

`lib/security/signin.ts`, numbers in `lib/security/policy.ts`. Five consecutive failures set
`lockedUntil` fifteen minutes ahead. While the account is locked, the *correct* password is
refused too — otherwise the lock would tell an attacker when they had guessed right. A
successful sign-in puts the count back to zero. The refusal for a wrong password and the
refusal for an unknown address are the same sentence.

## Every page is served over HTTPS, with secure headers

`middleware.ts` runs on `/:path*` — every path, not a list of them. A request that did not
arrive over TLS is answered with a 308 to the same address on `https`; `x-forwarded-proto` is
read, so a request that reached the edge in the clear and was forwarded on inside the network
is caught too. The only exemption is loopback outside production, for a developer who has no
certificate. Every response carries the list in `lib/security/headers.ts`: HSTS for two years
with `includeSubDomains; preload`, a Content-Security-Policy with `default-src 'self'` and
`frame-ancestors 'none'`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy` and the cross-origin isolation headers. `next.config.ts` declares the same
list a second time, so a response that never reaches the middleware is not bare.

## No secret is kept in the repository

`lib/security/secret-scan.ts` walks every git-tracked file looking for private keys, cloud
access keys, API tokens, connection strings with an inline password, secret-shaped assignments
and committed `.env` files. A check runs it over this repository and fails if it finds
anything, so this is re-proved on every commit rather than asserted once. Names live in
`.env.example`; values live in the environment, and `.gitignore` keeps every other `.env` out.

## A signed-in person can only see and change their own account

`lib/security/authz.ts` is the one door to account data. It takes the session, not an account
id, as the authority: whatever id is asked for, the only one that comes back is the session's
own. The refusal says nothing about the account that was asked for — not whether it exists,
not whose it is.

## A session ends after 30 days without use

`lib/security/sessions.ts`. `lastUsedAt` slides forward on every use, so thirty days means
thirty days of *disuse*. A session past that is deleted rather than refused, so an expired
token cannot be revived by asking again at an earlier clock. The cookie it travels in is
`httpOnly`, `secure`, `sameSite=lax`, and expires at the same moment.
