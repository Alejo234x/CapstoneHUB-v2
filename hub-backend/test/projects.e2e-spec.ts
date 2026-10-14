import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import {
  adminSession,
  bearer,
  registerUser,
  uniqueEmail,
  userWithRole,
} from './helpers/auth';
import {
  createProject,
  createProjectWithProposer,
  transitionProjectStatus,
} from './helpers/projects';
import {
  ActorRole,
  ProjectStatus,
  UserRole,
} from '../src/generated/prisma/client';

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

  it('publica los proyectos no privados aprobados para usuarios con sesión', async () => {
    const app = getApp();
    const admin = await adminSession(app);
    const student = await userWithRole(app, UserRole.student);
    const { projectId } = await createProjectWithProposer(app, false);

    // Mientras siga en propuesta no es público para nadie.
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .expect(404);

    const pendingList = await request(app.getHttpServer())
      .get('/projects')
      .set(bearer(student.accessToken))
      .expect(200);
    expect(
      (pendingList.body as { id: number }[]).some(
        (project) => project.id === projectId,
      ),
    ).toBe(false);

    await transitionProjectStatus(
      app,
      projectId,
      admin.accessToken,
      ProjectStatus.approved,
    );

    // Sin sesión solo se publican los finalizados.
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .expect(404);

    // Con sesión aparece en el listado y el detalle va sin datos sensibles.
    const list = await request(app.getHttpServer())
      .get('/projects')
      .set(bearer(student.accessToken))
      .expect(200);
    expect(
      (list.body as { id: number }[]).some(
        (project) => project.id === projectId,
      ),
    ).toBe(true);

    const detail = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set(bearer(student.accessToken))
      .expect(200);
    expect(detail.body).toMatchObject({
      id: projectId,
      canViewSensitiveData: false,
    });
  });

  it('nunca publica los proyectos rechazados aunque no sean privados', async () => {
    const app = getApp();
    const admin = await adminSession(app);
    const student = await userWithRole(app, UserRole.student);
    const { projectId } = await createProjectWithProposer(app, false);

    await transitionProjectStatus(
      app,
      projectId,
      admin.accessToken,
      ProjectStatus.rejected,
    );

    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .expect(404);

    const list = await request(app.getHttpServer())
      .get('/projects')
      .set(bearer(student.accessToken))
      .expect(200);
    expect(
      (list.body as { id: number }[]).some(
        (project) => project.id === projectId,
      ),
    ).toBe(false);
  });
});
