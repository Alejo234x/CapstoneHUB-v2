"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

// Centraliza el patrón "cargar al montar + loading/error + reintento" para
// recursos remotos. Recibe la función de carga y dependencias opcionales que
// disparan una nueva carga.
export function useApiResource<T>(
  load: () => Promise<T>,
  deps: unknown[] = [],
): State<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Se conserva la última función de carga para no reiniciar el efecto en cada
  // render cuando el consumidor pasa una función inline.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const result = await loadRef.current();

        if (!active) {
          return;
        }

        setData(result);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error ? loadError.message : "No se pudo cargar",
        );
        setData(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
    // Las dependencias las define el consumidor; además se recarga al pulsar
    // reintentar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { data, loading, error, reload };
}
