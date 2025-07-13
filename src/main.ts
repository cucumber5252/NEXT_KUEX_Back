import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(fastifyCookie);
  await app.listen(3000, '0.0.0.0');
  console.log(`Fastify server running on http://localhost:3000`);
}
bootstrap();
