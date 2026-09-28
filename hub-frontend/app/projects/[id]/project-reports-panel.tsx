"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  confirmReportContentFile,
  createProjectReport,
  createReportContent,
  deleteProjectReport,
  deleteReportContent,
  downloadProjectAttachment,
  getProjectReports,
  getReportContentStreamUrl,
  presignReportContentFile,
  reviewProjectReport,
  submitProjectReport,
  updateProjectReport,
  updateReportContent,
  uploadFileToStorage,
} from "../../services/projects";
import {
  ProjectAttachmentItem,
  ProjectReportContentItem,
  ProjectReportContentKind,
  ProjectReportItem,
  ProjectReportStatus,
} from "../../services/schemas";
import { useAuth } from "../../components/auth-provider";
import {
  REPORT_MIME_OPTIONS,
  REPORT_TEXT_MAX_LENGTH,
  formatBytes,
  formatDate,
  toDateTimeLocal,
  validateReportContentFile,
  validateReportLink,
} from "../../services/utils";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  RiAddLine,
  RiAttachmentLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiEyeLine,
  RiFileTextLine,
  RiImageLine,
  RiLinkM,
  RiPencilLine,
  RiSendPlaneLine,
  RiTimeLine,
  RiVideoLine,
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
  type: ProjectReportContentKind;
  allowedMimeTypes: string[];
  maxFiles: string;
};

type ContentFileKind = "image" | "video" | "file";

type ContentPayload =
  | { kind: "text"; textContent: string }
  | { kind: "link"; url: string; label?: string | null };

const emptyForm: ReportFormState = {
  title: "",
  description: "",
  dueDate: "",
  type: "file",
  allowedMimeTypes: [],
  maxFiles: "",
};

const REPORT_TYPE_OPTIONS: {
  value: ProjectReportContentKind;
  label: string;
}[] = [
  { value: "text", label: "Texto" },
  { value: "link", label: "Enlace" },
  { value: "file", label: "Archivo" },
  { value: "image", label: "Imagen" },
  { value: "video", label: "Video" },
];

const CONTENT_KIND_LABELS: Record<ProjectReportContentKind, string> = {
  text: "Texto",
  link: "Enlace",
  image: "Imagen",
  video: "Video",
  file: "Archivo",
};

function ContentKindIcon({
  kind,
  className,
}: {
  kind: ProjectReportContentKind;
  className?: string;
}) {
  switch (kind) {
    case "text":
      return <RiFileTextLine className={className} />;
    case "link":
      return <RiLinkM className={className} />;
    case "image":
      return <RiImageLine className={className} />;
    case "video":
      return <RiVideoLine className={className} />;
    default:
      return <RiAttachmentLine className={className} />;
  }
}

function isFileKind(kind: ProjectReportContentKind): kind is ContentFileKind {
  return kind === "image" || kind === "video" || kind === "file";
}

function isOverdue(report: ProjectReportItem): boolean {
  if (report.status === "submitted" || report.status === "accepted") {
    return false;
  }

  return new Date(report.dueDate).getTime() < Date.now();
}

