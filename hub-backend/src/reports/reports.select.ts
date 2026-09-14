import { Prisma, ReportStatus } from '../generated/prisma/client';
import {
  ProjectAttachmentResponse,
  attachmentSelect,
  mapAttachment,
} from '../attachments/attachments.select';

const reportUserSelect = {
  id: true,
  fullName: true,
  email: true,
} as const satisfies Prisma.UserSelect;

export type ReportUser = Prisma.UserGetPayload<{
  select: typeof reportUserSelect;
}>;

export const reportSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  dueDate: true,
  status: true,
  submittedAt: true,
  reviewedAt: true,
  reviewComment: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: reportUserSelect },
  reviewedBy: { select: reportUserSelect },
  attachments: {
    select: attachmentSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  },
} as const satisfies Prisma.ProjectReportSelect;

export type SelectedReport = Prisma.ProjectReportGetPayload<{
  select: typeof reportSelect;
}>;

export type ProjectReportResponse = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: Date;
  status: ReportStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ReportUser | null;
  reviewedBy: ReportUser | null;
  attachments: ProjectAttachmentResponse[];
};

export function mapReport(report: SelectedReport): ProjectReportResponse {
  return {
    id: report.id,
    projectId: report.projectId,
    title: report.title,
    description: report.description,
    dueDate: report.dueDate,
    status: report.status,
    submittedAt: report.submittedAt,
    reviewedAt: report.reviewedAt,
    reviewComment: report.reviewComment,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    createdBy: report.createdBy,
    reviewedBy: report.reviewedBy,
    attachments: report.attachments.map(mapAttachment),
  };
}
