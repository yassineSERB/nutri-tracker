import Link from "next/link";

const LINKS = [
  { href: "/", label: "Aujourd'hui" },
  { href: "/history", label: "Historique" },
  { href: "/foods", label: "Aliments" },
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/analyses", label: "Analyses" },
  { href: "/profile", label: "Profil" },
] as const;

export function Nav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex gap-1 border-b border-black/10 dark:border-white/15">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-black font-medium dark:border-white"
                : "border-transparent text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