function ReportStatusBadge({ status }: { status: ProjectReportStatus }) {
  if (status === "accepted") {
    return (
      <Badge>
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
      <Badge variant="outline">
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
    <Field>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </Field>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function ErrorBanner({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
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

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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

type ReportContentRowProps = {
  content: ProjectReportContentItem;
  streamUrl: string | null;
  canEdit: boolean;
  canDelete: boolean;
  busy: boolean;
  onEdit: (content: ProjectReportContentItem) => void;
  onDelete: (content: ProjectReportContentItem) => void;
  onDownload: (attachment: ProjectAttachmentItem) => void;
};

function ReportContentRow({
  content,
  streamUrl,
  canEdit,
  canDelete,
  busy,
  onEdit,
  onDelete,
  onDownload,
}: ReportContentRowProps) {
  const attachment = content.attachment;
  const canEditContent = canEdit && (content.kind === "text" || content.kind === "link");

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ContentKindIcon kind={content.kind} className="size-4 shrink-0" />
          {CONTENT_KIND_LABELS[content.kind]}
          {content.createdBy ? (
            <span className="font-normal">
              · {content.createdBy.fullName}
            </span>
          ) : null}
          <span className="font-normal">· {formatDate(content.createdAt)}</span>
        </div>

        <div className="flex justify-end gap-1">
          {canEditContent ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Editar contenido"
              onClick={() => onEdit(content)}
              disabled={busy}
            >
              <RiPencilLine />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar contenido"
              className="text-destructive"
              onClick={() => onDelete(content)}
              disabled={busy}
            >
              <RiDeleteBinLine />
            </Button>
          ) : null}
        </div>
      </div>

      {content.kind === "text" ? (
        <p className="whitespace-pre-line text-sm text-foreground">
          {content.textContent}
        </p>
      ) : null}

      {content.kind === "link" ? (
        <div className="flex flex-col gap-1">
          <a
            href={content.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 break-all text-sm font-medium text-utb-blue hover:underline"
          >
            <RiExternalLinkLine className="size-4 shrink-0" />
            {content.label ?? content.url}
          </a>
          {content.label && content.url ? (
            <p className="break-all text-xs text-muted-foreground">
              {content.url}
            </p>
          ) : null}
        </div>
      ) : null}

      {content.kind === "image" && attachment && streamUrl ? (
        <div className="flex flex-col gap-1">
          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={streamUrl}
              alt={attachment.originalName}
              className="max-h-80 w-auto rounded-lg border"
            />
          </a>
          <p className="text-xs text-muted-foreground">
            {attachment.originalName} · {formatBytes(attachment.sizeBytes)}
          </p>
        </div>
      ) : null}

      {content.kind === "video" && attachment && streamUrl ? (
        <div className="flex flex-col gap-1">
          <video
            controls
            preload="metadata"
            src={streamUrl}
            className="w-full max-w-xl rounded-lg border"
          />
          <p className="text-xs text-muted-foreground">
            {attachment.originalName} · {formatBytes(attachment.sizeBytes)}
          </p>
        </div>
      ) : null}

      {content.kind === "file" && attachment ? (
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="link"
            onClick={() => onDownload(attachment)}
            className="h-auto w-fit justify-start p-0 font-medium"
          >
            <RiAttachmentLine className="size-4 shrink-0" />
            {attachment.originalName}
          </Button>
          <p className="text-xs text-muted-foreground">
            {formatBytes(attachment.sizeBytes)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

type ReportCardProps = {
  report: ProjectReportItem;
  currentUserId: number | null;
  canManage: boolean;
  canSubmit: boolean;
  onEdit: (report: ProjectReportItem) => void;
  onDelete: (report: ProjectReportItem) => void;
  onSubmit: (report: ProjectReportItem) => Promise<void>;
  onReview: (
    report: ProjectReportItem,
    decision: "accepted" | "rejected",
  ) => void;
  onEditContent: (
    report: ProjectReportItem,
    content: ProjectReportContentItem,
  ) => void;
  onCreateContent: (
    reportId: number,
    payload: ContentPayload,
  ) => Promise<void>;
  onUploadContent: (
    reportId: number,
    kind: ContentFileKind,
    file: File,
    onProgress: (fraction: number) => void,
  ) => Promise<void>;
  onDeleteContent: (reportId: number, contentId: number) => Promise<void>;
  onDownload: (attachment: ProjectAttachmentItem) => Promise<void>;
};

function ReportCard({
  report,
  currentUserId,
  canManage,
  canSubmit,
  onEdit,
  onDelete,
  onSubmit,
  onReview,
  onEditContent,
  onCreateContent,
  onUploadContent,
  onDeleteContent,
  onDownload,
}: ReportCardProps) {
  const [textValue, setTextValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [labelValue, setLabelValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ProjectReportContentItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isAwaitingReview = report.status === "submitted";
  const isEditable = report.status === "pending" || report.status === "rejected";
  const canEditContent = canSubmit && isEditable;
  const reportType = report.type;
  const fileCount = report.contents.length;
  const atMaxFiles =
    isFileKind(reportType) &&
    report.maxFiles !== null &&
    fileCount >= report.maxFiles;

  function canDeleteContent(content: ProjectReportContentItem): boolean {
    if (!isEditable) {
      return false;
    }

    if (canManage) {
      return true;
    }

    return (
      currentUserId !== null && content.createdBy?.id === currentUserId
    );
  }

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

  function resetComposer(form?: HTMLFormElement) {
    setTextValue("");
    setUrlValue("");
    setLabelValue("");
    setSelectedFile(null);
    form?.reset();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    const file = event.target.files?.[0] ?? null;

    if (!file || !isFileKind(reportType)) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateReportContentFile(reportType, file);

    if (validationError) {
      setErrorMessage(validationError);
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.type && !report.allowedMimeTypes.includes(file.type)) {
      setErrorMessage("Tipo de archivo no permitido para esta entrega.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleComposerSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const form = event.currentTarget;

    if (reportType === "text") {
      const text = textValue.trim();

      if (!text) {
        setErrorMessage("Escribe el texto de la entrega.");
        return;
      }

      await run(async () => {
        await onCreateContent(report.id, { kind: "text", textContent: text });
        resetComposer(form);
      }, "No se pudo agregar el texto");
      return;
    }

    if (reportType === "link") {
      const linkError = validateReportLink(urlValue);

      if (linkError) {
        setErrorMessage(linkError);
        return;
      }

      await run(async () => {
        await onCreateContent(report.id, {
          kind: "link",
          url: urlValue.trim(),
          label: labelValue.trim() || null,
        });
        resetComposer(form);
      }, "No se pudo agregar el enlace");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Selecciona un archivo antes de subirlo.");
      return;
    }

    const file = selectedFile;
    const kind = reportType;

    setErrorMessage(null);
    setBusy(true);
    setUploadProgress(0);

    try {
      await onUploadContent(report.id, kind, file, (fraction) =>
        setUploadProgress(fraction),
      );
      resetComposer(form);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo subir el archivo",
      );
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  function handleSubmit() {
    if (report.contents.length === 0) {
      setErrorMessage(
        "Agrega al menos un contenido antes de enviar la entrega.",
      );
      return;
    }

    setSubmitOpen(true);
  }

  async function confirmSubmit() {
    setSubmitOpen(false);

    await run(
      () => onSubmit(report),
      "No se pudo enviar la entrega",
    );
  }

  function confirmDeleteContent() {
    const content = deleteTarget;

    if (!content) {
      return;
    }

    setDeleteOpen(false);
    setDeleteTarget(null);

    void run(
      () => onDeleteContent(report.id, content.id),
      "No se pudo eliminar el contenido",
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="whitespace-normal">{report.title}</CardTitle>
            <CardDescription>
              <span className="inline-flex items-center gap-1">
                <ContentKindIcon kind={report.type} className="size-3.5" />
                {CONTENT_KIND_LABELS[report.type]}
              </span>
              {" · Vence el "}
              {formatDate(report.dueDate)}
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

      <CardContent className="flex flex-col gap-4">
        {report.description ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {report.description}
          </p>
        ) : null}

        {isOverdue(report) ? (
          <Alert variant="destructive">
            <RiErrorWarningLine />
            <AlertDescription>
              La fecha de entrega ya venció.
            </AlertDescription>
          </Alert>
        ) : null}

        {report.submittedAt ? (
          <p className="text-sm text-muted-foreground">
            Enviada el {formatDate(report.submittedAt)}
          </p>
        ) : null}

        {report.status === "accepted" || report.status === "rejected" ? (
          <Alert
            variant={
              report.status === "rejected" ? "destructive" : "default"
            }
          >
            <AlertDescription>
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
            </AlertDescription>
          </Alert>
        ) : null}

        {report.contents.length > 0 ? (
          <div className="flex flex-col gap-3">
            {report.contents.map((content) => (
              <ReportContentRow
                key={content.id}
                content={content}
                streamUrl={
                  content.kind === "text" || content.kind === "link"
                    ? null
                    : getReportContentStreamUrl(
                        String(report.projectId),
                        report.id,
                        content.id,
                      )
                }
                canEdit={canEditContent}
                canDelete={canDeleteContent(content)}
                busy={busy}
                onEdit={(target) => onEditContent(report, target)}
                onDelete={(target) => {
                  setDeleteTarget(target);
                  setDeleteOpen(true);
                }}
                onDownload={(attachment) => void onDownload(attachment)}
              />
            ))}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Sin contenido</EmptyTitle>
              <EmptyDescription>
                Esta entrega todavía no tiene texto, enlaces ni archivos.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {canEditContent && !atMaxFiles ? (
          <>
            <Separator />
            <form
              onSubmit={handleComposerSubmit}
              className="flex flex-col gap-3"
            >
              {reportType === "text" ? (
                <Textarea
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  rows={4}
                  maxLength={REPORT_TEXT_MAX_LENGTH}
                  disabled={busy}
                  placeholder="Escribe el contenido de la entrega"
                />
              ) : null}

              {reportType === "link" ? (
                <div className="flex flex-col gap-3">
                  <Input
                    type="url"
                    value={urlValue}
                    onChange={(event) => setUrlValue(event.target.value)}
                    disabled={busy}
                    placeholder="https://ejemplo.com/recurso"
                  />
                  <Input
                    value={labelValue}
                    onChange={(event) => setLabelValue(event.target.value)}
                    disabled={busy}
                    placeholder="Título del enlace (opcional)"
                  />
                </div>
              ) : null}

              {isFileKind(reportType) ? (
                <Input
                  type="file"
                  onChange={handleFileChange}
                  disabled={busy}
                  accept={report.allowedMimeTypes.join(",")}
                />
              ) : null}

              {uploadProgress !== null ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-utb-blue transition-[width]"
                      style={{
                        width: `${Math.round(uploadProgress * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground">
                    {Math.round(uploadProgress * 100)}%
                  </span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {isFileKind(reportType) && report.maxFiles !== null
                    ? `${fileCount} de ${report.maxFiles} archivos. `
                    : ""}
                  {getComposerHint(reportType, selectedFile)}
                </span>
                <Button type="submit" disabled={busy}>
                  {busy ? "Guardando..." : "Agregar contenido"}
                </Button>
              </div>
            </form>
          </>
        ) : null}

        {canEditContent && atMaxFiles ? (
          <Alert>
            <AlertDescription>
              Alcanzaste el máximo de {report.maxFiles} archivo(s) para esta
              entrega.
            </AlertDescription>
          </Alert>
        ) : null}

        {canSubmit && isEditable ? (
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={busy}>
              <RiSendPlaneLine />
              {report.status === "rejected" ? "Reenviar entrega" : "Enviar entrega"}
            </Button>
          </div>
        ) : null}

        {canManage && isAwaitingReview ? (
          <>
            <Separator />
            <div className="flex flex-wrap justify-end gap-2">
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
          </>
        ) : null}

        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      </CardContent>

      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar entrega</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Enviar la entrega &quot;{report.title}&quot;? No podrá editarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmSubmit()}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contenido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar este contenido de la entrega? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => confirmDeleteContent()}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function getComposerHint(
  kind: ProjectReportContentKind,
  selectedFile: File | null,
): string {
  if (kind === "text") {
    return "El texto se guarda como contenido de la entrega.";
  }

  if (kind === "link") {
    return "Comparte una URL (sitio, video externo, repositorio).";
  }

  if (selectedFile) {
    return `${selectedFile.name} · ${formatBytes(selectedFile.size)}`;
  }

  if (kind === "image") {
    return "Imágenes PNG, JPEG, WebP o GIF. Máximo 10 MB.";
  }

  if (kind === "video") {
    return "Videos MP4, WebM u OGG. Máximo 100 MB.";
  }

  return "Documentos PDF, Word o Excel. Máximo 10 MB.";
}

export default function ProjectReportsPanel({
  projectId,
  reports: initialReports,
  actorAssignments,
}: ProjectReportsPanelProps) {
  const router = useRouter();
  const { session, isAuthenticated, ready } = useAuth();
  const [reports, setReports] = useState<ProjectReportItem[]>(initialReports);
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
  const [deleteTarget, setDeleteTarget] =
    useState<ProjectReportItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contentEdit, setContentEdit] = useState<{
    reportId: number;
    content: ProjectReportContentItem;
  } | null>(null);
  const [editText, setEditText] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditPending, startEditTransition] = useTransition();

  useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  const currentUserId = session?.user.id ?? null;

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

  async function reloadReports(): Promise<void> {
    const nextReports = await getProjectReports(String(projectId));
    setReports(nextReports);
  }

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
      type: report.type,
      allowedMimeTypes: report.allowedMimeTypes,
      maxFiles: report.maxFiles !== null ? String(report.maxFiles) : "",
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

    const isFile = isFileKind(form.type);
    const maxFiles = Number(form.maxFiles);

    if (isFile) {
      if (form.allowedMimeTypes.length === 0) {
        setErrorMessage("Selecciona al menos un tipo de archivo permitido.");
        return;
      }

      if (!Number.isInteger(maxFiles) || maxFiles < 1) {
        setErrorMessage("El máximo de archivos debe ser un número mayor a 0.");
        return;
      }
    }

    const payload = {
      title,
      description: form.description.trim() || null,
      dueDate: new Date(dueDate).toISOString(),
      type: form.type,
      ...(isFile
        ? { allowedMimeTypes: form.allowedMimeTypes, maxFiles }
        : {}),
    };

    runTransition(async () => {
      if (editingReport) {
        await updateProjectReport(String(projectId), editingReport.id, payload);
      } else {
        await createProjectReport(String(projectId), payload);
      }
      setDialogOpen(false);
      await reloadReports();
      router.refresh();
    }, "No se pudo guardar la entrega");
  }

  function handleDelete(report: ProjectReportItem) {
    setDeleteTarget(report);
    setDeleteOpen(true);
  }

  function confirmDeleteReport() {
    const report = deleteTarget;

    if (!report) {
      return;
    }

    setDeleteOpen(false);
    setDeleteTarget(null);

    runTransition(async () => {
      await deleteProjectReport(String(projectId), report.id);
      await reloadReports();
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
        await reloadReports();
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

  async function handleCreateContent(
    reportId: number,
    payload: ContentPayload,
  ): Promise<void> {
    await createReportContent(String(projectId), reportId, payload);
    await reloadReports();
  }

  async function handleUploadContent(
    reportId: number,
    kind: ContentFileKind,
    file: File,
    onProgress: (fraction: number) => void,
  ): Promise<void> {
    const metadata = {
      kind,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };

    const target = await presignReportContentFile(
      String(projectId),
      reportId,
      metadata,
    );

    await uploadFileToStorage(target.uploadUrl, file, onProgress);

    await confirmReportContentFile(String(projectId), reportId, {
      ...metadata,
      storageKey: target.storageKey,
    });

    await reloadReports();
  }

  async function handleDeleteContent(
    reportId: number,
    contentId: number,
  ): Promise<void> {
    await deleteReportContent(String(projectId), reportId, contentId);
    await reloadReports();
  }

  async function handleSubmitReport(report: ProjectReportItem) {
    await submitProjectReport(String(projectId), report.id);
    await reloadReports();
  }

  async function handleDownload(attachment: ProjectAttachmentItem) {
    await downloadProjectAttachment(
      String(projectId),
      attachment.id,
      attachment.originalName,
    );
  }

  function openContentEdit(
    report: ProjectReportItem,
    content: ProjectReportContentItem,
  ) {
    setContentEdit({ reportId: report.id, content });
    setEditText(content.textContent ?? "");
    setEditUrl(content.url ?? "");
    setEditLabel(content.label ?? "");
    setEditError(null);
  }

  function handleContentEditSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!contentEdit) {
      return;
    }

    const isText = contentEdit.content.kind === "text";
    const textContent = editText.trim();
    const url = editUrl.trim();
    const label = editLabel.trim() || null;

    if (isText && !textContent) {
      setEditError("El texto no puede estar vacío.");
      return;
    }

    if (!isText) {
      const linkError = validateReportLink(url);

      if (linkError) {
        setEditError(linkError);
        return;
      }
    }

    setEditError(null);

    startEditTransition(async () => {
      try {
        await updateReportContent(
          String(projectId),
          contentEdit.reportId,
          contentEdit.content.id,
          isText ? { textContent } : { url, label },
        );
        setContentEdit(null);
        await reloadReports();
        router.refresh();
      } catch (error) {
        setEditError(
          error instanceof Error ? error.message : "No se pudo guardar",
        );
      }
    });
  }

  const reviewDecision = reviewTarget?.decision;
  const reviewDialogTitle =
    reviewDecision === "accepted" ? "Aceptar entrega" : "No aceptar entrega";
  const editingTextContent = contentEdit?.content.kind === "text";
  const configLocked = isPending || Boolean(editingReport?.contents.length);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Entregas</CardTitle>
        <CardDescription>
          {reports.length === 0
            ? "Los asesores, evaluadores y coordinadores crean las entregas para que los estudiantes las envíen."
            : `${acceptedCount} de ${reports.length} aceptadas`}
        </CardDescription>

        {ready && canManage ? (
          <CardAction>
            <Button onClick={openCreateDialog}>
              <RiAddLine data-icon="inline-start" />
              Nueva entrega
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {errorMessage && !dialogOpen ? (
          <ErrorBanner message={errorMessage} />
        ) : null}

        {sortedReports.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Sin entregas</EmptyTitle>
              <EmptyDescription>
                No hay entregas registradas todavía.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                currentUserId={currentUserId}
                canManage={canManage}
                canSubmit={canSubmit}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onSubmit={handleSubmitReport}
                onReview={openReviewDialog}
                onEditContent={openContentEdit}
                onCreateContent={handleCreateContent}
                onUploadContent={handleUploadContent}
                onDeleteContent={handleDeleteContent}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}

        {!ready ? (
          <Alert>
            <AlertDescription>Cargando acceso...</AlertDescription>
          </Alert>
        ) : !isAuthenticated ? (
          <Alert>
            <AlertDescription>
              Inicia sesión para enviar entregas.
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

        <FormField htmlFor="report-type" label="Tipo de entrega">
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                type: value as ProjectReportContentKind,
                allowedMimeTypes: [],
                maxFiles: "",
              }))
            }
            disabled={configLocked}
          >
            <SelectTrigger id="report-type" className="w-full">
              <SelectValue>
                {REPORT_TYPE_OPTIONS.find(
                  (option) => option.value === form.type,
                )?.label ?? "Tipo"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {isFileKind(form.type) ? (
          <>
            <FormField
              htmlFor="report-mime-types"
              label="Tipos de archivo permitidos"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {REPORT_MIME_OPTIONS[form.type].map((option) => (
                    <label
                      key={option.label}
                      htmlFor={`mime-${option.label}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={`mime-${option.label}`}
                        checked={option.values.some((value) =>
                          form.allowedMimeTypes.includes(value),
                        )}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({
                            ...prev,
                            allowedMimeTypes:
                              checked === true
                                ? [
                                    ...new Set([
                                      ...prev.allowedMimeTypes,
                                      ...option.values,
                                    ]),
                                  ]
                                : prev.allowedMimeTypes.filter(
                                    (value) => !option.values.includes(value),
                                  ),
                          }))
                        }
                        disabled={configLocked}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={configLocked}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      allowedMimeTypes: REPORT_MIME_OPTIONS[
                        prev.type as ContentFileKind
                      ].flatMap((option) => option.values),
                    }))
                  }
                >
                  Seleccionar todos
                </Button>
              </div>
            </FormField>

            <FormField htmlFor="report-max-files" label="Máximo de archivos">
              <Input
                id="report-max-files"
                type="number"
                min={1}
                value={form.maxFiles}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxFiles: event.target.value }))
                }
                disabled={configLocked}
                placeholder="1"
              />
            </FormField>
          </>
        ) : null}
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

      <ReportDialogForm
        open={contentEdit !== null}
        onOpenChange={(open) => {
          if (!open) {
            setContentEdit(null);
          }
        }}
        title="Editar contenido"
        description={
          editingTextContent
            ? "Actualiza el texto de la entrega."
            : "Actualiza el enlace de la entrega."
        }
        errorMessage={editError}
        loading={isEditPending}
        submitText="Guardar cambios"
        onSubmit={handleContentEditSubmit}
        onCancel={() => setContentEdit(null)}
      >
        {editingTextContent ? (
          <FormField htmlFor="content-edit-text" label="Texto">
            <Textarea
              id="content-edit-text"
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              rows={4}
              maxLength={REPORT_TEXT_MAX_LENGTH}
              disabled={isEditPending}
            />
          </FormField>
        ) : (
          <>
            <FormField htmlFor="content-edit-url" label="URL">
              <Input
                id="content-edit-url"
                type="url"
                value={editUrl}
                onChange={(event) => setEditUrl(event.target.value)}
                disabled={isEditPending}
              />
            </FormField>
            <FormField htmlFor="content-edit-label" label="Título (opcional)">
              <Input
                id="content-edit-label"
                value={editLabel}
                onChange={(event) => setEditLabel(event.target.value)}
                disabled={isEditPending}
              />
            </FormField>
          </>
        )}
      </ReportDialogForm>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entrega</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la entrega &quot;{deleteTarget?.title}&quot;? Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteReport}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}