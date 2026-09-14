import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

type Params = Promise<{ id: string; reportId: string }>;

async function proxy(
  request: Request,
  url: string,
  init: RequestInit,
): Promise<NextResponse> {
  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set" },
      { status: 500 },
    );
  }

  const response = await fetch(`${backendUrl}${url}`, {
    ...init,
    headers: {
      ...init.headers,
      ...(request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization")! }
        : {}),
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

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id, reportId } = await params;
  const payload = await request.json();

  return proxy(request, `/projects/${id}/reports/${reportId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id, reportId } = await params;

  return proxy(request, `/projects/${id}/reports/${reportId}`, {
    method: "DELETE",
  });
}
