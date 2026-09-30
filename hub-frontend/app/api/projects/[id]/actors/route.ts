import { proxyJson } from "@/app/api/proxy";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  return proxyJson(request, `/projects/${id}/actors`, "POST");
}
