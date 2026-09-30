import { readBackendMessage } from "@/lib/http";

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

const AUTH_STORAGE_KEY = "capstonehub.auth.session";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadAuthSession(): AuthSession | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const rawSession = storage.getItem(AUTH_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthToken(): string | null {
  return loadAuthSession()?.accessToken ?? null;
}

async function requestAuthSession(
  path: string,
  payload: unknown,
): Promise<AuthSession> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readBackendMessage(response));
  }

  return (await response.json()) as AuthSession;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  return requestAuthSession("/api/auth/login", payload);
}

export async function registerUser(payload: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  return requestAuthSession("/api/auth/register", payload);
}

export async function getUsers(): Promise<AuthUser[]> {
  const token = getAuthToken();

  const response = await fetch("/api/auth/users", {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readBackendMessage(response));
  }

  return (await response.json()) as AuthUser[];
}

export async function createUser(payload: {
  fullName: string;
  email: string;
  password: string;
  roles: string[];
}): Promise<AuthUser> {
  const token = getAuthToken();

  const response = await fetch("/api/auth/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readBackendMessage(response));
  }

  return (await response.json()) as AuthUser;
}

export async function updateUserRoles(
  userId: number,
  roles: string[],
): Promise<AuthUser> {
  const token = getAuthToken();

  const response = await fetch(`/api/auth/users/${userId}/roles`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ roles }),
  });

  if (!response.ok) {
    throw new Error(await readBackendMessage(response));
  }

  return (await response.json()) as AuthUser;
}
