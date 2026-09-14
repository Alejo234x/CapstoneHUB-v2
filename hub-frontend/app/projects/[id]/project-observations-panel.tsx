"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createProjectObservation } from "../../services/projects";
import { ProjectObservationItem } from "../../services/schemas";
import { getInitials } from "../../services/utils";
import { useAuth } from "../../components/auth-provider";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

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
        await createProjectObservation(String(projectId), trimmedContent);

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
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Cargando acceso...
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agregar observación</CardTitle>
            <CardDescription>
              Inicia sesión para agregar observaciones al proyecto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              render={<Link href="/login">Iniciar sesión</Link>}
            />
          </CardContent>
        </Card>

        <ObservationsList observations={observations} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva observación</CardTitle>
          <CardDescription>
            {canCreate
              ? "Comparte un comentario sobre el proyecto."
              : "No tienes permisos para agregar observaciones a este proyecto."}
          </CardDescription>
        </CardHeader>

        {canCreate ? (
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="project-observation">
                  Observación
                </FieldLabel>
                <Textarea
                  id="project-observation"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Escribe una observación sobre el proyecto..."
                  rows={4}
                  disabled={isPending}
                />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending || !content.trim()}>
                  {isPending ? "Guardando..." : "Agregar observación"}
                </Button>
              </div>

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}
            </form>
          </CardContent>
        ) : null}
      </Card>

      <ObservationsList observations={observations} />
    </div>
  );
}

function ObservationsList({
  observations,
}: {
  readonly observations: ProjectObservationItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Observaciones</CardTitle>
        <CardDescription>
          {observations.length === 0
            ? "No hay observaciones registradas."
            : `${observations.length} observación(es) registradas.`}
        </CardDescription>
      </CardHeader>

      {observations.length > 0 ? (
        <CardContent className="flex flex-col gap-3">
          {observations.map((observation) => (
            <div
              key={observation.id}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                    {observation.author
                      ? getInitials(observation.author.fullName)
                      : "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {observation.author?.fullName ?? "Usuario desconocido"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(observation.createdAt)}
                    </p>
                  </div>

                  {observation.author?.email ? (
                    <p className="text-xs text-muted-foreground">
                      {observation.author.email}
                    </p>
                  ) : null}

                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {observation.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
