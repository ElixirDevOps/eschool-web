// GET /api/v1/version: which commit this running app was built from. Constat asks your live
// address this after a release, and calls the release live only when the answer is its commit.
// The deploy step Constat writes for your host passes the commit in; Render sets its own.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  const commit = process.env.NEXT_PUBLIC_CONSTAT_COMMIT
    ?? process.env.CONSTAT_COMMIT
    ?? process.env.RENDER_GIT_COMMIT
    ?? process.env.VERCEL_GIT_COMMIT_SHA
    ?? null;
  return Response.json({ commit });
}
