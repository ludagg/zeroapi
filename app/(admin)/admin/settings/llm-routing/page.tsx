import { listProvidersForAdmin } from "@/lib/ai-providers";
import { listRoutingForAdmin, ROUTING_PLANS, ROUTING_TASKS } from "@/lib/llm-routing-config";
import { RoutingMatrix } from "@/components/admin/routing-matrix";

export const dynamic = "force-dynamic";

export default async function AdminLLMRoutingPage() {
  const [providers, matrix] = await Promise.all([
    listProvidersForAdmin(),
    listRoutingForAdmin(),
  ]);

  const enabled = providers.filter((p) => p.enabled);

  return (
    <>
      <header className="mb-7">
        <h1 className="font-serif text-[44px] leading-none tracking-[-0.01em]">
          LLM <em className="italic">Routing</em>.
        </h1>
        <p className="mt-2 text-muted">
          Plan × tâche → provider. La config DB écrase les valeurs par défaut hardcodées.
        </p>
      </header>

      <RoutingMatrix
        matrix={matrix}
        plans={ROUTING_PLANS}
        tasks={[...ROUTING_TASKS]}
        providers={enabled.map((p) => ({ id: p.provider, label: p.label }))}
      />
    </>
  );
}
