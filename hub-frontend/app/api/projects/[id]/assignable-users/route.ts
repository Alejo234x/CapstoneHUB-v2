import { proxyToBackend } from "@/app/api/proxy";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  return proxyToBackend(request, `/projects/${id}/assignable-users`, {
    cache: "no-store",
  });
}
