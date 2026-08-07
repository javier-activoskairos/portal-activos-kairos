"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconSend } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  body: string;
  author_name: string;
  /** 'client' = escrito desde el portal · 'kairos' = escrito desde Discord. */
  author_side: "client" | "kairos";
  created_at: string;
}

const MAX_BODY = 4000;
/** Red de seguridad por si Realtime no llega (proxy, pestaña dormida…). */
const POLL_MS = 20000;

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function dayOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Hoy";
  if (same(d, yesterday)) return "Ayer";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ChatView({
  companyId,
  initialMessages,
  readOnly,
}: {
  companyId: string;
  initialMessages: ChatMessage[];
  readOnly: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => createClient(), []);

  /** Añade sin duplicar: el mismo mensaje puede llegar por Realtime y por poll. */
  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      let changed = false;
      for (const m of incoming) {
        if (!byId.has(m.id)) {
          byId.set(m.id, m);
          changed = true;
        }
      }
      if (!changed) return prev;
      return [...byId.values()].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
    });
  }, []);

  // Respuestas del equipo (llegan desde Discord) en tiempo real.
  useEffect(() => {
    if (readOnly) return; // en "Ver como cliente" la sesión del navegador es la del admin
    const channel = supabase
      .channel(`chat:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => merge([payload.new as ChatMessage]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, companyId, readOnly, merge]);

  useEffect(() => {
    if (readOnly) return;
    const pull = async () => {
      if (document.hidden) return;
      const { data } = await supabase
        .from("chat_messages")
        .select("id, body, author_name, author_side, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) merge((data as ChatMessage[]).slice().reverse());
    };
    const id = setInterval(pull, POLL_MS);
    document.addEventListener("visibilitychange", pull);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [supabase, companyId, readOnly, merge]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending || readOnly) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("request failed");
      const { message } = (await res.json()) as { message: ChatMessage };
      merge([message]);
      setDraft("");
    } catch {
      setError("No hemos podido enviar el mensaje. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envía; Shift+Enter hace salto de línea.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[520px] flex-col">
      <div className="mb-4 shrink-0">
        <p className="text-brand-accent text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          Chat
        </p>
        <h1 className="text-foreground mt-2.5 text-[28px] leading-tight font-extrabold tracking-tight">
          Habla con tu equipo Kairos.
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-[15px] leading-relaxed">
          Escríbenos aquí y te responde una persona del equipo. Sin salir de tu
          portal.
        </p>
      </div>

      <div className="border-border bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border shadow-[var(--shadow-sm)]">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-foreground text-[15px] font-semibold">
                Aún no hay mensajes
              </p>
              <p className="text-muted-foreground mt-1.5 max-w-[42ch] text-sm leading-relaxed">
                Cuéntanos lo que necesites: una duda, un cambio o algo que se te
                haya ocurrido. Te leemos.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay =
                  !prev || dayOf(prev.created_at) !== dayOf(m.created_at);
                // Mensajes seguidos del mismo autor se agrupan sin repetir cabecera.
                const grouped =
                  !newDay &&
                  prev?.author_name === m.author_name &&
                  prev?.author_side === m.author_side;
                const mine = m.author_side === "client";
                return (
                  <div key={m.id}>
                    {newDay && (
                      <div className="my-4 flex items-center gap-3">
                        <span className="bg-border h-px flex-1" />
                        <span className="text-muted-foreground text-[11px] font-bold tracking-[0.1em] uppercase">
                          {dayOf(m.created_at)}
                        </span>
                        <span className="bg-border h-px flex-1" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex items-end gap-2.5",
                        grouped ? "mt-0.5" : "mt-3",
                        mine && "flex-row-reverse",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          grouped && "invisible",
                          mine
                            ? "bg-muted text-muted-foreground"
                            : "bg-accent text-brand-accent",
                        )}
                        aria-hidden={grouped}
                      >
                        {initialsOf(m.author_name)}
                      </span>
                      <div
                        className={cn(
                          "flex max-w-[min(78%,60ch)] min-w-0 flex-col",
                          mine && "items-end",
                        )}
                      >
                        {!grouped && (
                          <span className="text-muted-foreground mb-1 px-1 text-[11.5px] font-semibold">
                            {m.author_name}
                          </span>
                        )}
                        <div
                          className={cn(
                            "rounded-[16px] px-3.5 py-2.5 text-[14.5px] leading-relaxed break-words whitespace-pre-wrap",
                            mine
                              ? "bg-brand text-brand-foreground rounded-br-[6px]"
                              : "bg-muted text-foreground rounded-bl-[6px]",
                          )}
                        >
                          {m.body}
                        </div>
                        <span className="text-muted-foreground mt-1 px-1 text-[11px]">
                          {timeOf(m.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-border shrink-0 border-t px-4 py-3.5 sm:px-6">
          {readOnly ? (
            <p className="text-muted-foreground py-2 text-center text-[13px]">
              Estás viendo el portal como cliente: el chat es de solo lectura.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-2.5">
                <textarea
                  rows={1}
                  value={draft}
                  maxLength={MAX_BODY}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Escribe tu mensaje…"
                  aria-label="Mensaje"
                  className="border-border bg-muted/60 text-foreground focus:border-brand/50 max-h-40 min-h-[46px] w-full resize-y rounded-[14px] border px-3.5 py-3 text-[14.5px] transition-colors outline-none"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  aria-label="Enviar mensaje"
                  className={cn(
                    "flex size-[46px] shrink-0 items-center justify-center rounded-[14px] transition-opacity",
                    draft.trim() && !sending
                      ? "bg-brand text-brand-foreground shadow-[var(--shadow-sm)] hover:opacity-90"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <IconSend />
                </button>
              </div>
              {error && (
                <p className="text-danger-foreground mt-2 text-[13px]">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
