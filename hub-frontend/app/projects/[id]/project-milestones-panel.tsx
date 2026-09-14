"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProjectMilestone,
  deleteProjectMilestone,
  updateProjectMilestone,
} from "../../services/projects";
import { ProjectMilestoneItem } from "../../services/schemas";
import { formatDate, toDateTimeLocal } from "../../services/utils";
import Link from "next/link";
import { useAuth } from "../../components/auth-provider";
import FormActions from "@/app/components/form-actions";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
  const [deleteTarget, setDeleteTarget] =
    useState<ProjectMilestoneItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  function requestDelete(milestone: ProjectMilestoneItem) {
    setDeleteTarget(milestone);
    setDeleteOpen(true);
  }

  function handleDelete() {
    const milestone = deleteTarget;

    if (!milestone) {
      return;
    }

    setDeleteOpen(false);
    setDeleteTarget(null);
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Hitos</CardTitle>
        <CardDescription>
          {milestones.length === 0
            ? "Define los hitos y entregas del proyecto."
            : `${completedCount} de ${milestones.length} completados`}
        </CardDescription>

        {milestones.length > 0 ? (
          <div className="mt-3 flex items-center gap-3">
            <Progress value={completionPercentage} className="w-40" />
            <span className="text-sm font-medium">{completionPercentage}%</span>
          </div>
        ) : null}

        {ready && canManage ? (
          <CardAction>
            <Button onClick={openCreateDialog}>
              <RiAddLine data-icon="inline-start" />
              Nuevo hito
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent>
        {errorMessage && !dialogOpen ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Estado</TableHead>
              <TableHead>Hito</TableHead>
              <TableHead className="w-48">Vence</TableHead>
              {canManage ? (
                <TableHead className="w-24 text-right">Acciones</TableHead>
              ) : null}
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
                        <RiCheckboxCircleLine className="text-success" />
                      ) : (
                        <RiCheckboxBlankCircleLine />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Button
                      variant="link"
                      onClick={() => openDetailDialog(milestone)}
                      className={cn(
                        "h-auto justify-start whitespace-normal p-0 text-left font-medium",
                        milestone.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {milestone.title}
                    </Button>
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
                          onClick={() => requestDelete(milestone)}
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
          <Alert className="mt-6">
            <AlertDescription>Cargando acceso...</AlertDescription>
          </Alert>
        ) : !isAuthenticated ? (
          <Alert className="mt-6">
            <AlertDescription>
              Inicia sesión para administrar los hitos.
              <div className="mt-3">
                <Button
                  nativeButton={false}
                  render={<Link href="/login">Iniciar sesión</Link>}
                />
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

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

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="milestone-title">Título</FieldLabel>
                <Input
                  id="milestone-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Nombre del hito"
                  disabled={isPending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="milestone-description">
                  Descripción
                </FieldLabel>
                <Textarea
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
                  placeholder="Descripción opcional del hito"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="milestone-due-date">
                  Fecha de vencimiento
                </FieldLabel>
                <Input
                  id="milestone-due-date"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  disabled={isPending}
                />
              </Field>

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <FormActions
                loading={isPending}
                loadingText="Guardando..."
                submitText={editingMilestone ? "Guardar cambios" : "Crear hito"}
                onCancel={() => setDialogOpen(false)}
              />
            </FieldGroup>
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
            <div className="flex flex-col gap-4">
              {isOverdue(detailMilestone) ? (
                <Alert variant="destructive">
                  <RiErrorWarningLine />
                  <AlertDescription>Este hito ya venció.</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex items-center gap-2">
                {detailMilestone.completed ? (
                  <RiCheckboxCircleLine className="text-success" />
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar hito</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el hito &quot;{deleteTarget?.title}&quot;? Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
