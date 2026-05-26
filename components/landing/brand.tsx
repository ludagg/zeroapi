import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="ZeroAPI">
      <span className="brand-mark h-[26px] w-[26px] text-[13px]">
        <span>0</span>
      </span>
      <span className="brand-name">
        <b>Zero</b>
        <i>API</i>
      </span>
    </Link>
  );
}
