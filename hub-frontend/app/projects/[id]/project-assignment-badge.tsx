"use client";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../components/auth-provider";

type ProjectAssignmentBadgeProps = {
  assignments: {
    id: number;
    projectId: number;
    userId: number;
    role: string;
    user: {
      id: number;
      fullName: string;
      email: string;
    };
  }[];
};

export default function ProjectAssignmentBadge({
  assignments,
}: ProjectAssignmentBadgeProps) {
  const { session, ready } = useAuth();

  if (!ready || !session) {
    return null;
  }

  const isAssigned = assignments.some(
    (assignment) => assignment.userId === session.user.id,
  );

  if (isAssigned) {
    return <Badge>Asignado</Badge>;
  }

  return <Badge variant="outline">No asignado</Badge>;
}
