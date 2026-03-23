import { config as dotenvConfig } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ResponseFormatInterceptor } from './interceptor/response.interceptor';
import { PrismaService } from './prisma/prisma.service';
import { seedDefaultAdmin } from './seeding/seedAdmin';

async function bootstrap() {
  dotenvConfig();
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalInterceptors(new ResponseFormatInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  if (process.env.SEED_DEFAULT_ADMIN === 'true') {
    await seedDefaultAdmin(app.get(PrismaService));
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
