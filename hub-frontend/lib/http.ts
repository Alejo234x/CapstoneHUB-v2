/**
 * Utilidades compartidas para traducir respuestas fallidas de la API a errores
 * con mensajes consistentes.
 */

export type ApiErrorOptions = {
  // Frase verbal que describe la acción, p. ej. "editar el proyecto".
  action: string;
  // Mensaje específico para respuestas 409 cuando el estado no lo permite.
  conflictMessage?: string;
};

export async function readBackendMessage(
  response: Response,
  fallback = `Backend responded with status ${response.status}`,
): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(body.message)) {
      return body.message.join(" ");
    }

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // La respuesta no era JSON; se usa el mensaje genérico.
  }

  return fallback;
}

export async function apiRequestError(
  response: Response,
  { action, conflictMessage }: ApiErrorOptions,
): Promise<Error> {
  if (response.status === 401) {
    return new Error(`Inicia sesión para ${action}.`);
  }

  if (response.status === 403) {
    return new Error(`No tienes permisos para ${action}.`);
  }

  if (response.status === 409 && conflictMessage) {
    return new Error(conflictMessage);
  }

  return new Error(await readBackendMessage(response));
}

export async function ensureOk(
  response: Response,
  options: ApiErrorOptions,
): Promise<void> {
  if (!response.ok) {
    throw await apiRequestError(response, options);
  }
}
