/**
 * Matches an Origin header against a CORS allowlist that may contain `*`
 * wildcards (one wildcard matches any run of characters except `/` -
 * consistent with the Supabase Redirect URL wildcards used elsewhere in
 * this project, e.g. `https://kokyu-*-projetosdarioreisjr.vercel.app` for
 * Vercel preview deployments). Never a bare `*`/open wildcard - every
 * pattern still anchors to a specific, owned host suffix.
 */
export function isOriginAllowed(origin: string, allowlist: readonly string[]): boolean {
  return allowlist.some((pattern) =>
    pattern.includes('*') ? wildcardToRegExp(pattern).test(origin) : pattern === origin,
  );
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split('*')
    .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]*');
  return new RegExp(`^${escaped}$`);
}
