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
import { createProject } from './helpers/projects';
import { ActorRole, UserRole } from '../src/generated/prisma/client';

describe('Observations (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('agrega y lista observaciones de un proyecto', async () => {
    const admin = await adminSession(app);
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('prop'),
    );
    const evaluator = await userWithRole(app, UserRole.evaluator);
    const { id: projectId } = await createProject(app, proposerToken);

    // El evaluador debe estar asignado para poder comentar.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/actors`)
      .set(bearer(admin.accessToken))
      .send({ userId: evaluator.user.id, role: ActorRole.evaluator })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/observations`)
      .set(bearer(evaluator.accessToken))
      .send({ content: 'Observación de prueba' })
      .expect(201);

    expect((created.body as { content: string }).content).toBe(
      'Observación de prueba',
    );
    expect((created.body as { author: { id: number } }).author.id).toBe(
      evaluator.user.id,
    );

    const list = await request(app.getHttpServer())
      .get(`/projects/${projectId}/observations`)
      .set(bearer(proposerToken))
      .expect(200);

    expect(
      (list.body as { id: number }[]).some(
        (observation) => observation.id === (created.body as { id: number }).id,
      ),
    ).toBe(true);
  });

  it('rechaza a un usuario ajeno listar las observaciones', async () => {
    const { accessToken } = await registerUser(app, uniqueEmail('prop'));
    const { id: projectId } = await createProject(app, accessToken);

    const { accessToken: strangerToken } = await registerUser(
      app,
      uniqueEmail('ajeno'),
    );

    await request(app.getHttpServer())
      .get(`/projects/${projectId}/observations`)
      .set(bearer(strangerToken))
      .expect(403);
  });
});
