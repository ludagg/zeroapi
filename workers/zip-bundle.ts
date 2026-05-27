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

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
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
      dependencies: {
        "@hono/node-server": "^1.13.7",
        "@ludagg/zeroapi-runtime": "^0.1.0",
        "@prisma/client": "^5.22.0",
        hono: "^4.6.13",
      },
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
  if (spec.auth?.strategy === "jwt" && spec.auth.secret) keys.add(spec.auth.secret);
  for (const m of required.missing) keys.add(m);
  return [...keys].map((k) => `${k}=`).join("\n") + "\n";
}

function readme(spec: ZeroAPISpec): string {
  const resourceCount = spec.resources.length;
  return `# ${spec.name}

${spec.description ?? "Backend généré par ZeroAPI."}

## Stack

- Hono.js + @ludagg/zeroapi-runtime
- Prisma (${resourceCount} ressources)
- ${spec.auth?.strategy ? `Auth : ${spec.auth.strategy.toUpperCase()}` : "Pas d'auth"}

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
