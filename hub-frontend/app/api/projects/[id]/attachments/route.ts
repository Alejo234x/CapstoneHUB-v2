import { proxyToBackend } from "@/app/api/proxy";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  return proxyToBackend(request, `/projects/${id}/attachments`, {
    cache: "no-store",
  });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  const body = await request.arrayBuffer();

  return proxyToBackend(request, `/projects/${id}/attachments`, {
    method: "POST",
    body,
    headers: contentType ? { "Content-Type": contentType } : {},
  });
}
