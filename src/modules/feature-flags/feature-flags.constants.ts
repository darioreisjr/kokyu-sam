/**
 * One flag per entry in the frontend's `navigationItems`/
 * `bottomNavigationItems` (see kokyu (frontend) repo,
 * src/features/navigation/config/navigationItems.ts) - ids must stay in
 * sync between the two repos, there's no shared package enforcing it.
 *
 * This is the single place that turns a section of the app on. Flipping
 * a value here and redeploying the backend is the whole rollout: no
 * frontend deploy needed, since the frontend always renders from
 * whatever this returns rather than hardcoding which sections are live.
 */
export const NAVIGATION_FEATURE_FLAGS: Readonly<Record<string, boolean>> = {
  respiracao: true,
  missoes: false,
  'ritmo-diario': false,
  treinamento: false,
  nutricao: false,
  habitos: false,
  metas: false,
  'tempo-livre': true,
  perfil: true,
  configuracoes: false,
};
