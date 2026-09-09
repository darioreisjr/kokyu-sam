import { Injectable } from '@nestjs/common';
import { NAVIGATION_FEATURE_FLAGS } from './feature-flags.constants';

@Injectable()
export class FeatureFlagsService {
  getNavigationFlags(): Record<string, boolean> {
    return { ...NAVIGATION_FEATURE_FLAGS };
  }
}
