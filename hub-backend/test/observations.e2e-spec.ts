import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import {
  adminSession,
  bearer,
  registerUser,
  uniqueEmail,
  userWithRole,
} from './helpers/auth';
import { createProject } from './helpers/projects';
import { UserRole } from '../src/generated/prisma/client';

describe('Observations (e2e)', () => {
  const getApp = useTestApp();

  it('un evaluador global sin asignación agrega y lista observaciones', async () => {
    const app = getApp();
    const { accessToken: proposerToken } = await registerUser(
      app,
      uniqueEmail('prop'),
    );
    const evaluator = await userWithRole(app, UserRole.evaluator);
    const { id: projectId } = await createProject(app, proposerToken);

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

  it('un admin sin asignación también puede observar', async () => {
    const app = getApp();
    const admin = await adminSession(app);
    const { accessToken } = await registerUser(app, uniqueEmail('prop'));
    const { id: projectId } = await createProject(app, accessToken);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/observations`)
      .set(bearer(admin.accessToken))
      .send({ content: 'Revisión administrativa' })
      .expect(201);
  });

  it('rechaza a un usuario ajeno listar las observaciones', async () => {
    const app = getApp();
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

  it('rechaza a un usuario ajeno agregar observaciones', async () => {
    const app = getApp();
    const { accessToken } = await registerUser(app, uniqueEmail('prop'));
    const { id: projectId } = await createProject(app, accessToken);

    const { accessToken: strangerToken } = await registerUser(
      app,
      uniqueEmail('ajeno'),
    );

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/observations`)
      .set(bearer(strangerToken))
      .send({ content: 'No debería poder observar' })
      .expect(403);
  });

  it('no expone las observaciones de un proyecto público a terceros', async () => {
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

    // El detalle es público para usuarios con sesión, pero las secciones
    // sensibles siguen reservadas a los miembros.
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set(bearer(strangerToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/projects/${projectId}/observations`)
      .set(bearer(strangerToken))
      .expect(403);
  });
});
