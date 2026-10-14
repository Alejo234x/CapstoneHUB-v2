import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import {
  adminSession,
  bearer,
  registerUser,
  uniqueEmail,
  userWithRole,
} from './helpers/auth';
import { createProject, futureIsoDate } from './helpers/projects';
import { ActorRole, UserRole } from '../src/generated/prisma/client';

describe('Reports (e2e)', () => {
  const getApp = useTestApp();

  it('un evaluador global gestiona y revisa entregas y un estudiante asignado las envía', async () => {
    const app = getApp();
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('prop'),
    );
    const evaluator = await userWithRole(app, UserRole.evaluator);
    const student = await userWithRole(app, UserRole.student);
    const { id: projectId } = await createProject(app, proposerToken);

    // El evaluador global crea la entrega y asigna al estudiante sin estar
    // asignado al proyecto.
    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports`)
      .set(bearer(evaluator.accessToken))
      .send({ title: 'Informe final', dueDate: futureIsoDate(), type: 'text' })
      .expect(201);

    const reportId = (created.body as { id: number }).id;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/actors`)
      .set(bearer(evaluator.accessToken))
      .send({ userId: student.user.id, role: ActorRole.student })
      .expect(201);

    // El estudiante asignado prepara el contenido y envía la entrega.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports/${reportId}/contents`)
      .set(bearer(student.accessToken))
      .send({ kind: 'text', textContent: 'Contenido de prueba' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports/${reportId}/submit`)
      .set(bearer(student.accessToken))
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

  it('rechaza preparar o enviar entregas a proponentes y docentes', async () => {
    const app = getApp();
    const admin = await adminSession(app);
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('prop'),
    );
    const teacher = await userWithRole(app, UserRole.teacher);
    const { id: projectId } = await createProject(app, proposerToken);

    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/reports`)
      .set(bearer(admin.accessToken))
      .send({ title: 'Informe final', dueDate: futureIsoDate(), type: 'text' })
      .expect(201);

    const reportId = (created.body as { id: number }).id;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/actors`)
      .set(bearer(admin.accessToken))
      .send({ userId: teacher.user.id, role: ActorRole.teacher })
      .expect(201);

    for (const token of [proposerToken, teacher.accessToken]) {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/reports/${reportId}/contents`)
        .set(bearer(token))
        .send({ kind: 'text', textContent: 'Intento' })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/reports/${reportId}/submit`)
        .set(bearer(token))
        .expect(403);
    }
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

  it('no expone las entregas de un proyecto público a terceros', async () => {
    const app = getApp();
    const admin = await adminSession(app);
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('prop'),
    );
    const { accessToken: strangerToken } = await registerUser(
      app,
      uniqueEmail('ajeno'),
    );
    const { id: projectId } = await createProject(app, proposerToken, {
      isPrivate: false,
    });

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/status`)
      .set(bearer(admin.accessToken))
      .send({ status: 'approved' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/projects/${projectId}/reports`)
      .set(bearer(strangerToken))
      .expect(403);
  });
});
