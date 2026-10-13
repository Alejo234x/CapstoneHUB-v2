import { proxyJson, proxyToBackend } from "@/app/api/proxy";

export function GET(request: Request) {
  return proxyToBackend(request, "/auth/users", { cache: "no-store" });
}

export function POST(request: Request) {
  return proxyJson(request, "/auth/users", "POST");
}
