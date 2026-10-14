import { apiRequest } from "@/lib/http";

export type KpiProjectStatus =
  | "proposed"
  | "under_review"
  | "approved"
  | "in_progress"
  | "paused"
  | "closed"
  | "cancelled"
  | "rejected";

export type KpiPhase = "semester_1" | "semester_2";

export type KpiPendingProposal = {
  id: number;
  name: string;
  proposerName: string | null;
  createdAt: string;
};

export type KpiPendingReview = {
  projectId: number;
  projectName: string;
  reportId: number;
  title: string;
  dueDate: string;
  submittedAt: string | null;
  overdue: boolean;
};

export type KpiOverdueMilestone = {
  projectId: number;
  projectName: string;
  milestoneId: number;
  title: string;
  dueDate: string;
};

export type KpiReviewWindow = {
  total: number;
  accepted: number;
  rejected: number;
  averageHours: number | null;
};

export type KpiResponse = {
  scope: "global" | "assigned";
  projects: {
    total: number;
    byStatus: { status: KpiProjectStatus; count: number }[];
    byPhase: { phase: KpiPhase; count: number }[];
  };
  pendingProposals: { count: number; items: KpiPendingProposal[] };
  pendingReviews: {
    count: number;
    overdueCount: number;
    items: KpiPendingReview[];
  };
  overdueMilestones: { count: number; items: KpiOverdueMilestone[] };
  myReviews: {
    all: KpiReviewWindow;
    last30Days: KpiReviewWindow;
    lastWeek: KpiReviewWindow;
  };
};

export function getKpis(): Promise<KpiResponse> {
  return apiRequest<KpiResponse>("/api/stats/kpis", {
    action: "consultar los indicadores",
  });
}

const KPI_ROLES = ["admin", "teacher", "evaluator"] as const;

/** El panel está disponible para docentes, evaluadores y administradores. */
export function canViewKpis(roles: readonly string[]): boolean {
  return roles.some((role) =>
    (KPI_ROLES as readonly string[]).includes(role),
  );
}
