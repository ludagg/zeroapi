import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="ZeroAPI">
      <BrandMark size={26} />
      <span className="brand-name">
        <b>Zero</b>
        <i>API</i>
      </span>
    </Link>
  );
}
