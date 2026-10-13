import { NextResponse } from "next/server";
import { proxyJson } from "@/app/api/proxy";

const NUMERIC_ID = /^\d+$/;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!NUMERIC_ID.test(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  return proxyJson(request, `/auth/users/${id}/roles`, "PATCH");
}
