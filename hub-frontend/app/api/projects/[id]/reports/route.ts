import { proxyJson, proxyToBackend } from "@/app/api/proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyToBackend(request, `/projects/${id}/reports`, {
    cache: "no-store",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyJson(request, `/projects/${id}/reports`, "POST");
}
