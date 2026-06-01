import { listProvidersForAdmin } from "@/lib/ai-providers";
import { listRoutingForAdmin, ROUTING_PLANS, ROUTING_TASKS } from "@/lib/llm-routing-config";
import { RoutingMatrix } from "@/components/admin/routing-matrix";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function AdminLLMRoutingPage() {
  const [providers, matrix] = await Promise.all([
    listProvidersForAdmin(),
    listRoutingForAdmin(),
  ]);

  const enabled = providers.filter((p) => p.enabled);

  return (
    <>
      <PageHeader
        title={<>LLM <em>Routing</em>.</>}
        description="Plan × tâche → provider. La config DB écrase les valeurs par défaut hardcodées."
      />

      <RoutingMatrix
        matrix={matrix}
        plans={ROUTING_PLANS}
        tasks={[...ROUTING_TASKS]}
        providers={enabled.map((p) => ({ id: p.provider, label: p.label }))}
      />
    </>
  );
}
