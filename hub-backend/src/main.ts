import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';

function isSwaggerEnabled(): boolean {
  return (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() !== 'false';
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

  const app = await NestFactory.create(AppModule);
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
