"use client";

import Image from "next/image";
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
    <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/inicio" className="flex items-center gap-2">
            <Image
              src="/isotipo.png"
              alt="Activos Kairos"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="hidden text-sm font-semibold sm:inline">
              {companyName}
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-[#c44e00]"
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
          <span className="hidden text-[13px] text-[#9a8e82] md:inline">
            {email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="border-border text-muted-foreground hover:bg-secondary rounded-full border px-2.5 py-1 text-xs font-medium"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
