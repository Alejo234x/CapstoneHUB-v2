import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import {
  bearer,
  registerUser,
  uniqueEmail,
  userWithRole,
} from './helpers/auth';
import { createProject } from './helpers/projects';
import { ActorRole, UserRole } from '../src/generated/prisma/client';

describe('Projects (e2e)', () => {
  const getApp = useTestApp();

  it('crea un proyecto privado, lo lista y lee su detalle', async () => {
    const app = getApp();
    const { accessToken } = await registerUser(app, uniqueEmail('owner'));
    const { id } = await createProject(app, accessToken);
    expect(id).toBeGreaterThan(0);

    const list = await request(app.getHttpServer())
      .get('/projects')
      .set(bearer(accessToken))
      .expect(200);

    expect(
      (list.body as { id: number }[]).some((project) => project.id === id),
    ).toBe(true);

    const detail = await request(app.getHttpServer())
      .get(`/projects/${id}`)
      .set(bearer(accessToken))
      .expect(200);

    expect(detail.body).toMatchObject({ id, name: 'Proyecto E2E' });
  });

  it('oculta un proyecto privado a visitantes anónimos', async () => {
    const app = getApp();
    const { accessToken } = await registerUser(app, uniqueEmail('owner'));
    const { id } = await createProject(app, accessToken);

    await request(app.getHttpServer()).get(`/projects/${id}`).expect(404);
  });

  it('permite a un evaluador global asignar actores sin estar asignado', async () => {
    const app = getApp();
    const { accessToken } = await registerUser(app, uniqueEmail('owner'));
    const { id } = await createProject(app, accessToken);
    const evaluator = await userWithRole(app, UserRole.evaluator);
    const student = await userWithRole(app, UserRole.student);

    await request(app.getHttpServer())
      .post(`/projects/${id}/actors`)
      .set(bearer(evaluator.accessToken))
      .send({ userId: student.user.id, role: ActorRole.student })
      .expect(201);

    const assignable = await request(app.getHttpServer())
      .get(`/projects/${id}/assignable-users`)
      .set(bearer(evaluator.accessToken))
      .expect(200);

    expect(
      (assignable.body as { id: number }[]).some(
        (candidate) => candidate.id === student.user.id,
      ),
    ).toBe(true);
  });
});
