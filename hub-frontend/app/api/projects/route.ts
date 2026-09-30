import { proxyJson, proxyToBackend } from "@/app/api/proxy";

export async function GET(request: Request) {
  return proxyToBackend(request, "/projects", { cache: "no-store" });
}

export async function POST(request: Request) {
  return proxyJson(request, "/projects", "POST");
}
