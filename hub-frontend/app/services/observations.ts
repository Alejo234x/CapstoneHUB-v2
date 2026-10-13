import { ProjectObservationItem } from "./schemas";
import { apiRequest } from "@/lib/http";

export async function createProjectObservation(
  id: string,
  content: string,
): Promise<ProjectObservationItem> {
  return apiRequest<ProjectObservationItem>(
    `/api/projects/${id}/observations`,
    {
      method: "POST",
      body: { content },
      action: "añadir una observación",
    },
  );
}
