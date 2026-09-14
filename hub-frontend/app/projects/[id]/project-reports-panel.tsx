"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createProjectReport,
  deleteProjectAttachment,
  deleteProjectReport,
  downloadProjectAttachment,
  reviewProjectReport,
  submitProjectReport,
  updateProjectReport,
  uploadProjectAttachment,
} from "../../services/projects";
import {
  ProjectAttachmentItem,
  ProjectReportItem,
  ProjectReportStatus,
} from "../../services/schemas";
import { useAuth } from "../../components/auth-provider";
import {
  ATTACHMENT_ACCEPT,
  formatBytes,
  formatDate,
  toDateTimeLocal,
  validateAttachmentFile,
} from "../../services/utils";
import FormActions from "@/app/components/form-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  RiAddLine,
  RiAttachmentLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiPencilLine,
  RiSendPlaneLine,
  RiTimeLine,
} from "@remixicon/react";

type ProjectReportsPanelProps = {
  projectId: number;
  reports: ProjectReportItem[];
  actorAssignments: {
    id: number;
    userId: number;
    role: string;
  }[];
};

type ReportFormState = {
  title: string;
  description: string;
  dueDate: string;
};

const emptyForm: ReportFormState = {
  title: "",
  description: "",
  dueDate: "",
};

function isOverdue(report: ProjectReportItem): boolean {
  if (report.status === "submitted" || report.status === "accepted") {
    return false;
  }

  return new Date(report.dueDate).getTime() < Date.now();
}

