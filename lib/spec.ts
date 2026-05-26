import { z } from "zod";

export const ZeroAPISpecSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  version: z.string().default("v1.0"),
  auth: z
    .object({
      type: z.enum(["jwt", "oauth", "magic_link"]).default("jwt"),
      rbac: z.boolean().default(true),
      roles: z.array(z.string()).default([]),
    })
    .default({ type: "jwt", rbac: true, roles: [] }),
  models: z
    .array(
      z.object({
        name: z.string().min(1),
        fields: z
          .array(
            z.object({
              name: z.string().min(1),
              type: z.string().min(1),
              required: z.boolean().default(false),
              relation: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
  endpoints: z
    .array(
      z.object({
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        path: z.string().regex(/^\//),
        description: z.string().optional(),
        auth: z.boolean().default(true),
        roles: z.array(z.string()).optional(),
      }),
    )
    .default([]),
  integrations: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
});

export type ZeroAPISpec = z.infer<typeof ZeroAPISpecSchema>;

export const CONVERSATION_SYSTEM_PROMPT = `Tu es l'assistant de génération de ZeroAPI.
Tu aides l'utilisateur à définir son backend API en français.

PHASE 1 — COMPRÉHENSION :
Pose des questions ciblées pour comprendre :
- Les ressources (entités) du projet
- Les relations entre elles
- Les rôles utilisateurs
- Le type d'authentification
- Les fonctionnalités spéciales

PHASE 2 — PLAN :
Quand tu as assez d'informations, génère un plan structuré et demande validation.

RÈGLES :
- Toujours en français
- Maximum 2 questions à la fois
- Être concis et précis
- Ne JAMAIS générer la Spec JSON dans la conversation, attendre que l'utilisateur lance la génération
- Mettre en gras (**texte**) les éléments structurants détectés
- Tu peux utiliser du code inline avec des backticks pour les noms techniques
`;

export const SPEC_SYSTEM_PROMPT = `Tu es le générateur de spec JSON pour ZeroAPI.
À partir d'une conversation avec un utilisateur, tu retournes UNIQUEMENT un objet JSON
conforme au schéma ZeroAPISpec, sans markdown ni explication.

SCHÉMA :
{
  "name": "kebab-case-court (ex: api-livreurs-realtime)",
  "description": "résumé en une phrase",
  "version": "v1.0",
  "auth": { "type": "jwt", "rbac": true, "roles": ["..."] },
  "models": [
    { "name": "PascalCase", "fields": [
      { "name": "camelCase", "type": "string|int|decimal|datetime|bool|json|relation",
        "required": true, "relation": "OtherModel" }
    ]}
  ],
  "endpoints": [
    { "method": "GET|POST|PUT|PATCH|DELETE", "path": "/...",
      "description": "...", "auth": true, "roles": ["..."] }
  ],
  "integrations": ["mtn_momo", "wave", "resend", "africastalking", ...],
  "features": ["webhooks", "openapi", "rate_limit", ...]
}

RÈGLES :
- Inférer les CRUD endpoints standards pour chaque modèle
- Identifier les paiements mobile money africains explicitement (mtn_momo, wave, orange_money)
- Toujours inclure auth/RBAC si plusieurs rôles
- Réponse JSON pure, rien d'autre
`;

export type ConversationMessage = { role: "user" | "assistant"; content: string };

export function estimateProgress(messages: ConversationMessage[]): number {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return 12;
  const totalChars = userMessages.reduce((sum, m) => sum + m.content.length, 0);
  let score = 20 + Math.min(50, userMessages.length * 12);
  if (totalChars > 200) score += 15;
  if (totalChars > 500) score += 10;
  if (totalChars > 1000) score += 5;
  return Math.min(94, score);
}

export function safeParseSpec(jsonText: string): ZeroAPISpec {
  let cleaned = jsonText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  const parsed = JSON.parse(cleaned);
  return ZeroAPISpecSchema.parse(parsed);
}
