import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/prisma.service';
import { UserRole } from '../../src/generated/prisma/client';

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
};

/** Contraseña de fixture para los tests e2e (no es un secreto real). */
export const TEST_PASSWORD = 'password123'; // NOSONAR

/** Contraseña nueva usada al probar el cambio de contraseña. */
export const TEST_NEW_PASSWORD = 'nueva-password-123'; // NOSONAR

/** Correo único por ejecución, para no colisionar entre corridas. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
}

export async function registerUser(
  app: INestApplication<App>,
  email: string,
  password = TEST_PASSWORD,
): Promise<AuthSession> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ fullName: 'E2E User', email, password })
    .expect(201);

  return response.body as AuthSession;
}

export async function loginUser(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<AuthSession> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(201);

  return response.body as AuthSession;
}

/** Cabecera `Authorization: Bearer <token>`. */
export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** Añade un rol global al usuario directamente en la base de datos. */
export async function promoteRole(
  app: INestApplication<App>,
  userId: number,
  role: UserRole,
): Promise<void> {
  const prisma = app.get(PrismaService);

  await prisma.userRoleAssignment.create({ data: { userId, role } });
}

/** Registra un usuario y le asigna el rol global indicado (re-login incluido). */
export async function userWithRole(
  app: INestApplication<App>,
  role: UserRole,
): Promise<AuthSession> {
  const { user } = await registerUser(app, uniqueEmail(role));
  await promoteRole(app, user.id, role);

  return loginUser(app, user.email, TEST_PASSWORD);
}

/** Crea un usuario administrador (registro + promoción a `admin`). */
export async function adminSession(
  app: INestApplication<App>,
): Promise<AuthSession> {
  return userWithRole(app, UserRole.admin);
}
