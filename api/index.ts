import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import serverlessHttp from 'serverless-http';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

type ServerlessHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Vercel Node.js Function entrypoint. Reuses the exact same Nest
 * application configuration as src/main.ts (via configureApp) so local,
 * Docker, and Vercel runtimes never diverge. The Nest app is bootstrapped
 * once per warm Function instance and cached across invocations - there is
 * no per-request state, matching the stateless deployment requirement.
 */
let cachedHandler: ServerlessHandler | undefined;

async function bootstrapServerlessHandler(): Promise<ServerlessHandler> {
  const expressApp: Express = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    bodyParser: false,
  });

  configureApp(app);
  await app.init();

  return serverlessHttp(expressApp) as unknown as ServerlessHandler;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  cachedHandler ??= await bootstrapServerlessHandler();
  await cachedHandler(req, res);
}
