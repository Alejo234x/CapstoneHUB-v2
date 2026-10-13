import { NextResponse } from "next/server";
import { proxyJson, proxyToBackend } from "@/app/api/proxy";

type Params = Promise<{ path: string[] }>;

// Tope de memoria del BFF para el multipart de anexos: el backend aplica el
// límite real (`MAX_FILE_SIZE_BYTES`, 10 MB por defecto); aquí solo evitamos
// bufferizar cuerpos descomunales antes de reenviarlos.
const MAX_ATTACHMENT_BYTES = 32 * 1024 * 1024;
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

function invalidPath(): NextResponse {
  return NextResponse.json({ error: "Invalid path" }, { status: 400 });
}

/**
 * Convierte los segmentos decodificados en la ruta del backend, validando que
 * cada segmento solo contenga caracteres seguros (letras, dígitos, guion y
 * guion bajo). Esto bloquea el path traversal (`..`, `%2f`, barras inversas…)
 * que Next decodifica antes de entregar `path`.
 */
function projectBackendPath(path: string[]): string | null {
  if (path.some((segment) => !SAFE_SEGMENT.test(segment))) {
    return null;
  }

  return `/projects/${path.join("/")}`;
}

function isStreamPath(path: string[]): boolean {
  const last = path[path.length - 1];
  return last === "download" || last === "stream";
}

async function handle(
  request: Request,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string[],
): Promise<NextResponse> {
  const url = projectBackendPath(path);

  if (url === null) {
    return invalidPath();
  }

  if (method === "GET" && isStreamPath(path)) {
    return proxyToBackend(request, url, { cache: "no-store", stream: true });
  }

  if (method === "POST" && path.length === 2 && path[1] === "attachments") {
    const contentLength = Number(request.headers.get("content-length") ?? 0);

    if (contentLength > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: "File too large" },
        { status: 413 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    const body = await request.arrayBuffer();

    return proxyToBackend(request, url, {
      method: "POST",
      body,
      headers: contentType ? { "Content-Type": contentType } : {},
    });
  }

  if (method === "GET") {
    return proxyToBackend(request, url, { cache: "no-store" });
  }

  if (method === "DELETE") {
    return proxyToBackend(request, url, { method: "DELETE" });
  }

  return proxyJson(request, url, method);
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { path } = await params;
  return handle(request, "GET", path);
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { path } = await params;
  return handle(request, "POST", path);
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { path } = await params;
  return handle(request, "PUT", path);
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { path } = await params;
  return handle(request, "PATCH", path);
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { path } = await params;
  return handle(request, "DELETE", path);
}
