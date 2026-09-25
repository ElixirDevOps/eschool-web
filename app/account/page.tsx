import { cookies } from 'next/headers';
import { AccountScreen } from './AccountScreen';
import { Forbidden, viewAccount } from '../../lib/security/authz';
import { getSession, sessionCookieOptions } from '../../lib/security/sessions';
import type { Account } from '../../lib/security/accounts';

export const dynamic = 'force-dynamic';

/**
 * Whatever account id is asked for, the only one that can come back is the session's own:
 * `viewAccount` is the one door, and it refuses anything else.
 */
export default async function AccountPage() {
  const token = (await cookies()).get(String(sessionCookieOptions().name))?.value ?? null;
  const session = token ? getSession(token) : null;

  let account: Account | null = null;
  let error: string | null = null;
  try {
    account = viewAccount(session, session?.accountId ?? '');
  } catch (caught) {
    error = caught instanceof Forbidden ? caught.message : 'This account is not yours to see.';
  }

  return <AccountScreen viewerEmail={account?.email ?? 'nobody'} account={account} error={error} />;
}
