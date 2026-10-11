import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { closeTestApp, createTestApp } from './helpers/e2e';
import {
  adminSession,
  bearer,
  registerUser,
  uniqueEmail,
  userWithRole,
} from './helpers/auth';
import { ActorRole, UserRole } from '../src/generated/prisma/client';

function projectPayload() {
  return {
    name: 'Proyecto Workflow E2E',
    description: 'Descripción del proyecto',
    context: 'Contexto del proyecto',
    namep: 'Proponente E2E',
    correo: uniqueEmail('proponente'),
    isPrivate: true,
    submissionConsentAt: new Date().toISOString(),
  };
}

describe('Projects workflow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('recorre los estados y avanza de fase tras las aprobaciones', async () => {
    const admin = await adminSession(app);
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('propietario'),
    );

    const created = await request(app.getHttpServer())
      .post('/projects')
      .set(bearer(proposerToken))
      .send(projectPayload())
      .expect(201);
    const projectId = (created.body as { id: number }).id;

    // El admin impulsa el ciclo: proposed -> under_review -> approved -> in_progress.
    for (const nextStatus of [
      'under_review',
      'approved',
      'in_progress',
    ] as const) {
      const updated = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/status`)
        .set(bearer(admin.accessToken))
        .send({ status: nextStatus })
        .expect(200);

      expect((updated.body as { status: string }).status).toBe(nextStatus);
    }

    // Evaluador con rol global, asignado al proyecto.
    const evaluator = await userWithRole(app, UserRole.evaluator);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/actors`)
      .set(bearer(admin.accessToken))
      .send({ userId: evaluator.user.id, role: ActorRole.evaluator })
      .expect(201);

    // Sin aprobaciones no se puede avanzar.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/phase/advance`)
      .set(bearer(admin.accessToken))
      .expect(409);

    // Proponente y evaluador dan el visto bueno.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/phase/approvals`)
      .set(bearer(proposerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/phase/approvals`)
      .set(bearer(evaluator.accessToken))
      .expect(201);

    // Ahora sí avanza a semester_2.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/phase/advance`)
      .set(bearer(admin.accessToken))
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set(bearer(proposerToken))
      .expect(200);

    expect((detail.body as { phase: string }).phase).toBe('semester_2');
  });

  it('rechaza cambiar el estado a un usuario no autorizado', async () => {
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('propietario'),
    );
    const created = await request(app.getHttpServer())
      .post('/projects')
      .set(bearer(proposerToken))
      .send(projectPayload())
      .expect(201);
    const projectId = (created.body as { id: number }).id;

    // Un proponente no puede mover el proyecto a revisión (esa transición es
    // de evaluador/admin).
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/status`)
      .set(bearer(proposerToken))
      .send({ status: 'under_review' })
      .expect(403);
  });
});
