import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { SupabaseProfilesRepository } from './profiles.repository';
import { PROFILES_REPOSITORY } from './types/profiles-repository.interface';

@Module({
  controllers: [ProfilesController],
  providers: [
    ProfilesService,
    { provide: PROFILES_REPOSITORY, useClass: SupabaseProfilesRepository },
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
