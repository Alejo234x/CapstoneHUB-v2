import { Prisma } from '../generated/prisma/client';

export const attachmentSelect = {
  id: true,
  projectId: true,
  reportId: true,
  uploadedByUserId: true,
  originalName: true,
  storageKey: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  uploadedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const satisfies Prisma.ProjectAttachmentSelect;

export type SelectedAttachment = Prisma.ProjectAttachmentGetPayload<{
  select: typeof attachmentSelect;
}>;

export type ProjectAttachmentResponse = {
  id: number;
  projectId: number;
  reportId: number | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy: {
    id: number;
    fullName: string;
    email: string;
  } | null;
};

export function mapAttachment(
  attachment: SelectedAttachment,
): ProjectAttachmentResponse {
  return {
    id: attachment.id,
    projectId: attachment.projectId,
    reportId: attachment.reportId,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt,
    uploadedBy: attachment.uploadedBy,
  };
}
