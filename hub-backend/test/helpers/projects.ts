import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { bearer, uniqueEmail } from './auth';

/** Crea un proyecto privado como el usuario indicado y devuelve su id. */
export async function createProject(
  app: INestApplication<App>,
  accessToken: string,
): Promise<{ id: number }> {
  const response = await request(app.getHttpServer())
    .post('/projects')
    .set(bearer(accessToken))
    .send({
      name: 'Proyecto E2E',
      description: 'Descripción del proyecto',
      context: 'Contexto del proyecto',
      namep: 'Proponente E2E',
      correo: uniqueEmail('proponente'),
      isPrivate: true,
      submissionConsentAt: new Date().toISOString(),
    })
    .expect(201);

  return response.body as { id: number };
}

/** Fecha ISO en el futuro, para `dueDate` de hitos y entregas. */
export function futureIsoDate(days = 30): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
