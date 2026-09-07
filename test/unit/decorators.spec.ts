import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY, Public } from '../../src/common/auth/decorators/public.decorator';
import {
  ALLOW_INCOMPLETE_PROFILE_KEY,
  AllowIncompleteProfile,
} from '../../src/common/auth/decorators/allow-incomplete-profile.decorator';
import { CurrentUser } from '../../src/common/auth/decorators/current-user.decorator';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

describe('@Public()', () => {
  it('sets the IS_PUBLIC_KEY metadata to true on the target', () => {
    class Controller {
      @Public()
      handler(): void {}
    }

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Controller.prototype.handler)).toBe(true);
  });
});

describe('@AllowIncompleteProfile()', () => {
  it('sets the ALLOW_INCOMPLETE_PROFILE_KEY metadata to true on the target', () => {
    class Controller {
      @AllowIncompleteProfile()
      handler(): void {}
    }

    expect(Reflect.getMetadata(ALLOW_INCOMPLETE_PROFILE_KEY, Controller.prototype.handler)).toBe(
      true,
    );
  });
});

/**
 * Nest's documented technique for unit testing a custom param decorator
 * created via createParamDecorator: apply it to a throwaway method and
 * recover the underlying factory function from route-args metadata.
 * https://docs.nestjs.com/custom-decorators#testing
 */
function getParamDecoratorFactory<T>(
  decorator: (...args: never[]) => ParameterDecorator,
): (data: unknown, ctx: ExecutionContext) => T {
  class TestDecorator {
    public test(@decorator() _value: unknown): void {}
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestDecorator, 'test') as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => T }
  >;

  return Object.values(args)[0]!.factory;
}

describe('@CurrentUser()', () => {
  it('extracts request.user attached by SupabaseAuthGuard', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const user = buildAuthenticatedUser();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;

    expect(factory(undefined, ctx)).toBe(user);
  });

  it('returns undefined on a @Public() route with no authenticated user', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    expect(factory(undefined, ctx)).toBeUndefined();
  });
});
