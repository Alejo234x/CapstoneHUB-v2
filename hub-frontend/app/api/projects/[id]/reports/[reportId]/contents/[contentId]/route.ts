import { proxyJson, proxyToBackend } from "@/app/api/proxy";

type Params = Promise<{ id: string; reportId: string; contentId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id, reportId, contentId } = await params;

  return proxyJson(
    request,
    `/projects/${id}/reports/${reportId}/contents/${contentId}`,
    "PATCH",
  );
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id, reportId, contentId } = await params;

  return proxyToBackend(
    request,
    `/projects/${id}/reports/${reportId}/contents/${contentId}`,
    { method: "DELETE" },
  );
}