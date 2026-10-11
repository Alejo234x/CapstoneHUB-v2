import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import {
  adminSession,
  bearer,
  registerUser,
  uniqueEmail,
} from './helpers/auth';
import { createProject, futureIsoDate } from './helpers/projects';

describe('Milestones (e2e)', () => {
  const getApp = useTestApp();

  it('gestiona hitos como admin y los lista el proponente', async () => {
    const app = getApp();
    const admin = await adminSession(app);
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('prop'),
    );
    const { id: projectId } = await createProject(app, proposerToken);

    const created = await request(app.getHttpServer())
      .post(`/projects/${projectId}/milestones`)
      .set(bearer(admin.accessToken))
      .send({
        title: 'Hito E2E',
        description: 'Descripción del hito',
        dueDate: futureIsoDate(),
        isMinimum: true,
      })
      .expect(201);

    const milestoneId = (created.body as { id: number }).id;
    expect((created.body as { title: string }).title).toBe('Hito E2E');

    const updated = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/milestones/${milestoneId}`)
      .set(bearer(admin.accessToken))
      .send({ completed: true })
      .expect(200);

    expect((updated.body as { completed: boolean }).completed).toBe(true);

    const list = await request(app.getHttpServer())
      .get(`/projects/${projectId}/milestones`)
      .set(bearer(proposerToken))
      .expect(200);

    expect(
      (list.body as { id: number }[]).some(
        (milestone) => milestone.id === milestoneId,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .delete(`/projects/${projectId}/milestones/${milestoneId}`)
      .set(bearer(admin.accessToken))
      .expect(200);
  });

  it('rechaza a un proponente crear hitos', async () => {
    const app = getApp();
    const { accessToken } = await registerUser(app, uniqueEmail('prop'));
    const { id: projectId } = await createProject(app, accessToken);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/milestones`)
      .set(bearer(accessToken))
      .send({ title: 'Hito no autorizado', dueDate: futureIsoDate() })
      .expect(403);
  });
});
