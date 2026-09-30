import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

type Params = Promise<{ id: string; reportId: string; contentId: string }>;

/**
 * Proxy de streaming para imágenes, videos y archivos. Reenvía la cabecera
 * `Range` y devuelve el cuerpo sin bufferizar, de modo que `<video>` pueda
 * buscar sin descargar el archivo completo. El token llega por query porque los
 * elementos multimedia no pueden enviar `Authorization`.
 */
export async function GET(request: Request, { params }: { params: Params }) {
  const { id, reportId, contentId } = await params;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const authorization =
    request.headers.get("authorization") ?? (token ? `Bearer ${token}` : null);
  const range = request.headers.get("range");

  const upstream = await fetch(
    `${backendUrl}/projects/${id}/reports/${reportId}/contents/${contentId}/stream`,
    {
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
    },
  );

  const headers = new Headers();

  for (const header of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "content-disposition",
  ]) {
    const value = upstream.headers.get(header);

    if (value) {
      headers.set(header, value);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}