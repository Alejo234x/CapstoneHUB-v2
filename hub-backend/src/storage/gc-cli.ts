/**
 * Recolector de objetos huérfanos en MinIO/S3.
 *
 * Las entregas suben los binarios directamente al bucket con una URL
 * prefirmada y confirman después. Si el usuario cierra el navegador entre
 * ambos pasos, el objeto queda sin fila en `project_attachment`. Este CLI
 * recorre el bucket y borra esos objetos.
 *
 * La lógica vive en `StorageGcService` (`storage-gc.service.ts`); este archivo
 * solo arranca un contexto de Nest (sin servidor HTTP), lee los flags y
 * ejecuta el servicio.
 *
 * Uso:
 *   npm run storage:gc                    # borra huérfanos de más de 24 h
 *   npm run storage:gc -- --dry-run       # solo lista lo que borraría
 *   npm run storage:gc -- --max-age-hours=1
 *
 * Pensado para ejecutarse a mano o desde un cron externo. Imprime un JSON con
 * `scanned`, `deleted` y `kept`.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { StorageGcService } from './storage-gc.service';

/** Lee `--max-age-hours=N`; devuelve `undefined` (default del servicio) si falta o es inválido. */
function readMaxAgeMs(): number | undefined {
  const arg = process.argv.find((value) =>
    value.startsWith('--max-age-hours='),
  );

  if (!arg) {
    return undefined;
  }

  const hours = Number(arg.slice('--max-age-hours='.length));

  return Number.isFinite(hours) && hours > 0
    ? hours * 60 * 60 * 1000
    : undefined;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const maxAgeMs = readMaxAgeMs();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  try {
    const gc = app.get(StorageGcService);
    const result = await gc.run({ dryRun, maxAgeMs });

    console.log(
      JSON.stringify(
        {
          dryRun,
          scanned: result.scanned,
          deleted: result.deleted,
          kept: result.kept,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

void main();
