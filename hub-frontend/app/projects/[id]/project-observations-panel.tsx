"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createProjectObservation } from "../../services/projects";
import { ProjectObservationItem } from "../../services/schemas";
import { useAuth } from "../../components/auth-provider";

import { Button } from "@/components/ui/button";

type ProjectActorAssignment = {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  assignedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
};

type ProjectObservationsPanelProps = {
  projectId: number;
  observations: ProjectObservationItem[];
  assignments: ProjectActorAssignment[];
};

function canCreateObservation(
  userId: number,
  assignments: ProjectActorAssignment[],
): boolean {
  return assignments.some((assignment) => assignment.userId === userId);
}

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default function ProjectObservationsPanel({
  projectId,
  observations,
  assignments,
}: ProjectObservationsPanelProps) {
  const router = useRouter();
  const { session, isAuthenticated, ready } = useAuth();

  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentUser = session?.user;

  const canCreate =
    currentUser !== undefined &&
    canCreateObservation(currentUser.id, assignments);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setErrorMessage("Escribe una observación antes de enviarla.");
      return;
    }

    startTransition(async () => {
      try {
        await createProjectObservation(projectId, trimmedContent);

        setContent("");
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo crear la observación",
        );
      }
    });
  }

  if (!ready) {
    return (
      <div className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Cargando acceso...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-6 space-y-4">
        <div className="border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Inicia sesión para agregar observaciones al proyecto.
          <div className="mt-3">
            <Link href="/login">
              <Button>Iniciar sesión</Button>
            </Link>
          </div>
        </div>

        <ObservationsList observations={observations} />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {canCreate ? (
        <form
          onSubmit={handleSubmit}
          className="border border-slate-200 bg-slate-50 p-4"
        >
          <label
            htmlFor="project-observation"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
          >
            Nueva observación
          </label>

          <textarea
            id="project-observation"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Escribe una observación sobre el proyecto..."
            rows={4}
            disabled={isPending}
            className="mt-2 flex w-full rounded-md border border-slate-300 bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={isPending || !content.trim()}>
              {isPending ? "Guardando..." : "Agregar observación"}
            </Button>
          </div>

          {errorMessage ? (
            <p className="mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No tienes permisos para agregar observaciones a este proyecto.
        </div>
      )}

      <ObservationsList observations={observations} />
    </div>
  );
}

function ObservationsList({
  observations,
}: {
  observations: ProjectObservationItem[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Observaciones
      </h3>

      <div className="mt-4 space-y-3">
        {observations.length === 0 ? (
          <p className="text-sm text-slate-600">
            No hay observaciones registradas.
          </p>
        ) : (
          observations.map((observation) => (
            <article
              key={observation.id}
              className="border border-slate-200 bg-white p-4"
            >
              <p className="whitespace-pre-wrap text-sm text-slate-800">
                {observation.content}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                {formatDate(observation.createdAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
