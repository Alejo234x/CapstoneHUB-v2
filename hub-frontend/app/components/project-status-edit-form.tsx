"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectStatus } from "../services/projects";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const projectStatuses = [
  { value: "proposed", label: "Propuesto" },
  { value: "under_review", label: "En revisión" },
  { value: "approved", label: "Aprobado" },
  { value: "assigned", label: "Asignado" },
  { value: "in_progress", label: "En progreso" },
  { value: "closed", label: "Cerrado" },
  { value: "rejected", label: "Rechazado" },
] as const;

type ProjectAssignment = {
  userId: number;
  role: string;
};

type ProjectStatusEditFormProps = {
  projectId: number;
  currentStatus: string;
  assignments: ProjectAssignment[];
};

function canManageStatus(
  userId: number,
  roles: string[],
  currentStatus: string,
  assignments: ProjectAssignment[],
): boolean {
  if (roles.includes("admin")) {
    return true;
  }

  const isAssignedEvaluator = assignments.some(
    (assignment) =>
      assignment.userId === userId &&
      assignment.role === "evaluator",
  );

  const isAssignedCoordinator = assignments.some(
    (assignment) =>
      assignment.userId === userId &&
      assignment.role === "coordinator",
  );

  if (currentStatus === "proposed" || currentStatus === "under_review") {
    return isAssignedEvaluator;
  }

  return isAssignedEvaluator || isAssignedCoordinator;
}

function getAvailableStatuses(
  roles: string[],
  currentStatus: string,
): ReadonlyArray<(typeof projectStatuses)[number]> {
  if (roles.includes("admin")) {
    return projectStatuses;
  }

  if (
    roles.includes("evaluator") &&
    (currentStatus === "proposed" ||
      currentStatus === "under_review")
  ) {
    return projectStatuses;
  }

  if (roles.includes("evaluator")) {
    return projectStatuses.filter(
      (projectStatus) => projectStatus.value === "rejected",
    );
  }

  return projectStatuses.filter(
    (projectStatus) => projectStatus.value !== "rejected",
  );
}

export default function ProjectStatusEditForm({
  projectId,
  currentStatus,
  assignments,
}: ProjectStatusEditFormProps) {
  const router = useRouter();
  const { session, isAuthenticated, ready } = useAuth();

  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!ready) {
    return null;
  }

  if (!isAuthenticated || !session) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Actualizar estado del proyecto</CardTitle>
          <CardDescription>
            Inicia sesión para cambiar el estado de este proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={<Link href="/login">Iniciar sesión</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  const canManage = canManageStatus(
    session.user.id,
    session.user.roles,
    currentStatus,
    assignments,
  );

  if (!canManage) {
    return null;
  }

  const availableStatuses = getAvailableStatuses(
    session.user.roles,
    currentStatus,
  );

  const isAdmin = session.user.roles.includes("admin");
  const isReasonRequired = !isAdmin;
  const trimmedReason = reason.trim();
  const isSubmitDisabled =
    isPending ||
    status === currentStatus ||
    (isReasonRequired && trimmedReason.length === 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (isReasonRequired && trimmedReason.length === 0) {
      setErrorMessage(
        "Debes indicar el motivo del cambio de estado antes de guardar.",
      );
      return;
    }

    startTransition(async () => {
      try {
        await updateProjectStatus(String(projectId), status, trimmedReason);
        setReason("");
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el estado del proyecto",
        );
      }
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Actualizar estado del proyecto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="status">Estado</FieldLabel>

              <Select
                value={status}
                onValueChange={(value) => {
                  if (value) {
                    setStatus(value);
                  }
                }}
                disabled={isPending}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue>
                    {projectStatuses.find(
                      (projectStatus) => projectStatus.value === status,
                    )?.label ?? "Selecciona un estado"}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {availableStatuses.map((projectStatus) => (
                    <SelectItem
                      key={projectStatus.value}
                      value={projectStatus.value}
                    >
                      {projectStatus.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="status-reason">Motivo del cambio</FieldLabel>

              <Textarea
                id="status-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  isReasonRequired
                    ? "Describe el motivo del cambio de estado..."
                    : "Motivo del cambio (opcional para administradores)"
                }
                rows={4}
                disabled={isPending}
              />

              <FieldDescription>
                {isReasonRequired
                  ? "Obligatorio: el historial guardará este motivo junto al cambio."
                  : "Opcional para administradores; se registrará en el historial."}
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitDisabled}>
                {isPending && <Spinner data-icon="inline-start" />}
                {isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>

            {errorMessage ? (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
