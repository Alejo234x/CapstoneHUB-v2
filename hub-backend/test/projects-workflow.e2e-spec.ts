import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import {
  adminSession,
  bearer,
  registerUser,
  uniqueEmail,
  userWithRole,
} from './helpers/auth';
import { ActorRole, UserRole } from '../src/generated/prisma/client';
import { createProject } from './helpers/projects';

describe('Projects workflow (e2e)', () => {
  const getApp = useTestApp();

  it('recorre los estados y avanza de fase tras las aprobaciones', async () => {
    const app = getApp();
    const admin = await adminSession(app);
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('propietario'),
    );

    const { id: projectId } = await createProject(app, proposerToken);

    // El admin impulsa el ciclo de forma secuencial (cada transición depende
    // de la anterior): proposed -> under_review -> approved -> in_progress.
    const toUnderReview = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/status`)
      .set(bearer(admin.accessToken))
      .send({ status: 'under_review' })
      .expect(200);
    expect((toUnderReview.body as { status: string }).status).toBe(
      'under_review',
    );

    const toApproved = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/status`)
      .set(bearer(admin.accessToken))
      .send({ status: 'approved' })
      .expect(200);
    expect((toApproved.body as { status: string }).status).toBe('approved');

    const toInProgress = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/status`)
      .set(bearer(admin.accessToken))
      .send({ status: 'in_progress' })
      .expect(200);
    expect((toInProgress.body as { status: string }).status).toBe(
      'in_progress',
    );

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
    const app = getApp();
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('propietario'),
    );
    const { id: projectId } = await createProject(app, proposerToken);

    // Un proponente no puede mover el proyecto a revisión (esa transición es
    // de evaluador/admin).
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/status`)
      .set(bearer(proposerToken))
      .send({ status: 'under_review' })
      .expect(403);
  });
});
