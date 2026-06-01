import { NextResponse } from "next/server";
import {
  generateOpenAPISpec,
  generateSdk,
  generatePostmanCollection,
  generatePrismaSchema,
  generateReadme,
  generateTests,
} from "@ludagg/zeroapi-runtime";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readSpec } from "@/lib/conversation-helpers";
import { specToMermaidER } from "@/lib/spec-mermaid";
import { buildBundle } from "@/workers/zip-bundle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Artifact = "openapi" | "sdk" | "postman" | "prisma" | "readme" | "mermaid" | "zip";

const FILE: Record<Exclude<Artifact, "zip">, { name: string; type: string }> = {
  openapi: { name: "openapi.json", type: "application/json" },
  sdk: { name: "client.ts", type: "text/plain; charset=utf-8" },
  postman: { name: "postman_collection.json", type: "application/json" },
  prisma: { name: "schema.prisma", type: "text/plain; charset=utf-8" },
  readme: { name: "README.md", type: "text/markdown; charset=utf-8" },
  mermaid: { name: "schema.mmd", type: "text/plain; charset=utf-8" },
};

/** Dev Mode artifacts (OpenAPI, SDK, Postman, Prisma, README, Mermaid ER, ZIP)
 *  generated live from the conversation's current spec. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const url = new URL(req.url);
  const artifact = (url.searchParams.get("artifact") ?? "openapi") as Artifact;
  const download = url.searchParams.get("download") === "1";

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    select: { spec: true },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const spec = readSpec(conv.spec ?? null);
  if (!spec || spec.resources.length === 0) {
    return NextResponse.json({ error: "Spec vide — décris d'abord ton API." }, { status: 404 });
  }
  const baseName = (spec.name || "api").replace(/[^a-z0-9-]/gi, "-");

  if (artifact === "zip") {
    const bundle = await buildBundle({
      spec,
      prismaSchema: generatePrismaSchema(spec),
      testSuite: generateTests(spec),
      openApiSpec: generateOpenAPISpec(spec),
    });
    return new Response(new Uint8Array(bundle.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(bundle.size),
        "Content-Disposition": `attachment; filename="${baseName}.zip"`,
        "Cache-Control": "private, no-cache",
      },
    });
  }

  let body: string;
  switch (artifact) {
    case "sdk":
      body = generateSdk(spec);
      break;
    case "postman":
      body = JSON.stringify(generatePostmanCollection(spec), null, 2);
      break;
    case "prisma":
      body = generatePrismaSchema(spec);
      break;
    case "readme":
      body = generateReadme(spec);
      break;
    case "mermaid":
      body = specToMermaidER(spec);
      break;
    case "openapi":
    default:
      body = JSON.stringify(generateOpenAPISpec(spec), null, 2);
      break;
  }

  const meta = FILE[artifact in FILE ? (artifact as keyof typeof FILE) : "openapi"];
  const headers: Record<string, string> = {
    "Content-Type": meta.type,
    "Cache-Control": "private, no-cache",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename="${meta.name}"`;

  return new Response(body, { status: 200, headers });
}
