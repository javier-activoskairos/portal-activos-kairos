"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAlert,
  IconAssets,
  IconBilling,
  IconBuilding,
  IconCalendar,
  IconChat,
  IconChevronLeft,
  IconExternal,
  IconHome,
  IconHourglass,
  IconLock,
  IconLogout,
  IconPlus,
  IconSettings,
  IconTemple,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { MeetingModal } from "@/components/meeting-modal";
import { IncidentModal } from "@/components/incident-modal";
import { cn, fullNameFromEmail, initialsFromEmail } from "@/lib/utils";

const SCHOLE_URL = "https://www.skool.com/kairos-hispania-llc-2847";

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
  { href: "/facturacion", label: "Facturación", icon: IconBilling },
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
  logoUrl,
  isAdmin,
  canBilling = false,
  openIncidents = 0,
}: {
  email: string;
  companyName: string;
  logoUrl: string | null;
  isAdmin: boolean;
  canBilling?: boolean;
  openIncidents?: number;
}) {
  // "Facturación" solo para el rol Facturación.
  const navItems = NAV_ITEMS.filter(
    (i) => i.href !== "/facturacion" || canBilling,
  );
  const pathname = usePathname();
  const initials = initialsFromEmail(email);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Estado colapsado persistente + variable CSS para el margen del contenido.
  useEffect(() => {
    const saved = localStorage.getItem("kp-nav-collapsed") === "1";
    setCollapsed(saved);
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--kp-sidebar-w",
      collapsed ? "76px" : `${SIDEBAR_W}px`,
    );
  }, [collapsed]);
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("kp-nav-collapsed", next ? "1" : "0");
      return next;
    });

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Clase de fila de navegación (icono + etiqueta), centrada si está colapsada.
  const rowCls = (active: boolean, muted = false) =>
    cn(
      "flex w-full items-center rounded-xl text-[14.5px] transition-colors",
      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
      active
        ? "bg-accent text-brand-accent font-semibold"
        : muted
          ? "text-muted-foreground/70"
          : "text-muted-foreground hover:text-foreground font-medium",
    );

  return (
    <>
      {/* ---------- Sidebar fija (desktop ≥900px) ---------- */}
      <aside
        className="portal-sidebar-glow border-border bg-card fixed inset-y-0 left-0 z-40 hidden flex-col gap-1 border-r py-[22px] transition-[width] duration-200 min-[900px]:flex"
        style={{ width: collapsed ? 76 : SIDEBAR_W, paddingInline: collapsed ? 12 : 16 }}
      >
        {/* Botón colapsar/expandir en el borde */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menú" : "Contraer menú"}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          className="border-border bg-card text-muted-foreground hover:text-foreground hover:border-brand/40 absolute top-[70px] -right-3 z-50 flex size-6 items-center justify-center rounded-full border shadow-[var(--shadow-sm)] transition-colors"
        >
          <IconChevronLeft
            width={14}
            height={14}
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
        </button>

        <Link
          href="/inicio"
          className={cn(
            "flex items-center pt-1 pb-5",
            collapsed ? "justify-center" : "gap-3 px-2",
          )}
        >
          <BrandMark size={32} radius={9} />
          {!collapsed && (
            <span className="text-foreground text-[15px] font-bold tracking-tight">
              Activos Kairos
            </span>
          )}
        </Link>

        <div
          className={cn(
            "flex items-center gap-2 pb-3.5",
            collapsed ? "px-1" : "px-2",
          )}
        >
          {!collapsed && (
            <span className="text-brand-accent font-mono text-[10px] font-bold tracking-[0.18em] uppercase">
              Bitácora de Rumbo
            </span>
          )}
          <span className="bg-border h-px flex-1" />
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !item.soon && isActive(item.href);
            const showCount = item.href === "/incidencias" && openIncidents > 0;
            if (item.soon) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? `${item.label} · Pronto` : undefined}
                  className={rowCls(isActive(item.href))}
                >
                  <Icon />
                  {!collapsed && (
                    <>
                      {item.label}
                      <SoonTag className="ml-auto" />
                    </>
                  )}
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(rowCls(active), "relative")}
              >
                <Icon />
                {!collapsed && item.label}
                {showCount &&
                  (collapsed ? (
                    <span className="bg-warning-foreground absolute top-1.5 right-1.5 size-2 rounded-full" />
                  ) : (
                    <span className="bg-warning text-warning-foreground ml-auto rounded-full px-2 py-0.5 font-mono text-[11.5px] font-bold">
                      {openIncidents}
                    </span>
                  ))}
              </Link>
            );
          })}

          {/* Divisor + subpágina Memento Mori */}
          <span className="bg-border my-2 h-px w-full" />
          <Link
            href="/memento-mori"
            title={collapsed ? "Memento Mori" : undefined}
            className={cn(
              rowCls(isActive("/memento-mori")),
              "text-[13.5px]",
              !collapsed && "pl-[22px]",
            )}
          >
            <IconHourglass />
            {!collapsed && (
              <>
                Memento Mori
                <IconExternal className="text-muted-foreground ml-auto" />
              </>
            )}
          </Link>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          {/* CTAs del portal — en el menú lateral (como el diseño) */}
          {!collapsed && (
            <span className="text-muted-foreground px-2 pb-0.5 text-[10.5px] font-bold tracking-[0.08em] uppercase">
              Acciones
            </span>
          )}
          <button
            type="button"
            onClick={() => setMeetingOpen(true)}
            title={collapsed ? "Agendar reunión" : undefined}
            className={cn(
              "bg-brand text-brand-foreground flex w-full items-center rounded-xl text-[13.5px] font-semibold shadow-[var(--shadow-md)] transition-opacity hover:opacity-90",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5",
            )}
          >
            <IconCalendar width={17} height={17} />
            {!collapsed && "Agendar reunión"}
          </button>
          <button
            type="button"
            onClick={() => setIncidentOpen(true)}
            title={collapsed ? "Nueva incidencia" : undefined}
            className={cn(
              "border-border bg-card text-foreground hover:bg-muted flex w-full items-center rounded-xl border text-[13.5px] font-medium transition-colors",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5",
            )}
          >
            <IconPlus width={17} height={17} />
            {!collapsed && "Nueva incidencia"}
          </button>
          <a
            href={SCHOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "Scholē Kairos" : undefined}
            className={cn(
              "border-border bg-card text-foreground hover:bg-muted flex w-full items-center rounded-xl border text-[13.5px] font-medium transition-colors",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5",
            )}
          >
            <IconTemple width={16} height={16} />
            {!collapsed && "Scholē Kairos"}
          </a>

          {isAdmin && (
            <Link
              href="/admin"
              title={collapsed ? "Sincronización (interno)" : undefined}
              className={cn(
                "flex w-full items-center rounded-xl text-[12.5px] transition-colors",
                collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5",
                isActive("/admin")
                  ? "bg-accent text-brand-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground font-medium",
              )}
            >
              <IconLock />
              {!collapsed && (
                <>
                  Sincronización
                  <span className="text-muted-foreground ml-auto text-[10px] font-bold tracking-[0.06em] uppercase">
                    Interno
                  </span>
                </>
              )}
            </Link>
          )}

          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "justify-between px-1",
            )}
          >
            {!collapsed && (
              <span className="text-muted-foreground text-xs">Tema</span>
            )}
            <ThemeToggle />
          </div>

          <div className="border-border border-t pt-3">
            {/* Empresa — encima del usuario */}
            <div
              className={cn(
                "mb-2.5 flex items-center gap-2",
                collapsed ? "justify-center" : "px-1",
              )}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={companyName}
                  title={collapsed ? companyName : undefined}
                  className="border-border bg-card size-[26px] shrink-0 rounded-lg border object-contain p-0.5"
                />
              ) : (
                <span
                  title={collapsed ? companyName : undefined}
                  className="bg-accent text-brand-accent flex size-[26px] shrink-0 items-center justify-center rounded-lg"
                >
                  <IconBuilding width={15} height={15} />
                </span>
              )}
              {!collapsed && (
                <span className="text-foreground truncate text-[13px] font-semibold">
                  {companyName}
                </span>
              )}
            </div>
            {/* Usuario */}
            <div
              className={cn(
                "mb-2 flex items-center gap-2.5",
                collapsed ? "justify-center" : "px-1",
              )}
            >
              <Link
                href="/configuracion"
                title={collapsed ? fullNameFromEmail(email) : "Configuración"}
                aria-label="Configuración"
                className="bg-accent text-brand-accent flex size-[34px] shrink-0 items-center justify-center rounded-full text-sm font-bold"
              >
                {initials}
              </Link>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-[13px] font-semibold">
                      {fullNameFromEmail(email)}
                    </div>
                    <div className="text-muted-foreground truncate text-[11.5px]">
                      {email}
                    </div>
                  </div>
                  <Link
                    href="/configuracion"
                    title="Configuración"
                    aria-label="Configuración"
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive("/configuracion")
                        ? "bg-accent text-brand-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <IconSettings width={17} height={17} />
                  </Link>
                </>
              )}
            </div>
            {collapsed ? (
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="border-border bg-card text-foreground hover:bg-muted flex w-full items-center justify-center rounded-xl border py-2.5 transition-colors"
                >
                  <IconLogout />
                </button>
              </form>
            ) : (
              <LogoutButton />
            )}
          </div>
        </div>
      </aside>

      {/* ---------- Barra superior (móvil <900px) ---------- */}
      <header className="border-border bg-background/80 sticky top-0 z-40 flex items-center gap-2 border-b px-4 py-2.5 backdrop-blur-md min-[900px]:hidden">
        <Link href="/inicio" className="flex shrink-0 items-center">
          <BrandMark size={28} radius={8} />
        </Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !item.soon && isActive(item.href);
            if (item.soon) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] whitespace-nowrap transition-colors",
                    isActive(item.href)
                      ? "bg-accent text-brand-accent font-semibold"
                      : "text-muted-foreground hover:text-foreground font-medium",
                  )}
                >
                  <Icon width={16} height={16} /> {item.label}
                </Link>
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
