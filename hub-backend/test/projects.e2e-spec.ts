import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import { bearer, registerUser, uniqueEmail } from './helpers/auth';
import { createProject } from './helpers/projects';

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
});
