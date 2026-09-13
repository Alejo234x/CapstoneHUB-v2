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
};
