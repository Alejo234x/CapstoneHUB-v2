import { proxyJson, proxyToBackend } from "@/app/api/proxy";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  return proxyToBackend(request, `/projects/${id}/observations`, {
    cache: "no-store",
  });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  return proxyJson(request, `/projects/${id}/observations`, "POST");
}
