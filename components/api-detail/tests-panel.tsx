import { CodeBlock } from "@/components/api-detail/code-block";

export function TestsPanel({
  testSuite,
  testCount,
}: {
  testSuite: string;
  testCount: number;
}) {
  if (!testSuite) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        La suite de tests n&apos;est pas encore prête.
      </div>
    );
  }
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Suite de tests générée</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Vitest · prêt à exécuter avec <code className="font-mono">pnpm test</code>.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11.5px]">
          <span className="font-semibold text-ink">{testCount}</span>
          <span className="text-muted">test{testCount > 1 ? "s" : ""} détecté{testCount > 1 ? "s" : ""}</span>
        </span>
      </header>

      <CodeBlock
        code={testSuite}
        lang="ts"
        filename="tests/api.test.ts"
        maxHeight="65vh"
      />
    </section>
  );
}
