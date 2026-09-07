import { SetMetadata } from '@nestjs/common';

export const ALLOW_INCOMPLETE_PROFILE_KEY = 'allowIncompleteProfile';

/**
 * Opts a route (or an entire controller) out of ProfileCompleteGuard. The
 * guard blocks every authenticated route by default once a business
 * feature exists, so this must be applied explicitly to the handful of
 * routes a user needs *before* completing onboarding: GET /me,
 * GET /usernames/availability, POST /profile/complete, and the avatar
 * endpoints. Any future controller is protected automatically with zero
 * extra work - that's the point.
 */
export const AllowIncompleteProfile = () => SetMetadata(ALLOW_INCOMPLETE_PROFILE_KEY, true);
