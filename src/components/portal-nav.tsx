"use client";

import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAlert,
  IconAssets,
  IconCalendar,
  IconChat,
  IconHome,
  IconLock,
  IconLogout,
  IconPlus,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { MeetingModal } from "@/components/meeting-modal";
import { IncidentModal } from "@/components/incident-modal";
import { cn, initialsFromEmail } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof IconHome;
  soon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: IconHome },
  { href: "/activos", label: "Activos", icon: IconAssets },
  { href: "/incidencias", label: "Incidencias", icon: IconAlert },
  { href: "/chat", label: "Chat", icon: IconChat, soon: true },
];

const SIDEBAR_W = 244;

function SoonTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "border-border text-muted-foreground rounded-full border px-[7px] py-px text-[10px] font-bold tracking-[0.06em] uppercase",
        className,
      )}
    >
      Pronto
    </span>
  );
}

function LogoutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post" className={className}>
      <button
        type="submit"
        className="border-border bg-card text-foreground hover:bg-muted flex w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13.5px] font-medium transition-colors"
      >
        <IconLogout /> Cerrar sesión
      </button>
    </form>
  );
}

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
  const initials = initialsFromEmail(email);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* ---------- Sidebar fija (desktop ≥900px) ---------- */}
      <aside
        className="portal-sidebar-glow border-border bg-card fixed inset-y-0 left-0 z-40 hidden flex-col gap-1 border-r px-4 py-[22px] min-[900px]:flex"
        style={{ width: SIDEBAR_W }}
      >
        <Link href="/inicio" className="flex items-center gap-3 px-2 pt-1 pb-5">
          <BrandMark size={32} radius={9} />
          <span className="text-foreground text-[15px] font-bold tracking-tight">
            Activos Kairos
          </span>
        </Link>

        <div className="flex items-center gap-2 px-2 pb-3.5">
          <span className="text-brand-accent font-mono text-[10px] font-bold tracking-[0.18em] uppercase">
            Portal de cliente
          </span>
          <span className="bg-border h-px flex-1" />
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = !item.soon && isActive(item.href);
            const content = (
              <>
                <Icon /> {item.label}
                {item.soon && <SoonTag className="ml-auto" />}
              </>
            );
            if (item.soon) {
              return (
                <span
                  key={item.href}
                  aria-disabled
                  className="text-muted-foreground/70 flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium"
                >
                  {content}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] transition-colors",
                  active
                    ? "bg-accent text-brand-accent font-semibold"
                    : "text-muted-foreground hover:text-foreground font-medium",
                )}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          {/* CTAs del portal — en el menú lateral (como el diseño) */}
          <button
            type="button"
            onClick={() => setMeetingOpen(true)}
            className="bg-brand text-brand-foreground flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold shadow-[var(--shadow-md)] transition-opacity hover:opacity-90"
          >
            <IconCalendar width={17} height={17} /> Agendar reunión
          </button>
          <button
            type="button"
            onClick={() => setIncidentOpen(true)}
            className="border-border bg-card text-foreground hover:bg-muted flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13.5px] font-medium transition-colors"
          >
            <IconPlus width={17} height={17} /> Nueva incidencia
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] transition-colors",
                isActive("/admin")
                  ? "bg-accent text-brand-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground font-medium",
              )}
            >
              <IconLock /> Sincronización
              <span className="text-muted-foreground ml-auto text-[10px] font-bold tracking-[0.06em] uppercase">
                Interno
              </span>
            </Link>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-muted-foreground text-xs">Tema</span>
            <ThemeToggle />
          </div>

          <div className="border-border border-t pt-3">
            <div className="mb-2 flex items-center gap-2.5 px-1">
              <span className="bg-accent text-brand-accent flex size-[34px] shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate text-[13px] font-semibold">
                  {companyName}
                </div>
                <div className="text-muted-foreground truncate text-[11.5px]">
                  {email}
                </div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ---------- Barra superior (móvil <900px) ---------- */}
      <header className="border-border bg-background/80 sticky top-0 z-40 flex items-center gap-2 border-b px-4 py-2.5 backdrop-blur-md min-[900px]:hidden">
        <Link href="/inicio" className="flex shrink-0 items-center">
          <BrandMark size={28} radius={8} />
        </Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = !item.soon && isActive(item.href);
            if (item.soon) {
              return (
                <span
                  key={item.href}
                  aria-disabled
                  className="text-muted-foreground/60 flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium"
                >
                  <Icon width={16} height={16} /> {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] whitespace-nowrap transition-colors",
                  active
                    ? "bg-accent text-brand-accent font-semibold"
                    : "text-muted-foreground hover:text-foreground font-medium",
                )}
              >
                <Icon width={16} height={16} /> {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] whitespace-nowrap transition-colors",
                isActive("/admin")
                  ? "bg-accent text-brand-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground font-medium",
              )}
            >
              <IconLock width={16} height={16} /> Sync
            </Link>
          )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMeetingOpen(true)}
            title="Agendar reunión"
            aria-label="Agendar reunión"
            className="bg-brand text-brand-foreground flex size-[38px] items-center justify-center rounded-[11px] shadow-[var(--shadow-sm)] transition-opacity hover:opacity-90"
          >
            <IconCalendar />
          </button>
          <button
            type="button"
            onClick={() => setIncidentOpen(true)}
            title="Nueva incidencia"
            aria-label="Nueva incidencia"
            className="border-border bg-card text-foreground hover:bg-muted flex size-[38px] items-center justify-center rounded-[11px] border transition-colors"
          >
            <IconPlus />
          </button>
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="border-border bg-card text-foreground hover:bg-muted flex size-[38px] items-center justify-center rounded-[11px] border transition-colors"
            >
              <IconLogout />
            </button>
          </form>
        </div>
      </header>

      <MeetingModal open={meetingOpen} onClose={() => setMeetingOpen(false)} />
      <IncidentModal
        open={incidentOpen}
        onClose={() => setIncidentOpen(false)}
      />
    </>
  );
}
