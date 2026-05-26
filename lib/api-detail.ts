import {
  generateFlyConfig,
  generateOpenAPISpec,
  generateRailwayConfig,
  generateRenderConfig,
  generateVercelConfig,
  type OpenAPISpec,
  type ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";

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
