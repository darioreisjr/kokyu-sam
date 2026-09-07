import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ZodString } from 'zod';
import { AuthenticatedUser } from '../../../common/auth/types/authenticated-user.type';
import {
  firstNameSchema,
  lastNameSchema,
  profileBirthDateSchema,
  usernameSchema,
} from '../../../common/utils/shared.schemas';
import { UsernameTakenError } from '../../../common/errors/app.error';
import { PROFILES_REPOSITORY, ProfilesRepository } from '../types/profiles-repository.interface';
import { Profile, ProfileBootstrapPatch } from '../types/profile.type';

/**
 * Fills a Profile from Supabase Auth identity metadata on first read
 * (called from GET /api/v1/me - there is no separate bootstrap endpoint).
 *
 * Hard rule: only ever fills fields that are currently NULL, and only with
 * values that pass the same validation a user-entered value would - never
 * overwrites a user-chosen value, and never persists something invalid
 * (an invalid/taken username or invalid birth date is simply left null
 * rather than blocking account usage).
 */
@Injectable()
export class ProfileBootstrapService {
  constructor(
    @Inject(PROFILES_REPOSITORY) private readonly repository: ProfilesRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ProfileBootstrapService.name);
  }

  /**
   * Idempotent: a no-op when the profile has already been bootstrapped and
   * is not "inconsistently empty" (bootstrapped once but every fillable
   * field is still null - e.g. an earlier bootstrap attempt found nothing
   * usable in the metadata at the time). Never re-attempts once any
   * fillable field has actually been set, bootstrapped or not.
   */
  async maybeBootstrap(user: AuthenticatedUser, profile: Profile): Promise<Profile> {
    if (profile.profileBootstrappedAt && !this.looksInconsistentlyEmpty(profile)) {
      return profile;
    }

    const patch = this.computePatch(user, profile);

    if (Object.keys(patch).length === 0) {
      // Nothing new to fill. Avoid a write on every single /me call once
      // we already know the metadata has nothing usable - but still stamp
      // profile_bootstrapped_at exactly once so we don't keep re-deriving
      // "nothing to fill" from scratch forever.
      if (profile.profileBootstrappedAt) {
        return profile;
      }
      return this.repository.bootstrap(user.id, user.accessToken, {});
    }

    try {
      const updated = await this.repository.bootstrap(user.id, user.accessToken, patch);

      if (Object.keys(patch).length > 0) {
        this.logger.info(
          {
            event: 'profile.bootstrap.completed',
            userId: user.id,
            fieldsFilled: Object.keys(patch),
          },
          'profile.bootstrap.completed',
        );
      }

      return updated;
    } catch (error) {
      if (error instanceof UsernameTakenError && patch.username) {
        // Best-effort race: someone else took the username between our
        // read and this write. Retry once without it - bootstrap must
        // never fail the /me request.
        const { username: _dropped, ...rest } = patch;
        const updated = await this.repository.bootstrap(user.id, user.accessToken, rest);
        this.logger.info(
          {
            event: 'profile.bootstrap.completed',
            userId: user.id,
            fieldsFilled: Object.keys(rest),
          },
          'profile.bootstrap.completed',
        );
        return updated;
      }

      throw error;
    }
  }

  private looksInconsistentlyEmpty(profile: Profile): boolean {
    return (
      !profile.firstName &&
      !profile.lastName &&
      !profile.username &&
      !profile.birthDate &&
      !profile.avatarExternalUrl
    );
  }

  private computePatch(user: AuthenticatedUser, profile: Profile): ProfileBootstrapPatch {
    const meta = user.userMetadata;
    const patch: ProfileBootstrapPatch = {};

    if (!profile.firstName) {
      const value = this.pickFirstName(meta);
      if (value) patch.firstName = value;
    }

    if (!profile.lastName) {
      const value = this.pickLastName(meta);
      if (value) patch.lastName = value;
    }

    if (!profile.username) {
      const raw = this.readString(meta, 'username');
      if (raw) {
        const result = usernameSchema.safeParse(raw);
        if (result.success) {
          patch.username = result.data;
        }
      }
    }

    if (!profile.birthDate) {
      const raw = this.readString(meta, 'birth_date');
      if (raw) {
        const result = profileBirthDateSchema.safeParse(raw);
        if (result.success) {
          patch.birthDate = result.data;
        }
      }
    }

    if (!profile.avatarPath && !profile.avatarExternalUrl) {
      const picture = this.readString(meta, 'picture') ?? this.readString(meta, 'avatar_url');
      if (picture) {
        patch.avatarExternalUrl = picture;
      }
    }

    return patch;
  }

  /** email signup: first_name/last_name. Google identity: given_name/family_name, or split "name". */
  private pickFirstName(meta: Record<string, unknown>): string | undefined {
    const direct = this.readString(meta, 'first_name') ?? this.readString(meta, 'given_name');
    if (direct) {
      return this.validated(firstNameSchema, direct);
    }

    const fullName = this.readString(meta, 'name') ?? this.readString(meta, 'full_name');
    if (fullName) {
      const [first] = fullName.trim().split(/\s+/);
      return first ? this.validated(firstNameSchema, first) : undefined;
    }

    return undefined;
  }

  private pickLastName(meta: Record<string, unknown>): string | undefined {
    const direct = this.readString(meta, 'last_name') ?? this.readString(meta, 'family_name');
    if (direct) {
      return this.validated(lastNameSchema, direct);
    }

    const fullName = this.readString(meta, 'name') ?? this.readString(meta, 'full_name');
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      const rest = parts.slice(1).join(' ');
      return rest ? this.validated(lastNameSchema, rest) : undefined;
    }

    return undefined;
  }

  private validated(schema: ZodString, value: string): string | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
  }

  private readString(meta: Record<string, unknown>, key: string): string | undefined {
    const value = meta[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
  }
}
