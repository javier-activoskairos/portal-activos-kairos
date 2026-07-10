"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/inicio", label: "Inicio" },
  { href: "/activos", label: "Activos" },
  { href: "/incidencias", label: "Incidencias" },
];

export function PortalNav({
  email,
  companyName,
  isAdmin,
}: {
  email: string;
  companyName: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const links = isAdmin
    ? [...LINKS, { href: "/admin", label: "Sincronización" }]
    : LINKS;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
              K
            </span>
            <span className="hidden text-sm font-semibold sm:inline">
              {companyName}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-brand-accent"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground md:inline">
            {email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
