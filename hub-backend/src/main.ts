import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

function isSwaggerEnabled(): boolean {
  // Deshabilitado por defecto: solo se activa explícitamente (SWAGGER_ENABLED="true").
  return (process.env.SWAGGER_ENABLED ?? 'false').toLowerCase() === 'true';
}

/**
 * Avisos no fatales: el servicio arranca igual y responde 503/500 según el caso.
 */
function logEnvironmentWarnings(): void {
  const logger = new Logger('Bootstrap');

  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL is not set; database operations will fail.');
  }

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    logger.warn('AUTH_SECRET is not set; authentication endpoints will fail.');
  } else if (authSecret.length < 32) {
    logger.warn('AUTH_SECRET should be at least 32 characters.');
  }
}

async function bootstrap() {
  logEnvironmentWarnings();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Detrás de Traefik (Dokploy) confiamos en el primer hop para obtener la IP
  // real del cliente, usada por el rate limiting.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (isSwaggerEnabled()) {
    const config = new DocumentBuilder()
      .setTitle('CapstoneHUB API')
      .setVersion('0.0.1')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap().catch((error: unknown) => {
  Logger.error('Failed to start the application', String(error));
  process.exit(1);
});
