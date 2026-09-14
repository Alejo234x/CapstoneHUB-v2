import { proxyToBackend } from "@/app/api/proxy";

export async function GET(request: Request) {
  return proxyToBackend(request, "/projects/mine", {
    method: "GET",
    cache: "no-store",
  });
}
