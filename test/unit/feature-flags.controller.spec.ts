import { describe, expect, it } from 'vitest';
import { FeatureFlagsController } from '../../src/modules/feature-flags/feature-flags.controller';
import { FeatureFlagsService } from '../../src/modules/feature-flags/feature-flags.service';
import { NAVIGATION_FEATURE_FLAGS } from '../../src/modules/feature-flags/feature-flags.constants';

describe('FeatureFlagsController', () => {
  it('getNavigationFlags() returns the configured flags wrapped in { flags }', () => {
    const controller = new FeatureFlagsController(new FeatureFlagsService());

    expect(controller.getNavigationFlags()).toEqual({ flags: NAVIGATION_FEATURE_FLAGS });
  });
});

describe('FeatureFlagsService', () => {
  it('getNavigationFlags() returns a copy, not the shared constant reference', () => {
    const service = new FeatureFlagsService();

    const result = service.getNavigationFlags();
    result.respiracao = false;

    expect(NAVIGATION_FEATURE_FLAGS.respiracao).toBe(true);
  });
});
