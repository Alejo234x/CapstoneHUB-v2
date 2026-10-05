"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getProjectById } from "../../services/projects";
import { ProjectDetails } from "../../services/schemas";

type UseProjectDetailsResult = {
  project: ProjectDetails | null;
  loading: boolean;
  status: number | undefined;
  error: string | null;
  reload: () => void;
  refresh: () => Promise<void>;
};

/**
 * Carga el detalle de un proyecto y expone el estado HTTP cuando la respuesta
 * no es exitosa, para que la vista distinga entre "no existe", "sin acceso" y
 * "servicio no disponible". `reload` reintenta la carga (mostrando el estado de
 * carga) y `refresh` recarga los datos en segundo plano, sin parpadeo, para que
 * los paneles reflejen sus cambios tras una mutación.
 */
export function useProjectDetails(id: string): UseProjectDetailsResult {
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);

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

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    const {
      project: nextProject,
      status: nextStatus,
      error: nextError,
    } = await getProjectById(id);

    if (requestId !== requestIdRef.current) {
      return;
    }

    setProject(nextProject ?? null);
    setStatus(nextError ? nextStatus : undefined);
    setError(nextError ?? null);
  }, [id]);

  return { project, loading, status, error, reload, refresh };
}
