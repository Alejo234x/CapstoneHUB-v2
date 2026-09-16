import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set" },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");
  const response = await fetch(`${backendUrl}/projects/${id}/assignable-users`, {
    method: "GET",
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "application/json";
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": contentType },
  });
}
