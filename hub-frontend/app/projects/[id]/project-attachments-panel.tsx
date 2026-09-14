"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  deleteProjectAttachment,
  downloadProjectAttachment,
  uploadProjectAttachment,
} from "../../services/projects";
import { ProjectAttachmentItem } from "../../services/schemas";
import { useAuth } from "../../components/auth-provider";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RiAttachmentLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiErrorWarningLine,
  RiLockLine,
} from "@remixicon/react";

type ProjectActorAssignment = {
  id: number;
  userId: number;
  role: string;
};

type ProjectAttachmentsPanelProps = {
  projectId: number;
  attachments: ProjectAttachmentItem[];
  assignments: ProjectActorAssignment[];
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectAttachmentsPanel({
  projectId,
  attachments,
  assignments,
}: ProjectAttachmentsPanelProps) {
  const router = useRouter();
  const { session, isAuthenticated, ready } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentUser = session?.user;

  const isProjectMember = useMemo(() => {
    if (!currentUser) {
      return false;
    }

    return assignments.some(
      (assignment) => assignment.userId === currentUser.id,
    );
  }, [currentUser, assignments]);

  const isAdmin = currentUser?.roles.includes("admin") ?? false;
  const canUpload = isProjectMember || isAdmin;
  const canView = isAuthenticated && (isProjectMember || isAdmin);

  function canDelete(attachment: ProjectAttachmentItem): boolean {
    if (!currentUser) {
      return false;
    }

    if (attachment.uploadedBy?.id === currentUser.id) {
      return true;
    }

    if (isAdmin) {
      return true;
    }

    return (
      currentUser.roles.includes("coordinator") &&
      assignments.some(
        (assignment) =>
          assignment.userId === currentUser.id &&
          assignment.role === "coordinator",
      )
    );
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("El archivo supera el límite de 10 MB.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      setErrorMessage("Tipo de archivo no permitido.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage("Selecciona un archivo antes de subirlo.");
      return;
    }

    const form = event.currentTarget;

    startTransition(async () => {
      try {
        await uploadProjectAttachment(String(projectId), selectedFile);
        setSelectedFile(null);
        form.reset();
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo subir el anexo",
        );
      }
    });
  }

  function handleDownload(attachment: ProjectAttachmentItem) {
    if (!canView) {
      setListError(
        "No tienes permisos para descargar los anexos de este proyecto.",
      );
      return;
    }

    setListError(null);

    startTransition(async () => {
      try {
        await downloadProjectAttachment(
          String(projectId),
          attachment.id,
          attachment.originalName,
        );
      } catch (error) {
        setListError(
          error instanceof Error
            ? error.message
            : "No se pudo descargar el anexo",
        );
      }
    });
  }

  function handleDelete(attachment: ProjectAttachmentItem) {
    if (!canDelete(attachment)) {
      setListError("No tienes permisos para eliminar este anexo.");
      return;
    }

    if (!window.confirm(`¿Eliminar el anexo "${attachment.originalName}"?`)) {
      return;
    }

    setListError(null);

    startTransition(async () => {
      try {
        await deleteProjectAttachment(String(projectId), attachment.id);
        router.refresh();
      } catch (error) {
        setListError(
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el anexo",
        );
      }
    });
  }

  const showActions = canView || attachments.some(canDelete);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anexos</CardTitle>
          <CardDescription>
            Documentos e imágenes vinculados al proyecto. Máximo 10 MB por
            archivo (PDF, Word, Excel, PNG o JPEG).
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground">Cargando acceso...</p>
          ) : !isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              Inicia sesión para consultar y subir anexos.
              <Button render={<Link href="/login">Iniciar sesión</Link>} />
            </div>
          ) : canUpload ? (
            <form onSubmit={handleUpload} className="space-y-4">
              <Input
                type="file"
                onChange={handleFileChange}
                disabled={isPending}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedFile
                    ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}`
                    : "Selecciona un archivo para subir."}
                </span>
                <Button
                  type="submit"
                  disabled={isPending || !selectedFile}
                >
                  {isPending ? "Subiendo..." : "Subir anexo"}
                </Button>
              </div>

              {errorMessage ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
            </form>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RiLockLine className="size-4 shrink-0" />
              Solo los participantes del proyecto pueden subir anexos.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archivos</CardTitle>
          <CardDescription>
            {attachments.length === 0
              ? "No hay anexos registrados."
              : `${attachments.length} anexo(s) registrado(s).`}
          </CardDescription>
        </CardHeader>

        {attachments.length > 0 ? (
          <CardContent>
            {ready && !canView ? (
              <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <RiLockLine className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium">
                    {isAuthenticated
                      ? "No tienes permisos para ver ni descargar los anexos de este proyecto."
                      : "Inicia sesión para ver y descargar los anexos."}
                  </p>
                  {!isAuthenticated ? (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href="/login">Iniciar sesión</Link>}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            {listError ? (
              <p className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <RiErrorWarningLine className="size-4 shrink-0" />
                {listError}
              </p>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead className="w-32">Tamaño</TableHead>
                  <TableHead className="w-48">Subido</TableHead>
                  {showActions ? (
                    <TableHead className="w-24 text-right">Acciones</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attachments.map((attachment) => (
                  <TableRow key={attachment.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-2">
                        <RiAttachmentLine className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          {canView ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(attachment)}
                              className="truncate text-left font-medium hover:underline"
                            >
                              {attachment.originalName}
                            </button>
                          ) : (
                            <span
                              className="flex items-center gap-1.5 truncate text-left font-medium text-muted-foreground"
                              title="No tienes permisos para descargar este anexo"
                            >
                              {attachment.originalName}
                              <RiLockLine className="size-3.5 shrink-0" />
                            </span>
                          )}
                          {attachment.uploadedBy ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {attachment.uploadedBy.fullName}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBytes(attachment.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(attachment.createdAt)}
                    </TableCell>
                    {showActions ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canView ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Descargar anexo"
                              onClick={() => handleDownload(attachment)}
                              disabled={isPending}
                            >
                              <RiDownloadLine />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Sin permisos para descargar"
                              title="No tienes permisos para descargar este anexo"
                              disabled
                            >
                              <RiLockLine />
                            </Button>
                          )}
                          {canDelete(attachment) ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Eliminar anexo"
                              className="text-destructive"
                              onClick={() => handleDelete(attachment)}
                              disabled={isPending}
                            >
                              <RiDeleteBinLine />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
