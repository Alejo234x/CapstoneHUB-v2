import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import {
  bearer,
  registerUser,
  uniqueEmail,
  userWithRole,
} from './helpers/auth';
import { createProject, futureIsoDate } from './helpers/projects';
import { UserRole } from '../src/generated/prisma/client';

describe('Reports (e2e)', () => {
  const getApp = useTestApp();

  it('un evaluador global gestiona y revisa entregas sin estar asignado', async () => {
    const app = getApp();
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('prop'),
    );
    const evaluator = await userWithRole(app, UserRole.evaluator);
    const { id: projectId } = await createProject(app, proposerToken);

    // El evaluador global crea la entrega sin estar asignado al proyecto.
    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports`)
      .set(bearer(evaluator.accessToken))
      .send({ title: 'Informe final', dueDate: futureIsoDate(), type: 'text' })
      .expect(201);

    const reportId = (created.body as { id: number }).id;

    // El proponente (miembro del proyecto) agrega contenido y la envía.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports/${reportId}/contents`)
      .set(bearer(proposerToken))
      .send({ kind: 'text', textContent: 'Contenido de prueba' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports/${reportId}/submit`)
      .set(bearer(proposerToken))
      .expect(201);

    // El evaluador global la revisa sin asignación.
    const reviewed = await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports/${reportId}/review`)
      .set(bearer(evaluator.accessToken))
      .send({ decision: 'accepted', comment: 'Cumple con lo solicitado' })
      .expect(201);

    expect(reviewed.body).toMatchObject({
      id: reportId,
      status: 'accepted',
    });
  });

  it('rechaza entregas de un usuario ajeno al proyecto', async () => {
    const app = getApp();
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('prop'),
    );
    const { id: projectId } = await createProject(app, proposerToken);
    const { accessToken: strangerToken } = await registerUser(
      app,
      uniqueEmail('ajeno'),
    );

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports`)
      .set(bearer(strangerToken))
      .send({ title: 'Entrega ajena', dueDate: futureIsoDate(), type: 'text' })
      .expect(403);
  });
});
