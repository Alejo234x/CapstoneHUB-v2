import { proxyJson } from "@/app/api/proxy";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  return proxyJson(request, `/projects/${id}/status`, "PATCH");
}
