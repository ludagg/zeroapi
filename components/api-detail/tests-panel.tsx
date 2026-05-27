import { CodeViewer, type CodeFile } from "@/components/api-detail/code-viewer";

export function TestsPanel({
  total,
  passed,
  durationMs,
  testSuite,
}: {
  total: number | null;
  passed: number | null;
  durationMs?: number | null;
  testSuite?: string | null;
}) {
  const hasData = total !== null && passed !== null && total > 0;
  const percent = hasData ? Math.round((passed / total) * 100) : null;
  const failed = hasData ? total - passed : null;

  const files: CodeFile[] = testSuite
    ? [{ name: "tests/api.test.ts", content: testSuite, language: "ts" }]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-[14px] border border-line bg-[#0E100E]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
            <h3 className="font-mono text-[12px] text-[#E5E7E3]">
              Suite de tests · Vitest
            </h3>
            <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10.5px] text-accent-ink">
              {hasData ? `${passed}/${total} ✓` : "—"}
            </span>
          </div>
          <div className="overflow-x-auto px-5 py-4 font-mono text-[12px] leading-[1.8] text-[#E5E7E3] scrollbar-thin">
            {hasData ? (
              <>
                <Line color="accent">✓ {passed} tests passants</Line>
                {failed && failed > 0 ? (
                  <Line color="danger">✗ {failed} tests en échec</Line>
                ) : null}
                <div className="my-3 border-t border-white/[0.08]" />
                <Line color="accent">Test Files passed</Line>
                <Line color="accent">     Tests  {passed} passed ({total})</Line>
                {durationMs ? (
                  <Line color="muted">
                    Duration  {(durationMs / 1000).toFixed(2)}s
                  </Line>
                ) : null}
              </>
            ) : (
              <Line color="muted">
                -- aucun rapport de test disponible. Lance la génération pour
                produire la suite Vitest.
              </Line>
            )}
          </div>
        </div>

        <div className="rounded-[14px] border border-line bg-surface">
          <div className="border-b border-line px-5 py-3">
            <h3 className="font-mono text-[12px] text-ink-2">Couverture</h3>
          </div>
          <div className="px-5 py-5">
            <div className="flex items-baseline gap-2 font-serif text-[34px] leading-none">
              {percent !== null ? `${percent}%` : "--"}
              <span className="font-sans text-[12px] text-muted">passés</span>
            </div>
            <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-bg-3">
              <div
                className="h-full bg-accent transition-[width] duration-700"
                style={{ width: percent !== null ? `${percent}%` : "0%" }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Tests" value={total !== null ? String(total) : "--"} />
              <Stat label="Passés" value={passed !== null ? String(passed) : "--"} />
              <Stat
                label="Durée"
                value={durationMs ? `${(durationMs / 1000).toFixed(1)}s` : "--"}
              />
            </div>
          </div>
        </div>
      </div>

      {files.length > 0 && <CodeViewer files={files} />}
    </div>
  );
}

function Line({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "accent" | "danger" | "muted";
}) {
  const cls =
    color === "accent"
      ? "text-accent"
      : color === "danger"
      ? "text-[#FF8A8A]"
      : "text-[#6A6E66]";
  return <div className={cls}>{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-bg p-3">
      <div className="font-serif text-[22px] leading-none">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
    </div>
  );
}
