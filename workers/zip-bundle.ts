import JSZip from "jszip";
import {
  generateFlyConfig,
  generateRailwayConfig,
  generateRenderConfig,
  generateVercelConfig,
  validateEnv,
  type ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";

export type BundleInput = {
  spec: ZeroAPISpec;
  prismaSchema: string;
  testSuite: string;
  openApiSpec: unknown;
};

export type Bundle = { buffer: Buffer; size: number };

const INDEX_TS = `import { serve } from "@hono/node-server";
import { createRuntime, type ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import spec from "./spec.json";

const { app } = createRuntime(spec as ZeroAPISpec, {
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

const DOCKERFILE = `FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;

function packageJson(spec: ZeroAPISpec): string {
  const dependencies: Record<string, string> = {
    "@hono/node-server": "^1.13.7",
    "@ludagg/zeroapi-runtime": "^0.16.4",
    "@prisma/client": "^5.22.0",
    hono: "^4.6.13",
  };

  const uploadProvider = spec.features?.fileUpload?.provider;
  if (uploadProvider === "s3" || uploadProvider === "r2") {
    dependencies["@aws-sdk/client-s3"] = "^3.0.0";
  }

  return JSON.stringify(
    {
      name: spec.name,
      version: spec.version || "1.0.0",
      private: true,
      scripts: {
        dev: "tsx watch index.ts",
        build: "tsc",
        start: "node dist/index.js",
        test: "vitest run",
        "prisma:generate": "prisma generate",
        "prisma:push": "prisma db push",
      },
      dependencies,
      devDependencies: {
        "@types/node": "^20.17.10",
        prisma: "^5.22.0",
        tsx: "^4.19.2",
        typescript: "^5.7.2",
        vitest: "^2.1.8",
      },
      engines: { node: ">=18" },
    },
    null,
    2,
  );
}

function envExample(spec: ZeroAPISpec): string {
  const required = validateEnv(spec);
  const keys = new Set<string>(["DATABASE_URL", "PORT", ...(spec.requiredEnv ?? [])]);
  // Legacy auth.secret
  if (spec.auth?.strategy === "jwt" && spec.auth.secret) keys.add(spec.auth.secret);
  // Modern auth.jwt.secretEnv
  if (spec.auth?.jwt?.secretEnv) keys.add(spec.auth.jwt.secretEnv);
  // OAuth provider env vars
  for (const provider of spec.auth?.oauth?.providers ?? []) {
    keys.add(provider.clientIdEnv);
    keys.add(provider.clientSecretEnv);
  }
  // Declared env vars
  for (const env of spec.env ?? []) {
    keys.add(env.name);
  }
  for (const m of required.missing) keys.add(m);
  return [...keys].map((k) => `${k}=`).join("\n") + "\n";
}

function describeAuth(spec: ZeroAPISpec): string {
  const parts: string[] = [];
  if (spec.auth?.jwt?.enabled === true || spec.auth?.strategy === "jwt") parts.push("JWT");
  if (spec.auth?.apikey?.enabled === true || spec.auth?.strategy === "apikey") parts.push("API Key");
  if ((spec.auth?.oauth?.providers?.length ?? 0) > 0) parts.push("OAuth");
  if (spec.auth?.strategy === "bearer" && parts.length === 0) parts.push("Bearer");
  return parts.length > 0 ? `Auth : ${parts.join(" + ")}` : "Pas d'auth";
}

function readme(spec: ZeroAPISpec): string {
  const resourceCount = spec.resources.length;
  return `# ${spec.name}

${spec.description ?? "Backend généré par ZeroAPI."}

## Stack

- Hono.js + @ludagg/zeroapi-runtime
- Prisma (${resourceCount} ressources)
- ${describeAuth(spec)}

## Démarrage

\`\`\`bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm prisma:push
pnpm dev
\`\`\`

L'API écoute sur \`http://localhost:3000\`. La doc Scalar est sur \`/docs\`, l'OpenAPI JSON sur \`/openapi.json\`.

## Déploiement

Choisis ton fournisseur :

- \`railway.toml\` → Railway
- \`render.yaml\` → Render
- \`vercel.json\` → Vercel (serverless)
- \`fly.toml\` → Fly.io

Configure les variables d'environnement listées dans \`.env.example\`.
`;
}

export async function buildBundle({
  spec,
  prismaSchema,
  testSuite,
  openApiSpec,
}: BundleInput): Promise<Bundle> {
  const zip = new JSZip();

  zip.file("README.md", readme(spec));
  zip.file("package.json", packageJson(spec));
  zip.file(".env.example", envExample(spec));
  zip.file(".gitignore", "node_modules/\ndist/\n.env\nuploads/\n");
  zip.file("Dockerfile", DOCKERFILE);
  zip.file(".dockerignore", "node_modules\ndist\n.env\n.git\n");

  zip.file("index.ts", INDEX_TS);
  zip.file("spec.json", JSON.stringify(spec, null, 2));
  zip.file("openapi.json", JSON.stringify(openApiSpec, null, 2));

  zip.folder("prisma")!.file("schema.prisma", prismaSchema);
  zip.folder("tests")!.file("api.test.ts", testSuite);

  const deploy = zip.folder("deploy")!;
  deploy.file("railway.toml", generateRailwayConfig(spec));
  deploy.file("render.yaml", generateRenderConfig(spec));
  deploy.file("vercel.json", generateVercelConfig(spec));
  deploy.file("fly.toml", generateFlyConfig(spec));

  zip.file(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          outDir: "dist",
          target: "ES2020",
          module: "commonjs",
          esModuleInterop: true,
          resolveJsonModule: true,
          skipLibCheck: true,
        },
        include: ["index.ts"],
      },
      null,
      2,
    ),
  );

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { buffer, size: buffer.byteLength };
}
