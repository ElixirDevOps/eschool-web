import type { Account } from '../../lib/security/accounts';

/** Your account — and, when you ask for one that is not yours, the refusal instead of it. */
export function AccountScreen({
  viewerEmail,
  account,
  error,
}: {
  viewerEmail: string;
  account?: Account | null;
  error?: string | null;
}) {
  return (
    <section className="card">
      <h2>{account ? 'Your account' : 'That account'}</h2>
      {account ? (
        <dl>
          <dt>Name</dt>
          <dd>{account.displayName}</dd>
          <dt>Email</dt>
          <dd>{account.email}</dd>
          <dt>Password</dt>
          <dd>Stored hashed — never shown</dd>
        </dl>
      ) : (
        <>
          <p className="error" role="alert">
            {error ?? 'This account is not yours to see.'}
          </p>
          <p className="notice">
            Signed in as {viewerEmail}. You can only see and change your own account.
          </p>
        </>
      )}
    </section>
  );
}
