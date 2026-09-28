import Link from "next/link";

type LogoProps = {
  className?: string;
};

/** Inline SVG so the mark inherits `currentColor` and stays crisp in both
 *  themes without shipping a raster asset. */
export function Logo({ className = "h-7 w-7" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="8"
        className="fill-foreground"
      />
      {/* Fork on the left, leaf on the right: tracking and nutrition. */}
      <path
        d="M11 9v5.5a1.5 1.5 0 0 0 3 0V9"
        className="stroke-background"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M12.5 9v14" className="stroke-background" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M22.5 21.5c0-4.5 1.6-7.5 4-8.5-.4 5-1.7 8.3-4 8.3"
        className="stroke-background"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 21.5c-1.4-3-3.2-4.6-5.2-4.8.5 3 2.3 4.8 5.2 4.8"
        className="stroke-background"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoWordmark({
  className,
  linkTo,
  linkLabel = "app-web, accueil",
}: {
  className?: string;
  /** When set, the wordmark becomes a link to this route. */
  linkTo?: string;
  linkLabel?: string;
}) {
  const mark = (
    <>
      <Logo />
      <span className="text-sm font-semibold">app-web</span>
    </>
  );

  if (!linkTo) {
    return <span className={`flex items-center gap-2 ${className ?? ""}`}>{mark}</span>;
  }

  return (
    <Link
      href={linkTo}
      aria-label={linkLabel}
      className={`flex items-center gap-2 rounded ${className ?? ""}`}
    >
      {mark}
    </Link>
  );
}
