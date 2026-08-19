import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/session";
import {
  IconCheck,
  IconExternal,
  IconMail,
  IconPlay,
  IconToolbox,
} from "@/components/icons";

export const metadata = { title: "Primeros Pasos · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

interface EnlaceAlta {
  label: string;
  href: string;
}

interface Herramienta {
  name: string;
  desc: string;
  /**
   * Enlaces de alta (o de descarga, cuando la herramienta es una app). Varios
   * cuando la ventaja de partner viene en distintas modalidades (Manychat).
   */
  links: EnlaceAlta[];
  /** Ventaja de partner, si la hay. */
  perk?: string;
  /** Aviso adicional bajo los enlaces. */
  note?: string;
  /** Vídeo de alta y configuración. `null` mientras no esté grabado. */
  video: string | null;
}

interface Conexion {
  name: string;
  desc: string;
  video: string;
  /** Vídeo alternativo para un caso particular (p. ej. correos no corporativos). */
  altVideo?: { label: string; href: string };
}

/**
 * Contenido de la puesta en marcha. Hardcodeado a propósito: es el mismo para
 * todos los clientes, así que no merece base de datos ni sincronización con
 * Notion. Qué herramientas aplican a cada proyecto se acuerda en el
 * descubrimiento, no se decide aquí.
 *
 * Esta lista es el catálogo único de altas: absorbe el que vivía en la página
 * /herramientas (eliminada; ahora redirige aquí) para que el cliente no tenga
 * que mirar en dos sitios qué cuenta le toca crear.
 */
const HERRAMIENTAS: Herramienta[] = [
  {
    name: "Notion",
    desc: "Espacio de trabajo todo en uno: documentación, bases de datos y paneles. Es donde vive tu sistema Kairos.",
    links: [
      { label: "Darse de alta", href: "https://affiliate.notion.so/kairos" },
    ],
    perk: "3 meses de plan Business gratis.",
    video: "https://www.loom.com/share/4d1a94ec725e4bb39c53ff71da74ab3e",
  },
  {
    name: "Make",
    desc: "El motor de las automatizaciones: conecta tus aplicaciones entre sí.",
    links: [
      {
        label: "Darse de alta",
        href: "https://www.make.com/en/register?pc=kairos",
      },
    ],
    video: "https://www.loom.com/share/b44ac600394445a2bc146cc57581db3d",
  },
  {
    name: "Tally",
    desc: "Formularios que entran directamente en tus bases de datos.",
    links: [
      { label: "Darse de alta", href: "https://tally.cello.so/QBDMK3TYicO" },
    ],
    video: "https://www.loom.com/share/12e3048662924427890e395c6df15680",
  },
  {
    name: "Loom",
    desc: "Grabación de pantalla para explicar procesos sin necesidad de reunirse.",
    links: [{ label: "Descargar Loom", href: "https://www.loom.com/download" }],
    video: "https://www.loom.com/share/91d10ef9a12941d7822f3541fae19305",
  },
  {
    name: "Tella",
    desc: "Grabación de vídeo y pantalla para explicar procesos sin reuniones.",
    links: [
      {
        label: "Darse de alta",
        href: "https://refer.tella.com/activos-kairos",
      },
    ],
    perk: "20 % de descuento durante 3 meses.",
    video: null,
  },
  {
    name: "Google Workspace",
    desc: "Correo profesional, Drive, Calendar y Meet con tu propio dominio.",
    links: [
      {
        label: "Darse de alta",
        href: "https://c.gle/ANiao5qvW-wlMKjb5uG8T636fl5upAcgnJu5vFHhiMy7mBTL31rVn2sA04_cYoOiR5yWAB03tEXhhreOrpPM9_Y6gU_Xe4EYUlzwyjXd-gvvD5FNIv_ql2hjIWtJ-emhLcjGiX76fSZN1iEZmhKewG61",
      },
    ],
    perk: "14 días de prueba gratuita + códigos de descuento para los planes Starter y Standard.",
    note: "Los códigos de descuento son de un solo uso: pídenoslos antes de contratar y te asignamos uno.",
    video: "https://www.loom.com/share/ad5e5788031a4c009530382408951b1f",
  },
  {
    name: "Softr",
    desc: "Portales y aplicaciones web sobre tus propias bases de datos, sin programar.",
    links: [{ label: "Darse de alta", href: "https://get.softr.io/kairos" }],
    video: null,
  },
  {
    name: "Manychat",
    desc: "Automatización de conversaciones en WhatsApp, Instagram y Messenger.",
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
    perk: "Tres ventajas disponibles: elige la que mejor te encaje.",
    video: null,
  },
  {
    name: "VPS (Hostinger)",
    desc: "Servidor propio para alojar las automatizaciones que no deben depender de terceros.",
    links: [
      {
        label: "Darse de alta",
        href: "https://www.hostinger.com/es?REFERRALCODE=FQMJAVIERSMP",
      },
    ],
    // Pendiente: Javier grabará el vídeo del alta del VPS. Hasta entonces se
    // muestra "Vídeo en camino" en vez de un enlace que no lleva a ningún sitio.
    video: null,
  },
];

const CONEXIONES: Conexion[] = [
  {
    name: "Notion → Make",
    desc: "Autoriza Make para que pueda leer y escribir en tu espacio de Notion.",
    video: "https://www.loom.com/share/677a010c198d4ce4bccc72882680d8fc",
  },
  {
    name: "Tally → Make",
    desc: "Conecta tus formularios para que las respuestas disparen automatizaciones.",
    video: "https://www.loom.com/share/b37dca2a5eee4bea9b8911b12d4d856f",
  },
  {
    name: "Google Workspace → Make",
    desc: "Da acceso a Gmail, Drive y Calendar desde Make.",
    video: "https://www.loom.com/share/5135963b41fb46bea2a4983301d19fad",
    altVideo: {
      label: "Si tu correo no es corporativo",
      href: "https://www.youtube.com/watch?v=kPRIxr-wUv4",
    },
  },
];

/** Enlace externo: siempre en pestaña nueva para no sacar al cliente del portal. */
function EnlaceExterno({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={
        primary
          ? "border-border bg-muted/60 text-foreground hover:border-brand/40 hover:bg-accent inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors"
          : "text-brand-accent hover:text-brand inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors"
      }
    >
      {children}
    </a>
  );
}

export default async function PrimerosPasosPage() {
  const session = await getPortalSession();
  if (!session) redirect("/acceso-denegado");

  return (
    <div className="portal-reveal space-y-5">
      <div>
        <p className="text-brand-accent text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          Primeros pasos
        </p>
        <h1 className="text-foreground mt-2.5 text-[28px] leading-tight font-extrabold tracking-tight">
          Empecemos por lo básico.
        </h1>
        {/* Sin max-w: los párrafos ocupan lo mismo que el grid de tarjetas y los
            bloques, para que todo quede alineado al mismo ancho. */}
        <p className="text-muted-foreground mt-1.5 text-[15px] leading-relaxed">
          Antes de construir nada necesitamos las cuentas listas. Solo tienes
          que crear las de{" "}
          <span className="text-foreground font-semibold">
            las herramientas que hayamos acordado en el descubrimiento
          </span>
          : cada proyecto usa unas distintas, así que ignora las que no te
          apliquen. Y si ya tienes alguna, no la dupliques: basta con invitarnos
          o pasarnos las credenciales según lo que hayamos hablado.
        </p>
      </div>

      {/* ---- Bloque 1: altas ---- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-foreground text-[19px] font-bold tracking-tight">
            1 · Crea las cuentas que te falten
          </h2>
          <p className="text-muted-foreground mt-1 text-[13.5px] leading-relaxed">
            Cada tarjeta tiene el enlace de alta y, cuando lo hay, un vídeo
            corto con el paso a paso. Date de alta desde estos enlaces: son de
            partner y algunos te dan ventajas que no consigues entrando por tu
            cuenta.
          </p>
        </div>

        <div className="border-border bg-card text-muted-foreground rounded-[18px] border border-dashed p-4 text-[13.5px] leading-relaxed">
          ¿Dudas sobre cuál te conviene o sobre qué plan contratar? Escríbenos{" "}
          <span className="text-foreground font-semibold">
            antes de contratar
          </span>{" "}
          y lo vemos contigo.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {HERRAMIENTAS.map((tool) => (
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
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {tool.links.map((link) => (
                  <EnlaceExterno key={link.href} href={link.href} primary>
                    {link.label}
                    <IconExternal className="text-muted-foreground" />
                  </EnlaceExterno>
                ))}
                {tool.video ? (
                  <EnlaceExterno href={tool.video}>
                    <IconPlay />
                    Ver vídeo
                  </EnlaceExterno>
                ) : (
                  <span className="text-muted-foreground/70 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium">
                    <IconPlay />
                    Vídeo en camino
                  </span>
                )}
              </div>
              {tool.note && (
                <p className="text-muted-foreground mt-2.5 text-[12px] leading-snug">
                  {tool.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---- Bloque 2: acceso a cuentas existentes ---- */}
      <section className="border-border bg-card space-y-2.5 rounded-[20px] border p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2.5">
          <span className="bg-accent text-brand-accent flex size-9 shrink-0 items-center justify-center rounded-[10px]">
            <IconCheck width={17} height={17} />
          </span>
          <h2 className="text-foreground text-[19px] font-bold tracking-tight">
            2 · Si ya las tienes, dános acceso
          </h2>
        </div>
        <p className="text-muted-foreground text-[13.5px] leading-relaxed">
          No hace falta crear cuentas nuevas ni migrar nada. Según lo que
          hayamos acordado para cada herramienta, con una de estas dos cosas es
          suficiente:{" "}
          <span className="text-foreground font-semibold">invitarnos</span> a tu
          cuenta como colaboradores, o{" "}
          <span className="text-foreground font-semibold">
            pasarnos las credenciales
          </span>{" "}
          por el canal que te indiquemos.
        </p>
        <p className="text-muted-foreground border-border flex items-start gap-2 rounded-[14px] border border-dashed p-3.5 text-[13.5px] leading-relaxed">
          <IconMail
            width={16}
            height={16}
            className="text-brand-accent mt-0.5 shrink-0"
          />
          <span>
            Cuando tengas las cuentas creadas y nos hayas invitado,{" "}
            <span className="text-foreground font-semibold">
              avísanos por correo
            </span>{" "}
            y seguimos desde ahí.
          </span>
        </p>
      </section>

      {/* ---- Bloque 3: conexiones entre herramientas ---- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-foreground text-[19px] font-bold tracking-tight">
            3 · Conecta las herramientas entre sí
          </h2>
          <p className="text-muted-foreground mt-1 text-[13.5px] leading-relaxed">
            Con las cuentas creadas, queda autorizar a Make para que hable con
            el resto. Un vídeo por conexión.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CONEXIONES.map((conn) => (
            <div
              key={conn.name}
              className="border-border bg-card flex flex-col rounded-[20px] border p-5 shadow-[var(--shadow-sm)]"
            >
              <span className="text-foreground text-[16px] font-bold tracking-tight">
                {conn.name}
              </span>
              <p className="text-muted-foreground mt-1.5 text-[13.5px] leading-relaxed">
                {conn.desc}
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <EnlaceExterno href={conn.video} primary>
                  <IconPlay />
                  Ver vídeo
                </EnlaceExterno>
                {conn.altVideo && (
                  <EnlaceExterno href={conn.altVideo.href}>
                    <IconPlay />
                    {conn.altVideo.label}
                  </EnlaceExterno>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-muted-foreground text-[13.5px] leading-relaxed">
        ¿Te has atascado en algún paso o echas en falta alguna herramienta? Abre
        una incidencia o agenda una reunión desde el menú y lo resolvemos
        contigo.
      </p>
    </div>
  );
}
