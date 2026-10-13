import { proxyToBackend } from "@/app/api/proxy";

export function GET(request: Request) {
  return proxyToBackend(request, "/auth/me", { cache: "no-store" });
}
