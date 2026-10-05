"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProjectDetails } from "../../services/schemas";
import { formatDate, formatPhase } from "../../services/utils";
import { advanceProjectPhase } from "../../services/projects";
import { useAuth } from "../../components/auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { RiArrowRightLine, RiErrorWarningLine } from "@remixicon/react";

type ProjectPhaseActionsProps = {
  readonly project: ProjectDetails;
  readonly assignments: NonNullable<ProjectDetails["actorAssignments"]>;
};

/**
 * Acción para avanzar el proyecto al siguiente semestre. Solo se muestra a
 * administradores y coordinadores asignados mientras el proyecto está en
 * progreso; exige que los hitos mínimos de la fase actual estén completos.
 */
export default function ProjectPhaseActions({
  project,
  assignments,
}: ProjectPhaseActionsProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = useMemo(() => {
    if (!session) {
      return false;
    }

    if (session.user.roles.includes("admin")) {
      return true;
    }

    return (
      session.user.roles.includes("coordinator") &&
      assignments.some(
        (assignment) =>
          assignment.userId === session.user.id &&
          assignment.role === "coordinator",
      )
    );
  }, [session, assignments]);

  const currentPhase = project.phase ?? null;

  const pendingMinimums = useMemo(
    () =>
      (project.milestones ?? []).filter(
        (milestone) =>
          milestone.isMinimum &&
          !milestone.completed &&
          (milestone.phase === currentPhase || milestone.phase == null),
      ),
    [project.milestones, currentPhase],
  );

  if (!canManage || project.status !== "in_progress") {
    return null;
  }

  const isFinalPhase = currentPhase === "semester_2";
  const isBlocked = pendingMinimums.length > 0;
  const nextLabel =
    currentPhase === "semester_1" ? "Semestre 2" : "siguiente fase";

  function handleAdvance() {
    setConfirmOpen(false);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await advanceProjectPhase(String(project.id));
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo avanzar la fase del proyecto",
        );
      }
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Fase del proyecto</CardTitle>
        <CardDescription>
          Fase actual:{" "}
          <Badge variant="outline">{formatPhase(currentPhase)}</Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {isFinalPhase ? (
          <Alert>
            <AlertDescription>
              El proyecto se encuentra en su última fase. Para finalizarlo,
              cambia el estado a «Cerrado».
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {isBlocked ? (
              <Alert variant="destructive">
                <RiErrorWarningLine />
                <AlertDescription>
                  Completa los hitos mínimos de la fase actual antes de avanzar:
                  <ul className="mt-2 list-disc pl-5">
                    {pendingMinimums.map((milestone) => (
                      <li key={milestone.id}>
                        {milestone.title} · vence{" "}
                        {formatDate(milestone.dueDate)}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                Los hitos mínimos de la fase actual están completos. Puedes
                avanzar al {nextLabel}.
              </p>
            )}

            <div>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={isPending || isBlocked}
              >
                {isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RiArrowRightLine data-icon="inline-start" />
                )}
                {isPending ? "Avanzando..." : `Avanzar a ${nextLabel}`}
              </Button>
            </div>
          </>
        )}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avanzar de fase</AlertDialogTitle>
            <AlertDialogDescription>
              El proyecto pasará de {formatPhase(currentPhase)} a {nextLabel}. La
              acción se registrará en el historial de cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
