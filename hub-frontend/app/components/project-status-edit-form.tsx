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
import { Button } from "@/components/ui/button";
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
      <div className="w-full border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Actualizar estado del proyecto
        </h2>

        <p className="mt-3 text-sm text-slate-600">
          Inicia sesión para cambiar el estado de este proyecto.
        </p>

        <Link
          href="/login"
          className="mt-4 inline-flex items-center justify-center border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Iniciar sesión
        </Link>
      </div>
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
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-6 border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <label
          htmlFor="status"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500"
        >
          Actualizar estado del proyecto
        </label>

        <Select
          value={status}
          onValueChange={(value) => {
            if (value) {
              setStatus(value);
            }
          }}
          disabled={isPending}
        >
          <SelectTrigger className="mt-3 w-full">
            <SelectValue placeholder="Selecciona un estado" />
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
      </div>

      <div>
        <label
          htmlFor="status-reason"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500"
        >
          Motivo del cambio
        </label>

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
          className="mt-3"
        />

        <p className="mt-2 text-xs text-slate-500">
          {isReasonRequired
            ? "Obligatorio: el historial guardará este motivo junto al cambio."
            : "Opcional para administradores; se registrará en el historial."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitDisabled}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      {errorMessage ? (
        <p className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}