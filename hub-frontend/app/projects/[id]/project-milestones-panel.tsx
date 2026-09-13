"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProjectMilestone,
  deleteProjectMilestone,
  updateProjectMilestone,
} from "../../services/projects";
import { ProjectMilestoneItem } from "../../services/schemas";
import Link from "next/link";
import { useAuth } from "../../components/auth-provider";
import FormActions from "@/app/components/form-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RiAddLine,
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiPencilLine,
} from "@remixicon/react";

type ProjectMilestonesPanelProps = {
  projectId: number;
  milestones: ProjectMilestoneItem[];
  actorAssignments: {
    id: number;
    userId: number;
    role: string;
  }[];
};

type MilestoneFormState = {
  title: string;
  description: string;
  dueDate: string;
};

const emptyForm: MilestoneFormState = {
  title: "",
  description: "",
  dueDate: "",
};

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function toDateTimeLocal(dateValue: string): string {
  const date = new Date(dateValue);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isOverdue(milestone: ProjectMilestoneItem): boolean {
  if (milestone.completed) {
    return false;
  }

  return new Date(milestone.dueDate).getTime() < Date.now();
}

export default function ProjectMilestonesPanel({
  projectId,
  milestones,
  actorAssignments,
}: ProjectMilestonesPanelProps) {
  const router = useRouter();
  const { session, isAuthenticated, ready } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] =
    useState<ProjectMilestoneItem | null>(null);
  const [form, setForm] = useState<MilestoneFormState>(emptyForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailMilestone, setDetailMilestone] =
    useState<ProjectMilestoneItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canManage = useMemo(() => {
    if (!session) {
      return false;
    }

    const roles = session.user.roles;
    if (roles.includes("admin")) {
      return true;
    }

    return actorAssignments.some(
      (assignment) =>
        assignment.userId === session.user.id &&
        ((roles.includes("coordinator") && assignment.role === "coordinator") ||
          (roles.includes("evaluator") && assignment.role === "evaluator") ||
          (roles.includes("advisor") && assignment.role === "advisor")),
    );
  }, [session, actorAssignments]);

  const sortedMilestones = useMemo(
    () =>
      [...milestones].sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime() ||
          left.id - right.id,
      ),
    [milestones],
  );

  const completedCount = useMemo(
    () => milestones.filter((milestone) => milestone.completed).length,
    [milestones],
  );

  const completionPercentage = useMemo(
    () =>
      milestones.length === 0
        ? 0
        : Math.round((completedCount / milestones.length) * 100),
    [completedCount, milestones.length],
  );

  function openCreateDialog() {
    setEditingMilestone(null);
    setForm(emptyForm);
    setErrorMessage(null);
    setDialogOpen(true);
  }

  function openEditDialog(milestone: ProjectMilestoneItem) {
    setEditingMilestone(milestone);
    setForm({
      title: milestone.title,
      description: milestone.description ?? "",
      dueDate: toDateTimeLocal(milestone.dueDate),
    });
    setErrorMessage(null);
    setDialogOpen(true);
  }

  function openDetailDialog(milestone: ProjectMilestoneItem) {
    setDetailMilestone(milestone);
    setDetailOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const title = form.title.trim();
    const dueDate = form.dueDate;

    if (!title) {
      setErrorMessage("El título es obligatorio.");
      return;
    }

    if (!dueDate) {
      setErrorMessage("La fecha de vencimiento es obligatoria.");
      return;
    }

    const payload = {
      title,
      description: form.description.trim() || null,
      dueDate: new Date(dueDate).toISOString(),
    };

    startTransition(async () => {
      try {
        if (editingMilestone) {
          await updateProjectMilestone(
            String(projectId),
            editingMilestone.id,
            payload,
          );
        } else {
          await createProjectMilestone(String(projectId), payload);
        }
        setDialogOpen(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo guardar el hito",
        );
      }
    });
  }

  function handleToggle(milestone: ProjectMilestoneItem) {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await updateProjectMilestone(String(projectId), milestone.id, {
          completed: !milestone.completed,
        });
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el hito",
        );
      }
    });
  }

  function handleDelete(milestone: ProjectMilestoneItem) {
    if (!window.confirm(`¿Eliminar el hito "${milestone.title}"?`)) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        await deleteProjectMilestone(String(projectId), milestone.id);
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el hito",
        );
      }
    });
  }

  const columnCount = canManage ? 4 : 3;

  return (
    <section className="mt-6 border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Hitos
          </h2>
          <p className="mt-2 text-muted-foreground">
            {milestones.length === 0
              ? "Define los hitos y entregas del proyecto."
              : `${completedCount} de ${milestones.length} completados`}
          </p>

          {milestones.length > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {completionPercentage}%
              </span>
            </div>
          ) : null}
        </div>

        {ready && canManage ? (
          <Button onClick={openCreateDialog}>
            <RiAddLine />
            Nuevo hito
          </Button>
        ) : null}
      </div>

      {errorMessage && !dialogOpen ? (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Estado</TableHead>
            <TableHead>Hito</TableHead>
            <TableHead className="w-48">Vence</TableHead>
            {canManage ? <TableHead className="w-24 text-right">Acciones</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMilestones.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="h-24 text-center text-muted-foreground"
              >
                No hay hitos todavía.
              </TableCell>
            </TableRow>
          ) : (
            sortedMilestones.map((milestone) => (
              <TableRow key={milestone.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      milestone.completed
                        ? "Marcar como pendiente"
                        : "Marcar como completado"
                    }
                    onClick={() => handleToggle(milestone)}
                    disabled={!canManage || isPending}
                  >
                    {milestone.completed ? (
                      <RiCheckboxCircleLine className="text-green-600" />
                    ) : (
                      <RiCheckboxBlankCircleLine />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <button
                    type="button"
                    onClick={() => openDetailDialog(milestone)}
                    className={`text-left font-medium hover:underline ${
                      milestone.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {milestone.title}
                  </button>
                  {milestone.description ? (
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="text-muted-foreground">
                    {formatDate(milestone.dueDate)}
                  </div>
                  {isOverdue(milestone) ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-destructive">
                      <RiErrorWarningLine className="size-3.5" />
                      Vencido
                    </span>
                  ) : null}
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar hito"
                        onClick={() => openEditDialog(milestone)}
                      >
                        <RiPencilLine />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Eliminar hito"
                        className="text-destructive"
                        onClick={() => handleDelete(milestone)}
                      >
                        <RiDeleteBinLine />
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!ready ? (
        <div className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
          Cargando acceso...
        </div>
      ) : !isAuthenticated ? (
        <div className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
          Inicia sesión para administrar los hitos.
          <div className="mt-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? "Editar hito" : "Nuevo hito"}
            </DialogTitle>
            <DialogDescription>
              {editingMilestone
                ? "Actualiza los detalles del hito."
                : "Define un hito o entrega del proyecto."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-title">Título</Label>
              <Input
                id="milestone-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Nombre del hito"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-description">Descripción</Label>
              <textarea
                id="milestone-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={3}
                disabled={isPending}
                className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm"
                placeholder="Descripción opcional del hito"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-due-date">Fecha de vencimiento</Label>
              <Input
                id="milestone-due-date"
                type="datetime-local"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                disabled={isPending}
              />
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <FormActions
              loading={isPending}
              loadingText="Guardando..."
              submitText={editingMilestone ? "Guardar cambios" : "Crear hito"}
              onCancel={() => setDialogOpen(false)}
            />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailMilestone?.title}</DialogTitle>
            <DialogDescription>Detalles del hito</DialogDescription>
          </DialogHeader>

          {detailMilestone ? (
            <div className="space-y-4">
              {isOverdue(detailMilestone) ? (
                <p className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <RiErrorWarningLine className="size-4 shrink-0" />
                  Este hito ya venció.
                </p>
              ) : null}

              <div className="flex items-center gap-2">
                {detailMilestone.completed ? (
                  <RiCheckboxCircleLine className="text-green-600" />
                ) : (
                  <RiCheckboxBlankCircleLine />
                )}
                <span className="text-sm font-medium">
                  {detailMilestone.completed ? "Completado" : "Pendiente"}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vence
                </p>
                <p className="mt-1 text-sm">{formatDate(detailMilestone.dueDate)}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Descripción
                </p>
                {detailMilestone.description ? (
                  <p className="mt-1 whitespace-pre-line text-sm">
                    {detailMilestone.description}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sin descripción.
                  </p>
                )}
              </div>

              {detailMilestone.createdAt ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Creado
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(detailMilestone.createdAt)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
