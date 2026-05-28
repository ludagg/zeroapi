import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  jobId: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1),
  query: z.record(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

const ALLOWED_HEADERS = new Set([
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "x-api-key",
  "x-request-id",
  "x-tenant-id",
]);

const MAX_BODY_BYTES = 200_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const TIMEOUT_MS = 15_000;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requête invalide.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { jobId, method, path, query, headers: reqHeaders, body } = parsed.data;

  const job = await prisma.job.findFirst({
    where: { id: jobId, userId: session.user.id },
    include: { deployment: true },
  });
  if (!job) {
    return NextResponse.json({ error: "API introuvable." }, { status: 404 });
  }

  const baseUrl = job.deployment?.url;
  if (!baseUrl || job.deployment?.status !== "ONLINE") {
    return NextResponse.json(
      { error: "Cette API n'est pas en ligne. Déploie-la d'abord." },
      { status: 409 },
    );
  }

  let target: URL;
  try {
    target = new URL(baseUrl);
  } catch {
    return NextResponse.json({ error: "URL de déploiement invalide." }, { status: 500 });
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  target = new URL(cleanPath, target);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== "") target.searchParams.set(k, v);
    }
  }

  if (body && body.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Body trop volumineux (max ${MAX_BODY_BYTES} octets).` },
      { status: 413 },
    );
  }

  const outHeaders: Record<string, string> = {
    "user-agent": "ZeroAPI-Playground/1.0",
  };
  if (reqHeaders) {
    for (const [k, v] of Object.entries(reqHeaders)) {
      const key = k.toLowerCase();
      if (ALLOWED_HEADERS.has(key) && v) outHeaders[key] = v;
    }
  }
  if ((method === "POST" || method === "PUT" || method === "PATCH") && body && !outHeaders["content-type"]) {
    outHeaders["content-type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const startedAt = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method,
      headers: outHeaders,
      body: method === "GET" || method === "DELETE" ? undefined : body,
      signal: controller.signal,
      redirect: "manual",
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = (err as { name?: string }).name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? `Timeout après ${TIMEOUT_MS / 1000}s. L'API ne répond pas.`
          : `Échec de la requête : ${(err as Error).message}`,
        url: target.toString(),
      },
      { status: 502 },
    );
  }
  clearTimeout(timeout);

  const elapsedMs = Date.now() - startedAt;

  const respHeaders: Record<string, string> = {};
  upstream.headers.forEach((value, key) => {
    respHeaders[key] = value;
  });

  const buffer = await upstream.arrayBuffer();
  const truncated = buffer.byteLength > MAX_RESPONSE_BYTES;
  const sliced = truncated ? buffer.slice(0, MAX_RESPONSE_BYTES) : buffer;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(sliced);

  return NextResponse.json({
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
    body: text,
    truncated,
    size: buffer.byteLength,
    elapsedMs,
    url: target.toString(),
  });
}
