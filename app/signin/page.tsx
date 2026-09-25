import { SignInScreen } from './SignInScreen';

export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === 'string' ? params.error : null;
  return <SignInScreen error={error} />;
}
