import {
  generateFlyConfig,
  generateOpenAPISpec,
  generatePrismaSchema,
  generateRailwayConfig,
  generateRenderConfig,
  generateTests,
  generateVercelConfig,
  type OpenAPISpec,
  type ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import type { CodeFile } from "@/components/api-detail/code-viewer";

export type OpenApiEndpoint = {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
};

const KNOWN_METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);

/**
 * Flattens the OpenAPI paths object into a list of (method, path, summary)
 * tuples for display. The order respects the order of paths in the spec.
 */
export function listEndpointsFromOpenApi(openApi: OpenAPISpec): OpenApiEndpoint[] {
  const out: OpenApiEndpoint[] = [];
  for (const [path, methods] of Object.entries(openApi.paths)) {
    if (!methods || typeof methods !== "object") continue;
    for (const [method, value] of Object.entries(methods as Record<string, unknown>)) {
      if (!KNOWN_METHODS.has(method.toLowerCase())) continue;
      const op = value as { summary?: string; description?: string; tags?: string[] };
      out.push({
        method: method.toUpperCase(),
        path,
        summary: op.summary,
        description: op.description,
        tags: op.tags,
      });
    }
  }
  return out;
}

export function buildOpenApiSpec(spec: ZeroAPISpec): OpenAPISpec {
  return generateOpenAPISpec(spec);
}

export type DeployTarget = {
  id: "railway" | "render" | "vercel" | "flyio";
  label: string;
  filename: string;
  language: "toml" | "yaml" | "json";
  config: string;
  docs: string;
};

const SERVER_TS = `import { serve } from "@hono/node-server";
import { createRuntime } from "@ludagg/zeroapi-runtime";
import spec from "./spec.json";

const { app } = createRuntime(spec, {
  enableLogging: true,
  enableCors: true,
  enableHelmet: true,
  enableSanitize: true,
  enableDocs: true,
  validateEnv: true,
});

// Force \`charset=utf-8\` sur les réponses JSON/texte. Le runtime sert
// /openapi.json (et les autres réponses JSON) en \`application/json\` tout court :
// les octets sont du bon UTF-8, mais un client/proxy qui retombe sur Latin-1
// affiche « tÃ¢ches » au lieu de « tâches ». On déclare l'encodage à la source
// au lieu de réécrire les caractères.
const baseFetch = app.fetch.bind(app);
const fetch = (...args: Parameters<typeof app.fetch>): Promise<Response> =>
  Promise.resolve(baseFetch(...args)).then((res) => {
    const ct = res.headers.get("content-type");
    if (
      ct &&
      /^(application\\/([\\w.+-]*\\+)?json|text\\/[\\w.+-]+)\\s*(;|$)/i.test(ct) &&
      !/charset/i.test(ct)
    ) {
      const headers = new Headers(res.headers);
      headers.set("content-type", \`\${ct}; charset=utf-8\`);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }
    return res;
  });

const port = Number(process.env.PORT ?? 3000);
serve({ fetch, port });
console.log(\`API listening on http://localhost:\${port}\`);
`;

/**
 * Builds the set of source files shown in the Code source tab.
 * All generators are pure — safe to call at render time.
 */
export function buildSourceFiles(spec: ZeroAPISpec): CodeFile[] {
  return [
    { name: "prisma/schema.prisma", content: generatePrismaSchema(spec), language: "prisma" },
    { name: "src/server.ts", content: SERVER_TS, language: "ts" },
    { name: "tests/api.test.ts", content: generateTests(spec), language: "ts" },
    {
      name: "openapi.json",
      content: JSON.stringify(generateOpenAPISpec(spec), null, 2),
      language: "json",
    },
    { name: "spec.json", content: JSON.stringify(spec, null, 2), language: "json" },
  ];
}

export function buildDeployConfigs(spec: ZeroAPISpec): DeployTarget[] {
  return [
    {
      id: "railway",
      label: "Railway",
      filename: "railway.toml",
      language: "toml",
      config: generateRailwayConfig(spec),
      docs: "https://docs.railway.app/deploy/config-as-code",
    },
    {
      id: "render",
      label: "Render",
      filename: "render.yaml",
      language: "yaml",
      config: generateRenderConfig(spec),
      docs: "https://render.com/docs/blueprint-spec",
    },
    {
      id: "vercel",
      label: "Vercel",
      filename: "vercel.json",
      language: "json",
      config: generateVercelConfig(spec),
      docs: "https://vercel.com/docs/projects/project-configuration",
    },
    {
      id: "flyio",
      label: "Fly.io",
      filename: "fly.toml",
      language: "toml",
      config: generateFlyConfig(spec),
      docs: "https://fly.io/docs/reference/configuration/",
    },
  ];
}
