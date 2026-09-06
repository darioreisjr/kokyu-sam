import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * Vercel Node.js Function entrypoint. Reuses the exact same Nest
 * application configuration as src/main.ts (via configureApp) so local,
 * Docker, and Vercel runtimes never diverge. The Nest app is bootstrapped
 * once per warm Function instance and cached across invocations - there is
 * no per-request state, matching the stateless deployment requirement.
 *
 * Vercel's Node.js runtime invokes this module's default export with plain
 * Node (req, res) objects, exactly like Node's own http.Server "request"
 * event - and an Express app instance is itself a valid (req, res)
 * listener, so it's handed to Vercel directly. No adapter library (e.g.
 * serverless-http, built for AWS Lambda's event/context calling
 * convention) is needed or correct here - wrapping with one silently hangs
 * every request until Vercel's function timeout kills it, since Express
 * writes to a simulated response object that response wrapper builds
 * instead of the real one Vercel passed in.
 */
let cachedApp: Express | undefined;

async function bootstrapExpressApp(): Promise<Express> {
  const expressApp: Express = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    bodyParser: false,
  });

  configureApp(app);
  await app.init();

  return expressApp;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  cachedApp ??= await bootstrapExpressApp();
  cachedApp(req, res);
}
