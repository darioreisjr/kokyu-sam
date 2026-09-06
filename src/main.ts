import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { AppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  configureApp(app);

  const appConfig = app.get(ConfigService).get<AppConfig>('app');
  const port = appConfig?.port ?? 3000;

  await app.listen(port);
}

void bootstrap();
