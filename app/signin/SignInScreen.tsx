/** The sign-in screen. When an account is locked out, this is where it is said. */
export function SignInScreen({ email, error }: { email?: string; error?: string | null }) {
  return (
    <main>
      <h1>Sign in</h1>
      <p>Use the email address on your account.</p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <form method="post" action="/signin">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={email ?? ''} autoComplete="username" />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" />
        <button type="submit">Sign in</button>
      </form>
      <p className="lock">This page is served over HTTPS only.</p>
    </main>
  );
}
