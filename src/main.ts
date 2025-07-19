import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';

async function botstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const logger = new Logger();

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use((req, res, next) => {
    logger.log(`[${req.method}] ${req.url}`, 'Request');
    next();
  });

  await app.register(fastifyCookie);
  await app.listen(3000, '0.0.0.0');
  console.log(`Fastify server running on http://localhost:3000`);
}
botstrap();
