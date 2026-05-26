import { CodeBlock } from "@/components/api-detail/code-block";
import { DownloadButton } from "@/components/api-detail/download-button";

type SourceFile = {
  path: string;
  content: string;
  lang: "ts" | "prisma";
};

export function SourcePanel({
  files,
  jobId,
  downloadable,
}: {
  files: SourceFile[];
  jobId: string;
  downloadable: boolean;
}) {
  if (!files.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-muted">
        Le code source n&apos;est pas encore disponible.
      </div>
    );
  }
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Code source</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Les principaux fichiers générés. Le ZIP contient l&apos;arborescence complète.
          </p>
        </div>
        {downloadable && <DownloadButton jobId={jobId} />}
      </header>

      <div className="space-y-4">
        {files.map((f) => (
          <CodeBlock
            key={f.path}
            code={f.content}
            lang={f.lang}
            filename={f.path}
            maxHeight="380px"
          />
        ))}
      </div>
    </section>
  );
}
