type ProjectNaturalProposer = {
  type: "natural_person";
  fullName: string;
  idNumber: string;
  email: string;
};

type ProjectLegalProposer = {
  type: "legal_person";
  legalName: string;
  nit: string;
  email: string;
  phone: string;
  contactUrl: string | null;
};

export type ProjectProposer =
  | ProjectNaturalProposer
  | ProjectLegalProposer;

type ProjectActor = {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  assignedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
};

export type UserSummary = {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
};

export type ProjectObservationItem = {
  id: number;
  projectId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    fullName: string;
    email: string;
  } | null;
};

export type ProjectCategory = {
  id: number;
  name: string;
  color?: string | null;
};

export type ProjectMilestoneItem = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
  createdAt?: string;
};

export type ProjectAttachmentItem = {
  id: number;
  projectId: number;
  reportId?: number | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: {
    id: number;
    fullName: string;
    email: string;
  } | null;
};

export type ProjectReportStatus =
  | "pending"
  | "submitted"
  | "accepted"
  | "rejected";

export type ProjectReportItem = {
  id: number;
  projectId: number;
  status: ProjectReportStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string | null;
  dueDate: string;
  createdBy: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  reviewedBy: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  attachments: ProjectAttachmentItem[];
};

export type ProjectStatusHistoryItem = {
  id: number;
  projectId: number;
  previousStatus: string | null;
  nextStatus: string;
  description: string | null;
  changedAt: string;
  author: {
    id: number;
    fullName: string;
    email: string;
  } | null;
};

export type ProjectItem = {
  id: string;
  name: string;
  location?: string;
  context?: string;
  status: string;
  startDate: string;
  proposer?: ProjectProposer;
  actors: ProjectActor[];
  estimatedCost?: string | null;
};

export type ProjectDetails = {
  id: number;
  name: string;
  description: string;
  context: string;
  location?: string | null;
  status: string;
  proposer?: ProjectProposer;
  startDate: string;
  endDate: string | null;
  estimatedCost: string | null;
  createdAt: string;
  updatedAt: string;
  observations: ProjectObservationItem[];
  actorAssignments: ProjectActor[];
  // Opcionales: el backend aún no los expone en todos los ambientes.
  // Cuando existan, se muestran automáticamente en la pestaña "Categorías".
  categories?: ProjectCategory[];
  milestones?: ProjectMilestoneItem[];
  statusHistory?: ProjectStatusHistoryItem[];
  attachments?: ProjectAttachmentItem[];
  reports?: ProjectReportItem[];
};
