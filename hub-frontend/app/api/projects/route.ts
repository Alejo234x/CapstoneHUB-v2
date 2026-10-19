import { proxyJson, proxyToBackend } from "@/app/api/proxy";

export async function GET(request: Request) {
  const search = new URL(request.url).search;

  return proxyToBackend(request, `/projects${search}`, { cache: "no-store" });
}

export async function POST(request: Request) {
  return proxyJson(request, "/projects", "POST");
}
