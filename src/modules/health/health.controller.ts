import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigType } from '@nestjs/config';
import { Public } from '../../common/auth/decorators/public.decorator';
import { appConfig } from '../../config/app.config';
import { supabaseConfig } from '../../config/supabase.config';

/**
 * Deliberately minimal health surface. Never returns env vars, database
 * credentials, or Supabase keys - see docs/security.md.
 */
@ApiExcludeController()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(supabaseConfig.KEY) private readonly supabase: ConfigType<typeof supabaseConfig>,
  ) {}

  @Public()
  @Get()
  check(): { status: string; timestamp: string; version: string } {
    return this.status();
  }

  @Public()
  @Get('live')
  live(): { status: string; timestamp: string; version: string } {
    return this.status();
  }

  @Public()
  @Get('ready')
  async ready(): Promise<{ status: string; timestamp: string; version: string }> {
    const reachable = await this.pingSupabase();

    if (!reachable) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    return this.status();
  }

  private status(): { status: string; timestamp: string; version: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: this.app.version,
    };
  }

  private async pingSupabase(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.supabase.url}/auth/v1/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      return response.status < 500;
    } catch {
      return false;
    }
  }
}
