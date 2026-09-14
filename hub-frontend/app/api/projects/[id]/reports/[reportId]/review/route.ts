import { proxyJson } from "@/app/api/proxy";

type Params = Promise<{ id: string; reportId: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { id, reportId } = await params;

  return proxyJson(request, `/projects/${id}/reports/${reportId}/review`, "POST");
}
