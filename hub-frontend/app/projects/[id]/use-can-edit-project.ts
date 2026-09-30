"use client";

import { useMemo } from "react";
import { ProjectDetails } from "../../services/schemas";
import { useAuth } from "../../components/auth-provider";

/** Estados terminales en los que el proyecto pasa a ser de solo lectura. */
const READ_ONLY_STATUSES = new Set(["closed", "rejected"]);

/**
 * Indica si el espectador puede editar los datos del proyecto: solo
 * administradores y evaluadores globales, y nunca en proyectos cerrados o
 * rechazados. Es la comprobación de interfaz; el backend vuelve a validarlo.
 */
export function useCanEditProject(project: ProjectDetails | null): boolean {
  const { session, ready } = useAuth();

  return useMemo(() => {
    if (!project || !ready || !session) {
      return false;
    }

    const roles = session.user.roles;

    if (!roles.includes("admin") && !roles.includes("evaluator")) {
      return false;
    }

    return !READ_ONLY_STATUSES.has(project.status);
  }, [ready, session, project]);
}
