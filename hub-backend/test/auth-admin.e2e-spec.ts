import request from 'supertest';
import { useTestApp } from './helpers/e2e';
import {
  adminSession,
  bearer,
  registerUser,
  uniqueEmail,
} from './helpers/auth';
import { UserRole } from '../src/generated/prisma/client';

describe('Auth admin (e2e)', () => {
  const getApp = useTestApp();

  it('rechaza registrar un correo ya existente', async () => {
    const app = getApp();
    const email = uniqueEmail();
    await registerUser(app, email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ fullName: 'Duplicado', email, password: 'password123' })
      .expect(400);
  });

  it('permite al admin listar usuarios', async () => {
    const app = getApp();
    const admin = await adminSession(app);

    const response = await request(app.getHttpServer())
      .get('/auth/users')
      .set(bearer(admin.accessToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(
      (response.body as { id: number }[]).some((u) => u.id === admin.user.id),
    ).toBe(true);
  });

  it('permite al admin crear un usuario y cambiar sus roles', async () => {
    const app = getApp();
    const admin = await adminSession(app);
    const email = uniqueEmail('creado');

    const created = await request(app.getHttpServer())
      .post('/auth/users')
      .set(bearer(admin.accessToken))
      .send({
        fullName: 'Usuario creado',
        email,
        password: 'password123',
        roles: [UserRole.student],
      })
      .expect(201);

    const id = (created.body as { id: number }).id;
    expect((created.body as { roles: string[] }).roles).toEqual([
      UserRole.student,
    ]);

    const updated = await request(app.getHttpServer())
      .patch(`/auth/users/${id}/roles`)
      .set(bearer(admin.accessToken))
      .send({ roles: [UserRole.coordinator] })
      .expect(200);

    expect((updated.body as { roles: string[] }).roles).toEqual([
      UserRole.coordinator,
    ]);
  });

  it('rechaza operaciones de admin a un usuario normal', async () => {
    const app = getApp();
    const { accessToken } = await registerUser(app, uniqueEmail());

    await request(app.getHttpServer())
      .get('/auth/users')
      .set(bearer(accessToken))
      .expect(403);
  });
});
