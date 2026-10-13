import { NextResponse } from "next/server";
import {
  backendUnavailableResponse,
  isCrossOriginMutation,
} from "../proxy";
import { setSessionCookie } from "./session";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

/**
 * Login y registro: guarda el token en la cookie httpOnly y devuelve solo el
 * usuario (el token nunca llega al navegador).
 */
export async function proxySessionRequest(request: Request, url: string) {
  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set" },
      { status: 500 },
    );
  }

  if (isCrossOriginMutation(request)) {
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 },
    );
  }

  let response: Response;

  try {
    response = await fetch(`${backendUrl}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return backendUnavailableResponse();
  }

  const contentType =
    response.headers.get("content-type") ?? "application/json";
  const body = await response.text();

  if (!response.ok) {
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": contentType },
    });
  }

  const data = JSON.parse(body) as {
    user?: unknown;
    accessToken?: string;
  };

  if (data.accessToken) {
    await setSessionCookie(data.accessToken);
  }

  return NextResponse.json({ user: data.user }, { status: response.status });
}
