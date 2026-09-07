import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfileMutationsController } from './profile-mutations.controller';
import { UsernamesController } from './usernames.controller';
import { ProfilesService } from './profiles.service';
import { SupabaseProfilesRepository } from './profiles.repository';
import { CurrentUserMapper } from './services/current-user.mapper';
import { ProfileBootstrapService } from './services/profile-bootstrap.service';
import { ProfileCompletionService } from './services/profile-completion.service';
import { PROFILES_REPOSITORY } from './types/profiles-repository.interface';

@Module({
  controllers: [ProfilesController, ProfileMutationsController, UsernamesController],
  providers: [
    ProfilesService,
    ProfileBootstrapService,
    ProfileCompletionService,
    CurrentUserMapper,
    { provide: PROFILES_REPOSITORY, useClass: SupabaseProfilesRepository },
  ],
  // ProfilesService is exported so ProfileCompleteGuard (a global guard
  // wired in AppModule) can inject it for the onboarding-complete check.
  exports: [ProfilesService],
})
export class ProfilesModule {}
