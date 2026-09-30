import { proxyJson } from "@/app/api/proxy";

export async function POST(request: Request) {
  return proxyJson(request, "/auth/login", "POST");
}
