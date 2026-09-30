import { proxyToBackend } from "@/app/api/proxy";

type Params = Promise<{ id: string; milestoneId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id, milestoneId } = await params;

  return proxyToBackend(request, `/projects/${id}/milestones/${milestoneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id, milestoneId } = await params;

  return proxyToBackend(request, `/projects/${id}/milestones/${milestoneId}`, {
    method: "DELETE",
  });
}
