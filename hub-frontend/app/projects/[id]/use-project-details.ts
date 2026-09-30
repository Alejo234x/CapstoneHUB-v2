"use client";

import { useCallback, useEffect, useState } from "react";
import { getProjectById } from "../../services/projects";
import { ProjectDetails } from "../../services/schemas";

type UseProjectDetailsResult = {
  project: ProjectDetails | null;
  loading: boolean;
  status: number | undefined;
  error: string | null;
  reload: () => void;
};

/**
 * Carga el detalle de un proyecto y expone el estado HTTP cuando la respuesta
 * no es exitosa, para que la vista distinga entre "no existe", "sin acceso" y
 * "servicio no disponible". `reload` reintenta la carga.
 */
export function useProjectDetails(id: string): UseProjectDetailsResult {
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadProject() {
      try {
        setLoading(true);
        setError(null);

        const {
          project: nextProject,
          status: nextStatus,
          error: nextError,
        } = await getProjectById(id);

        if (!active) {
          return;
        }

        setProject(nextProject ?? null);
        setStatus(nextError ? nextStatus : undefined);
        setError(nextError ?? null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProject();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { project, loading, status, error, reload };
}
