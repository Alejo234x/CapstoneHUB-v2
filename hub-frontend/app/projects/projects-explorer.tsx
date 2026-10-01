"use client";

import { useEffect, useState } from "react";
import { getProjects } from "../services/projects";
import { ProjectItem } from "../services/schemas";
import ProjectsTable from "./projects-table";
import ServiceUnavailable from "../components/service-unavailable";
import AccessNotice from "../components/access-notice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { isServiceUnavailableStatus } from "@/lib/http";

export default function ProjectsExplorer() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);

        const {
          projects: nextProjects,
          error: nextError,
          status: nextStatus,
        } = await getProjects();

        if (!active) {
          return;
        }

        setProjects(nextProjects);
        setError(nextError ?? null);
        setStatus(nextStatus);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isServiceUnavailableStatus(status)) {
    return (
      <ServiceUnavailable
        className="mb-6"
        message={error}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }

  if (status === 401) {
    return (
      <AccessNotice
        className="rounded-2xl"
        title="Inicia sesión para ver los proyectos"
        message="Solo los proyectos finalizados y públicos se pueden consultar sin cuenta. Inicia sesión para ver tus proyectos propuestos y asignados."
      />
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (projects.length === 0) {
    return (
      <Empty className="rounded-2xl bg-card shadow-sm ring-1 ring-utb-blue/10">
        <EmptyHeader>
          <EmptyTitle>No hay proyectos</EmptyTitle>
          <EmptyDescription>
            No se encontraron proyectos visibles para tu cuenta. Propón uno nuevo
            para empezar.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <ProjectsTable projects={projects} />;
}
