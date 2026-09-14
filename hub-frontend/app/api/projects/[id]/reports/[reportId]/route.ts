import { proxyJson, proxyToBackend } from "@/app/api/proxy";

type Params = Promise<{ id: string; reportId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id, reportId } = await params;

  return proxyJson(request, `/projects/${id}/reports/${reportId}`, "PATCH");
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id, reportId } = await params;

  return proxyToBackend(request, `/projects/${id}/reports/${reportId}`, {
    method: "DELETE",
  });
}
