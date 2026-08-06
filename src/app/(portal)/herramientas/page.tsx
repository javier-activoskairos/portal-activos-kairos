import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/session";
import { IconExternal, IconToolbox } from "@/components/icons";

export const metadata = { title: "Herramientas · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

interface ToolLink {
  label: string;
  href: string;
}

interface Tool {
  name: string;
  desc: string;
  /** Ventaja de partner, si la hay. */
  perk?: string;
  /** Aviso adicional bajo los enlaces. */
  note?: string;
  links: ToolLink[];
}

/**
 * Catálogo de herramientas recomendadas. Hardcodeado a propósito: es el mismo
 * para todos los clientes, sin base de datos ni sincronización con Notion.
 */
const TOOLS: Tool[] = [
  {
    name: "Notion",
    desc: "Espacio de trabajo todo en uno: documentación, bases de datos y paneles. Es donde vive tu sistema Kairos.",
    perk: "De 1 a 6 meses gratis del plan Business.",
    links: [
      { label: "Darse de alta", href: "https://affiliate.notion.so/kairos" },
    ],
  },
  {
    name: "Google Workspace",
    desc: "Correo profesional, Drive, Calendar y Meet con tu dominio.",
    perk: "14 días de prueba gratuita + códigos de descuento para los planes Starter y Standard.",
    note: "Los códigos de descuento son de un solo uso: pídenoslos antes de contratar y te asignamos uno.",
    links: [
      {
        label: "Darse de alta",
        href: "https://referworkspace.app.goo.gl/kDHw",
      },
    ],
  },
  {
    name: "Manychat",
    desc: "Automatización de conversaciones en WhatsApp, Instagram y Messenger.",
    perk: "Tres ventajas disponibles: elige la que mejor te encaje.",
    links: [
      {
        label: "1er mes gratis en PRO",
        href: "https://manychat.partnerlinks.io/kairos-mes-pro",
      },
      {
        label: "30 % dto. · 3 meses",
        href: "https://manychat.partnerlinks.io/10wid2zjztmc",
      },
      {
        label: "50 % dto. · 2 meses",
        href: "https://manychat.partnerlinks.io/klmcfdhqq66i-wki14",
      },
    ],
  },
  {
    name: "Tella",
    desc: "Grabación de vídeo y pantalla para explicar procesos sin reuniones.",
    perk: "20 % de descuento durante 3 meses.",
    links: [
      {
        label: "Darse de alta",
        href: "https://refer.tella.com/activos-kairos",
      },
    ],
  },
  {
    name: "Softr",
    desc: "Portales y aplicaciones web sobre tus propias bases de datos, sin programar.",
    links: [{ label: "Darse de alta", href: "https://get.softr.io/kairos" }],
  },
  {
    name: "Make",
    desc: "Automatización de procesos entre aplicaciones. Es el motor de buena parte de tus automatizaciones.",
    links: [
      {
        label: "Darse de alta",
        href: "https://www.make.com/en/register?pc=kairos",
      },
    ],
  },
  {
    name: "Tally",
    desc: "Formularios que conectan directamente con tus bases de datos.",
    links: [
      { label: "Darse de alta", href: "https://tally.cello.so/QBDMK3TYicO" },
    ],
  },
];

export default async function HerramientasPage() {
  const session = await getPortalSession();
  if (!session) redirect("/acceso-denegado");

  return (
    <div className="portal-reveal space-y-5">
      <div>
        <p className="text-brand-accent text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          Recursos
        </p>
        <h1 className="text-foreground mt-2.5 text-[28px] leading-tight font-extrabold tracking-tight">
          Las herramientas con las que trabajamos.
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[62ch] text-[15px] leading-relaxed">
          Las usamos cada día y las conocemos a fondo. Si vas a darte de alta en
          alguna, hazlo desde estos enlaces: son de partner y te dan ventajas
          que no obtienes entrando directamente.
        </p>
      </div>

      <div className="border-border bg-card text-muted-foreground rounded-[18px] border border-dashed p-4 text-[13.5px] leading-relaxed">
        ¿Dudas sobre cuál te conviene o cómo configurarla? Escríbenos{" "}
        <span className="text-foreground font-semibold">
          antes de contratar
        </span>{" "}
        y te ayudamos a elegir el plan correcto.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <div
            key={tool.name}
            className="border-border bg-card flex flex-col rounded-[20px] border p-5 shadow-[var(--shadow-sm)]"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span className="bg-accent text-brand-accent flex size-9 shrink-0 items-center justify-center rounded-[10px]">
                <IconToolbox width={17} height={17} />
              </span>
              <span className="text-foreground text-[16px] font-bold tracking-tight">
                {tool.name}
              </span>
            </div>
            <p className="text-muted-foreground text-[13.5px] leading-relaxed">
              {tool.desc}
            </p>
            {tool.perk && (
              <p className="text-brand-accent bg-accent mt-3 rounded-[10px] px-3 py-2 text-[12.5px] leading-snug font-semibold">
                {tool.perk}
              </p>
            )}
            <div className="mt-3.5 flex flex-wrap gap-2">
              {tool.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="border-border bg-muted/60 text-foreground hover:border-brand/40 hover:bg-accent inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors"
                >
                  {link.label}
                  <IconExternal className="text-muted-foreground" />
                </a>
              ))}
            </div>
            {tool.note && (
              <p className="text-muted-foreground mt-2.5 text-[12px] leading-snug">
                {tool.note}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-muted-foreground text-[13.5px] leading-relaxed">
        ¿Echas en falta alguna herramienta? Dínoslo y la valoramos contigo antes
        de que contrates nada.
      </p>
    </div>
  );
}
