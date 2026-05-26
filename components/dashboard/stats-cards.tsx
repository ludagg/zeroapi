import { formatNumber } from "@/lib/utils";

type Stat = {
  label: string;
  value: string | number;
  delta?: { value: string; direction: "up" | "down" };
  hint: string;
  icon: React.ReactNode;
  spark: "rise" | "step" | "wave" | "flat";
};

export function StatsCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-[12px] border border-line bg-surface p-4 transition hover:border-line-2"
        >
          <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
            {s.label}
            <span className="[&>svg]:h-[13px] [&>svg]:w-[13px]">{s.icon}</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2 font-serif text-[30px] leading-none tracking-[-0.01em] sm:text-[36px]">
            {typeof s.value === "number" ? formatNumber(s.value) : s.value}
            {s.delta && (
              <small
                className={
                  "rounded-[5px] px-1.5 py-0.5 font-sans text-[12px] font-medium " +
                  (s.delta.direction === "up"
                    ? "bg-accent-soft text-accent-ink"
                    : "bg-danger-soft text-danger")
                }
              >
                {s.delta.direction === "up" ? "↑" : "↓"} {s.delta.value}
              </small>
            )}
          </div>
          <div className="mt-1.5 text-[12px] text-muted">{s.hint}</div>
          <Spark variant={s.spark} />
        </div>
      ))}
    </div>
  );
}

function Spark({ variant }: { variant: Stat["spark"] }) {
  const paths: Record<Stat["spark"], { d: string; stroke: string }> = {
    rise: { d: "M0 22 L14 18 L28 20 L42 12 L56 14 L70 6 L84 9 L100 4", stroke: "var(--accent)" },
    step: {
      d: "M0 24 L20 24 L20 18 L40 18 L40 14 L60 14 L60 8 L80 8 L80 4 L100 4",
      stroke: "var(--ink)",
    },
    wave: {
      d: "M0 18 C 10 22, 18 8, 28 12 S 40 24, 50 16 S 65 6, 76 14 S 88 22, 100 10",
      stroke: "var(--accent)",
    },
    flat: { d: "M0 14 L14 16 L28 12 L42 18 L56 15 L70 20 L84 17 L100 22", stroke: "var(--muted)" },
  };
  const p = paths[variant];
  return (
    <svg className="mt-2.5 block h-7 w-full" viewBox="0 0 100 28" preserveAspectRatio="none">
      <path d={p.d} stroke={p.stroke} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
