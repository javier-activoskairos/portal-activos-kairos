"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import consultantsData from "@/data/consultants.json";
import { IconArrowLeft, IconClose } from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";

type MeetingKey = "astrapi" | "arete" | "protos";

interface Consultant {
  slug: string;
  name: string;
  color: string;
  image: string;
  meetings: Partial<Record<MeetingKey, string>>;
}

const CONSULTANTS = consultantsData as Consultant[];

interface MeetingType {
  key: MeetingKey;
  name: string;
  glyph: string;
  dur: string;
  desc: string;
}

// Tipos de reunión del diseño. `protos` solo se muestra si algún consultor lo
// ofrece (ver `availableTypes`).
const MEETING_TYPES: MeetingType[] = [
  {
    key: "astrapi",
    name: "Astrapi",
    glyph: "⚡",
    dur: "25 min",
    desc: "Diagnóstico y resolución rápida de incidencias técnicas u operativas.",
  },
  {
    key: "arete",
    name: "Areté",
    glyph: "🏛️",
    dur: "60 min",
    desc: "Nuevas peticiones, mejoras o evoluciones de tu sistema.",
  },
  {
    key: "protos",
    name: "Prótos",
    glyph: "🧭",
    dur: "45 min",
    desc: "Seguimiento estratégico.",
  },
];

const availableTypes = MEETING_TYPES.filter((t) =>
  CONSULTANTS.some((c) => c.meetings[t.key]),
);

/** Foto del consultor con fallback a círculo con inicial + color de marca. */
function ConsultantAvatar({ consultant }: { consultant: Consultant }) {
  const [errored, setErrored] = useState(false);
  if (errored || !consultant.image) {
    return (
      <span
        className="inline-flex size-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
        style={{ background: consultant.color }}
        aria-hidden
      >
        {consultant.name.charAt(0)}
      </span>
    );
  }
  return (
    <Image
      src={consultant.image}
      alt={consultant.name}
      width={64}
      height={64}
      onError={() => setErrored(true)}
      className="size-16 rounded-2xl object-cover"
    />
  );
}

export function MeetingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState<MeetingType | null>(null);

  // Reset del paso al cerrar (patrón de ajuste de estado en render por cambio
  // de prop; evita setState dentro de un efecto).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setTipo(null);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tipo) setTipo(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tipo, onClose]);

  if (!open) return null;

  const consultores = tipo
    ? CONSULTANTS.filter((c) => c.meetings[tipo.key])
    : [];

  return (
    <div
      onClick={onClose}
      className="animate-in fade-in-0 fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,12,9,0.55)] p-5 backdrop-blur-[4px] duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Agenda una reunión"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border bg-card animate-in fade-in-0 zoom-in-95 relative w-full max-w-[540px] rounded-[22px] border p-[30px] shadow-[var(--shadow-lg)] duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="border-border bg-card text-muted-foreground hover:bg-muted absolute top-4 right-4 flex size-[34px] items-center justify-center rounded-[10px] border transition-colors"
        >
          <IconClose />
        </button>

        <div className="mb-[18px] flex items-center gap-2.5">
          <BrandMark size={34} radius={9} />
          <span className="text-muted-foreground text-[11px] font-bold tracking-[0.1em] uppercase">
            Sistema de reuniones
          </span>
        </div>

        {!tipo ? (
          <div className="animate-in fade-in-0 duration-200">
            <h2 className="text-foreground text-[22px] font-extrabold tracking-tight">
              Agenda una reunión
            </h2>
            <p className="text-muted-foreground mt-1 mb-5 text-sm leading-relaxed">
              Selecciona el tipo de reunión que necesitas.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {availableTypes.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTipo(t)}
                  className="border-border bg-muted/60 hover:border-brand/40 hover:bg-accent flex flex-col rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5"
                >
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="bg-accent flex size-9 items-center justify-center rounded-[9px] text-[17px]">
                      {t.glyph}
                    </span>
                    <span className="text-foreground text-[15.5px] font-bold">
                      {t.name}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-3 text-[12.5px] leading-snug">
                    {t.desc}
                  </p>
                  <span className="text-brand-accent bg-accent mt-auto inline-block self-start rounded-md px-2.5 py-1 text-[11.5px] font-bold">
                    {t.dur} · Google Meet
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in-0 duration-200">
            <h2 className="text-foreground flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight">
              <span className="text-xl">{tipo.glyph}</span>
              {tipo.name}
            </h2>
            <p className="text-muted-foreground mt-1 mb-5 text-sm leading-relaxed">
              Duración {tipo.dur} · Elige a tu consultor.
            </p>
            {consultores.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-[13.5px]">
                No hay consultores disponibles para este tipo de reunión.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {consultores.map((c) => (
                  <a
                    key={c.slug}
                    href={c.meetings[tipo.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="border-border bg-muted/60 hover:border-brand/40 hover:bg-accent flex flex-col items-center gap-2.5 rounded-2xl border p-[22px_16px] text-center transition-all hover:-translate-y-0.5"
                  >
                    <ConsultantAvatar consultant={c} />
                    <span className="text-foreground text-sm font-semibold">
                      {c.name}
                    </span>
                  </a>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setTipo(null)}
              className="text-muted-foreground hover:text-foreground mt-4 -ml-2 flex items-center gap-1.5 rounded-lg px-2 py-2 text-[13.5px] font-medium transition-colors"
            >
              <IconArrowLeft width={15} height={15} />
              Cambiar tipo de reunión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