function ReportStatusBadge({ status }: { status: ProjectReportStatus }) {
  if (status === "accepted") {
    return (
      <Badge className="bg-green-100 text-green-800">
        <RiCheckboxCircleLine />
        Aceptada
      </Badge>
    );
  }

  if (status === "rejected") {
    return (
      <Badge variant="destructive">
        <RiCloseCircleLine />
        No aceptada
      </Badge>
    );
  }

  if (status === "submitted") {
    return (
      <Badge className="bg-blue-100 text-blue-800">
        <RiEyeLine />
        En revisión
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <RiTimeLine />
      Pendiente
    </Badge>
  );
}

function FormField({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return <p className="text-sm text-destructive">{message}</p>;
}

function ErrorBanner({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
    >
      {message}
    </p>
  );
}

type ReportDialogFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  errorMessage: string | null;
  loading: boolean;
  submitText: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  children: React.ReactNode;
};

function ReportDialogForm({
  open,
  onOpenChange,
  title,
  description,
  errorMessage,
  loading,
  submitText,
  onSubmit,
  onCancel,
  children,
}: ReportDialogFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {children}

          {errorMessage ? <FormError message={errorMessage} /> : null}

          <FormActions
            loading={loading}
            loadingText="Guardando..."
            submitText={submitText}
            onCancel={onCancel}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ReportAttachmentRowProps = {
  attachment: ProjectAttachmentItem;
  canDelete: boolean;
  busy: boolean;
  onDownload: (attachment: ProjectAttachmentItem) => Promise<void>;
  onDelete: (attachment: ProjectAttachmentItem) => Promise<void>;
};

function ReportAttachmentRow({
  attachment,
  canDelete,
  busy,
  onDownload,
  onDelete,
}: ReportAttachmentRowProps) {
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-2">
          <RiAttachmentLine className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => void onDownload(attachment)}
              className="truncate text-left font-medium hover:underline"
            >
              {attachment.originalName}
            </button>
            {attachment.uploadedBy ? (
              <p className="truncate text-xs text-muted-foreground">
                {attachment.uploadedBy.fullName}
              </p>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="w-28 text-muted-foreground">
        {formatBytes(attachment.sizeBytes)}
      </TableCell>
      <TableCell className="w-44 text-muted-foreground">
        {formatDate(attachment.createdAt)}
      </TableCell>
      <TableCell className="w-24 text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Descargar archivo"
            onClick={() => void onDownload(attachment)}
            disabled={busy}
          >
            <RiDownloadLine />
          </Button>
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar archivo"
              className="text-destructive"
              onClick={() => void onDelete(attachment)}
              disabled={busy}
            >
              <RiDeleteBinLine />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

type ReportCardProps = {
  report: ProjectReportItem;
  canManage: boolean;
  canSubmit: boolean;
  onEdit: (report: ProjectReportItem) => void;
  onDelete: (report: ProjectReportItem) => void;
  onUpload: (reportId: number, file: File) => Promise<void>;
  onSubmit: (report: ProjectReportItem) => Promise<void>;
  onReview: (
    report: ProjectReportItem,
    decision: "accepted" | "rejected",
  ) => void;
  onDeleteAttachment: (attachmentId: number) => Promise<void>;
  onDownload: (attachment: ProjectAttachmentItem) => Promise<void>;
};

function ReportCard({
  report,
  canManage,
  canSubmit,
  onEdit,
  onDelete,
  onUpload,
  onSubmit,
  onReview,
  onDeleteAttachment,
  onDownload,
}: ReportCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAwaitingReview = report.status === "submitted";
  const isEditable = report.status === "pending" || report.status === "rejected";
  const canUploadFiles = canSubmit && isEditable;

  async function run(action: () => Promise<void>, fallbackError: string) {
    setErrorMessage(null);
    setBusy(true);

    try {
      await action();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : fallbackError,
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateAttachmentFile(file);

    if (validationError) {
      setErrorMessage(validationError);
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUploadSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Selecciona un archivo antes de subirlo.");
      return;
    }

    const form = event.currentTarget;

    await run(async () => {
      await onUpload(report.id, selectedFile);
      setSelectedFile(null);
      form.reset();
    }, "No se pudo subir el archivo");
  }

  async function handleSubmit() {
    if (report.attachments.length === 0) {
      setErrorMessage("Adjunta al menos un archivo antes de enviar la entrega.");
      return;
    }

    if (
      !window.confirm(`¿Enviar la entrega "${report.title}"? No podrá editarla.`)
    ) {
      return;
    }

    await run(
      () => onSubmit(report),
      "No se pudo enviar la entrega",
    );
  }

  async function handleDeleteAttachment(attachment: ProjectAttachmentItem) {
    if (!window.confirm(`¿Eliminar el archivo "${attachment.originalName}"?`)) {
      return;
    }

    await run(
      () => onDeleteAttachment(attachment.id),
      "No se pudo eliminar el archivo",
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="whitespace-normal">{report.title}</CardTitle>
            <CardDescription>
              Vence el {formatDate(report.dueDate)}
              {report.createdBy
                ? ` · Creada por ${report.createdBy.fullName}`
                : ""}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <ReportStatusBadge status={report.status} />

            {canManage ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Editar entrega"
                  onClick={() => onEdit(report)}
                  disabled={busy}
                >
                  <RiPencilLine />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar entrega"
                  className="text-destructive"
                  onClick={() => onDelete(report)}
                  disabled={busy}
                >
                  <RiDeleteBinLine />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {report.description ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {report.description}
          </p>
        ) : null}

        {isOverdue(report) ? (
          <p className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <RiErrorWarningLine className="size-4 shrink-0" />
            La fecha de entrega ya venció.
          </p>
        ) : null}

        {report.submittedAt ? (
          <p className="text-sm text-muted-foreground">
            Enviada el {formatDate(report.submittedAt)}
          </p>
        ) : null}

        {report.status === "accepted" || report.status === "rejected" ? (
          <div
            className={`rounded-md border p-3 text-sm ${
              report.status === "accepted"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <p className="font-medium">
              {report.status === "accepted" ? "Aceptada" : "No aceptada"}
              {report.reviewedBy
                ? ` por ${report.reviewedBy.fullName}`
                : ""}
              {report.reviewedAt
                ? ` el ${formatDate(report.reviewedAt)}`
                : ""}
            </p>
            {report.reviewComment ? (
              <p className="mt-1 whitespace-pre-line">
                {report.reviewComment}
              </p>
            ) : null}
          </div>
        ) : null}

        {report.attachments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Subido</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.attachments.map((attachment) => (
                <ReportAttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  canDelete={canUploadFiles}
                  busy={busy}
                  onDownload={onDownload}
                  onDelete={handleDeleteAttachment}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin archivos adjuntos todavía.
          </p>
        )}

        {canUploadFiles ? (
          <form
            onSubmit={handleUploadSubmit}
            className="flex flex-col gap-3 border-t border-slate-200 pt-4"
          >
            <Input
              type="file"
              onChange={handleFileChange}
              disabled={busy}
              accept={ATTACHMENT_ACCEPT}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedFile
                  ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}`
                  : "Adjunta archivos a la entrega (PDF, Word, Excel, PNG o JPEG)."}
              </span>
              <Button type="submit" disabled={busy || !selectedFile}>
                {busy ? "Subiendo..." : "Adjuntar archivo"}
              </Button>
            </div>
          </form>
        ) : null}

        {canSubmit && isEditable ? (
          <div className="flex justify-end">
            <Button onClick={() => void handleSubmit()} disabled={busy}>
              <RiSendPlaneLine />
              {report.status === "rejected" ? "Reenviar entrega" : "Enviar entrega"}
            </Button>
          </div>
        ) : null}

        {canManage && isAwaitingReview ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              variant="outline"
              onClick={() => onReview(report, "rejected")}
              disabled={busy}
            >
              <RiCloseCircleLine />
              No aceptar
            </Button>
            <Button
              onClick={() => onReview(report, "accepted")}
              disabled={busy}
            >
              <RiCheckboxCircleLine />
              Aceptar
            </Button>
          </div>
        ) : null}

        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      </CardContent>
    </Card>
  );
}

export default function ProjectReportsPanel({
  projectId,
  reports,
  actorAssignments,
}: ProjectReportsPanelProps) {
  const router = useRouter();
  const { session, isAuthenticated, ready } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] =
    useState<ProjectReportItem | null>(null);
  const [form, setForm] = useState<ReportFormState>(emptyForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    report: ProjectReportItem;
    decision: "accepted" | "rejected";
  } | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isReviewPending, startReviewTransition] = useTransition();

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

  const canSubmit = useMemo(() => {
    if (!session) {
      return false;
    }

    const roles = session.user.roles;
    if (roles.includes("admin")) {
      return true;
    }

    return actorAssignments.some(
      (assignment) => assignment.userId === session.user.id,
    );
  }, [session, actorAssignments]);

  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime() ||
          left.id - right.id,
      ),
    [reports],
  );

  const acceptedCount = useMemo(
    () => reports.filter((report) => report.status === "accepted").length,
    [reports],
  );

  function openCreateDialog() {
    setEditingReport(null);
    setForm(emptyForm);
    setErrorMessage(null);
    setDialogOpen(true);
  }

  function openEditDialog(report: ProjectReportItem) {
    setEditingReport(report);
    setForm({
      title: report.title,
      description: report.description ?? "",
      dueDate: toDateTimeLocal(report.dueDate),
    });
    setErrorMessage(null);
    setDialogOpen(true);
  }

  function runTransition(action: () => Promise<void>, fallbackError: string) {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : fallbackError);
      }
    });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const dueDate = form.dueDate;

    if (!title) {
      setErrorMessage("El título es obligatorio.");
      return;
    }

    if (!dueDate) {
      setErrorMessage("La fecha de entrega es obligatoria.");
      return;
    }

    const payload = {
      title,
      description: form.description.trim() || null,
      dueDate: new Date(dueDate).toISOString(),
    };

    runTransition(async () => {
      if (editingReport) {
        await updateProjectReport(String(projectId), editingReport.id, payload);
      } else {
        await createProjectReport(String(projectId), payload);
      }
      setDialogOpen(false);
      router.refresh();
    }, "No se pudo guardar la entrega");
  }

  function handleDelete(report: ProjectReportItem) {
    if (!window.confirm(`¿Eliminar la entrega "${report.title}"?`)) {
      return;
    }

    runTransition(async () => {
      await deleteProjectReport(String(projectId), report.id);
      router.refresh();
    }, "No se pudo eliminar la entrega");
  }

  function openReviewDialog(
    report: ProjectReportItem,
    decision: "accepted" | "rejected",
  ) {
    setReviewTarget({ report, decision });
    setReviewComment("");
    setReviewError(null);
    setReviewOpen(true);
  }

  function handleReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reviewTarget) {
      return;
    }

    setReviewError(null);

    startReviewTransition(async () => {
      try {
        await reviewProjectReport(
          String(projectId),
          reviewTarget.report.id,
          reviewTarget.decision,
          reviewComment.trim() || undefined,
        );
        setReviewOpen(false);
        setReviewTarget(null);
        router.refresh();
      } catch (error) {
        setReviewError(
          error instanceof Error
            ? error.message
            : "No se pudo revisar la entrega",
        );
      }
    });
  }

  async function handleUpload(reportId: number, file: File) {
    await uploadProjectAttachment(String(projectId), file, reportId);
    router.refresh();
  }

  async function handleSubmitReport(report: ProjectReportItem) {
    await submitProjectReport(
      String(projectId),
      report.id,
      report.attachments.map((attachment) => attachment.id),
    );
    router.refresh();
  }

  async function handleDeleteAttachment(attachmentId: number) {
    await deleteProjectAttachment(String(projectId), attachmentId);
    router.refresh();
  }

  async function handleDownload(attachment: ProjectAttachmentItem) {
    await downloadProjectAttachment(
      String(projectId),
      attachment.id,
      attachment.originalName,
    );
  }

  const reviewDecision = reviewTarget?.decision;
  const reviewDialogTitle =
    reviewDecision === "accepted" ? "Aceptar entrega" : "No aceptar entrega";

  return (
    <section className="mt-6 border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Entregas
          </h2>
          <p className="mt-2 text-muted-foreground">
            {reports.length === 0
              ? "Los asesores, evaluadores y coordinadores crean las entregas para que los estudiantes las envíen."
              : `${acceptedCount} de ${reports.length} aceptadas`}
          </p>
        </div>

        {ready && canManage ? (
          <Button onClick={openCreateDialog}>
            <RiAddLine />
            Nueva entrega
          </Button>
        ) : null}
      </div>

      {errorMessage && !dialogOpen ? (
        <ErrorBanner message={errorMessage} className="mt-4" />
      ) : null}

      {sortedReports.length === 0 ? (
        <p className="mt-6 border border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
          No hay entregas registradas todavía.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {sortedReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              canManage={canManage}
              canSubmit={canSubmit}
              onEdit={openEditDialog}
              onDelete={handleDelete}
              onUpload={handleUpload}
              onSubmit={handleSubmitReport}
              onReview={openReviewDialog}
              onDeleteAttachment={handleDeleteAttachment}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      {!ready ? (
        <div className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
          Cargando acceso...
        </div>
      ) : !isAuthenticated ? (
        <div className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
          Inicia sesión para enviar entregas.
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

      <ReportDialogForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingReport ? "Editar entrega" : "Nueva entrega"}
        description={
          editingReport
            ? "Actualiza los detalles de la entrega."
            : "Crea una entrega para que los estudiantes la envíen."
        }
        errorMessage={errorMessage}
        loading={isPending}
        submitText={editingReport ? "Guardar cambios" : "Crear entrega"}
        onSubmit={handleFormSubmit}
        onCancel={() => setDialogOpen(false)}
      >
        <FormField htmlFor="report-title" label="Título">
          <Input
            id="report-title"
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Nombre de la entrega"
            disabled={isPending}
          />
        </FormField>

        <FormField htmlFor="report-description" label="Descripción">
          <Textarea
            id="report-description"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            rows={3}
            disabled={isPending}
            placeholder="Descripción opcional de la entrega"
          />
        </FormField>

        <FormField htmlFor="report-due-date" label="Fecha de entrega">
          <Input
            id="report-due-date"
            type="datetime-local"
            value={form.dueDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, dueDate: event.target.value }))
            }
            disabled={isPending}
          />
        </FormField>
      </ReportDialogForm>

      <ReportDialogForm
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title={reviewDialogTitle}
        description={
          reviewTarget ? `Entrega "${reviewTarget.report.title}".` : ""
        }
        errorMessage={reviewError}
        loading={isReviewPending}
        submitText={reviewDialogTitle}
        onSubmit={handleReviewSubmit}
        onCancel={() => setReviewOpen(false)}
      >
        <FormField
          htmlFor="review-comment"
          label={`Comentario ${reviewDecision === "rejected" ? "" : "(opcional)"}`}
        >
          <Textarea
            id="review-comment"
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            rows={3}
            disabled={isReviewPending}
            placeholder="Explica brevemente tu decisión"
          />
        </FormField>
      </ReportDialogForm>
    </section>
  );
}
