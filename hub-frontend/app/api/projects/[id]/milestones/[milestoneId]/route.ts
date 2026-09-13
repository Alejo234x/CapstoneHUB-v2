import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

type Params = Promise<{ id: string; milestoneId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id, milestoneId } = await params;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set" },
      { status: 500 },
    );
  }

  const payload = await request.json();
  const authorization = request.headers.get("authorization");
  const response = await fetch(
    `${backendUrl}/projects/${id}/milestones/${milestoneId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(payload),
    },
  );
  const contentType =
    response.headers.get("content-type") ?? "application/json";
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": contentType },
  });
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id, milestoneId } = await params;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set" },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");
  const response = await fetch(
    `${backendUrl}/projects/${id}/milestones/${milestoneId}`,
    {
      method: "DELETE",
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
      },
    },
  );
  const contentType =
    response.headers.get("content-type") ?? "application/json";
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": contentType },
  });
}
