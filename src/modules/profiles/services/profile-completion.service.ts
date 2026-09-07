import { Injectable } from '@nestjs/common';
import { CURRENT_PROFILE_ONBOARDING_VERSION } from '../constants/onboarding-version.constant';
import { Profile } from '../types/profile.type';

export type RequiredProfileField = 'firstName' | 'lastName' | 'username' | 'birthDate';

export interface ProfileCompletionResult {
  completed: boolean;
  completedAt: string | null;
  version: number;
  missingFields: RequiredProfileField[];
}

const REQUIRED_FIELDS: RequiredProfileField[] = ['firstName', 'lastName', 'username', 'birthDate'];

/**
 * Computes profile-completion state from a Profile row. Completion is
 * always derived, never read off a single stored boolean: it depends on
 * every required field actually being present *and* on
 * onboarding_completed_at/onboarding_version, so a future bump of
 * CURRENT_PROFILE_ONBOARDING_VERSION (e.g. a new required field) correctly
 * re-flags existing users as incomplete without a data migration.
 */
@Injectable()
export class ProfileCompletionService {
  compute(profile: Profile): ProfileCompletionResult {
    const missingFields = REQUIRED_FIELDS.filter((field) => !profile[field]);

    const versionSatisfied = profile.onboardingVersion >= CURRENT_PROFILE_ONBOARDING_VERSION;
    const completed =
      profile.onboardingCompletedAt !== null && versionSatisfied && missingFields.length === 0;

    return {
      completed,
      completedAt: completed ? profile.onboardingCompletedAt : null,
      version: CURRENT_PROFILE_ONBOARDING_VERSION,
      missingFields,
    };
  }

  /**
   * Lightweight variant used by ProfileCompleteGuard - takes just the two
   * columns a cheap query can fetch, without every required field (a
   * profile that has completed onboarding once can never regress to
   * missing a required field - update_profile() forbids it - so this is
   * sufficient for the access-gate decision, not for reporting
   * `missingFields`).
   */
  isComplete(status: { onboardingCompletedAt: string | null; onboardingVersion: number }): boolean {
    return (
      status.onboardingCompletedAt !== null &&
      status.onboardingVersion >= CURRENT_PROFILE_ONBOARDING_VERSION
    );
  }
}
