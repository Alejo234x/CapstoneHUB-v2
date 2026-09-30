import { proxyToBackend } from "@/app/api/proxy";

type Params = Promise<{ id: string; attachmentId: string }>;

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id, attachmentId } = await params;

  return proxyToBackend(request, `/projects/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}
