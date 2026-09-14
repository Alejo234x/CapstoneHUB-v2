import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

export type ProxyOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | null;
  headers?: Record<string, string>;
  cache?: RequestCache;
};

export async function proxyToBackend(
  request: Request,
  path: string,
  options: ProxyOptions = {},
): Promise<NextResponse> {
  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set" },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");

  const response = await fetch(`${backendUrl}${path}`, {
    method: options.method,
    body: options.body,
    cache: options.cache,
    headers: {
      ...options.headers,
      ...(authorization ? { Authorization: authorization } : {}),
    },
  });

  const contentType =
    response.headers.get("content-type") ?? "application/json";
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": contentType },
  });
}

export async function proxyJson(
  request: Request,
  path: string,
  method: "POST" | "PUT" | "PATCH",
): Promise<NextResponse> {
  const body = await request.text();

  return proxyToBackend(request, path, {
    method,
    headers: { "Content-Type": "application/json" },
    body,
  });
}
