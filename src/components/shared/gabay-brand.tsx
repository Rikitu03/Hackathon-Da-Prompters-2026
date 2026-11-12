import Link from "next/link";
import { BookOpen, Waves } from "lucide-react";

/**
 * One shared GabayIskolar brand mark for student and admin surfaces.
 * The applicant CSS remains authoritative for the original book-and-wave artwork.
 */
export function GabayBrand({ inverse = false, className = "" }: { inverse?: boolean; className?: string }) {
  return (
    <Link href="/" className={["brand", inverse ? "inverse" : "", className].filter(Boolean).join(" ")} aria-label="GabayIskolar home">
      <span className="brand-mark" aria-hidden="true">
        <BookOpen size={23}/>
        <Waves size={14}/>
      </span>
      <span>GabayIskolar<span className="brand-dot">.</span></span>
    </Link>
  );
}
