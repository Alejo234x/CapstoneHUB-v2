import { apiErrorMessage, apiRequest, apiRequestVoid } from "@/lib/http";

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
};

/**
 * Sesión del cliente. El token de acceso vive en una cookie httpOnly que
 * gestiona el BFF, así que aquí solo queda el usuario.
 */
export type AuthSession = {
  user: AuthUser;
};

async function requestSessionUser(
  path: string,
  payload: unknown,
): Promise<AuthUser> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await apiErrorMessage(response));
  }

  const data = (await response.json()) as { user: AuthUser };

  return data.user;
}

export function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  return requestSessionUser("/api/auth/login", payload);
}

export function registerUser(payload: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  return requestSessionUser("/api/auth/register", payload);
}

/** Usuario de la sesión actual, o `null` si la cookie no es válida. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", { cache: "no-store" });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await apiErrorMessage(response));
  }

  return (await response.json()) as AuthUser;
}

/** Cierra la sesión: el BFF limpia la cookie httpOnly. */
export function logoutUser(): Promise<Response> {
  return fetch("/api/auth/logout", { method: "POST" });
}

export function getUsers(): Promise<AuthUser[]> {
  return apiRequest<AuthUser[]>("/api/auth/users", {
    action: "consultar los usuarios",
  });
}

export function createUser(payload: {
  fullName: string;
  email: string;
  password: string;
  roles: string[];
}): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/auth/users", {
    method: "POST",
    body: payload,
    action: "crear el usuario",
  });
}

export function updateUserRoles(
  userId: number,
  roles: string[],
): Promise<AuthUser> {
  return apiRequest<AuthUser>(`/api/auth/users/${userId}/roles`, {
    method: "PATCH",
    body: { roles },
    action: "actualizar los roles del usuario",
  });
}

export function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  return apiRequestVoid("/api/auth/me/password", {
    method: "PATCH",
    body: payload,
    action: "cambiar la contraseña",
  });
}
