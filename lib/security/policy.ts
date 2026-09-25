/**
 * The security baseline, in numbers. Every rule below is quoted from an acceptance
 * criterion, so the numbers live here once and the code reads them from here.
 */

/** "After 5 failed sign-ins, an account waits 15 minutes before the next try." */
export const MAX_FAILED_SIGN_INS = 5;

/** "…waits 15 minutes before the next try." */
export const LOCKOUT_MS = 15 * 60 * 1000;

/** "A session ends after 30 days without use." */
export const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000;

/** How long a browser should refuse to speak plain HTTP to us, in seconds: two years. */
export const HSTS_MAX_AGE_SECONDS = 63072000;
