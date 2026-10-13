import { proxyJson } from "@/app/api/proxy";

export function PATCH(request: Request) {
  return proxyJson(request, "/auth/me/password", "PATCH");
}
