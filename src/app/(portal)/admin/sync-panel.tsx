"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runManualSync } from "./actions";

const SOURCE_LABEL: Record<string, string> = {
  incidents: "Incidencias",
  assets: "Activos",
};

const STATUS_LABEL: Record<string, string> = {
  success: "Correcto",
  error: "Error",
};

export function SyncPanel() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  function trigger(source: "incidents" | "assets") {
    setMsg(null);
    setRunning(source);
    startTransition(async () => {
      try {
        const r = await runManualSync(source);
        setMsg(
          `Fuente: ${SOURCE_LABEL[source]} · Modo: Manual · Estado: ${
            STATUS_LABEL[r.status] ?? r.status
          } · leídos ${r.rowsRead} · escritos ${r.rowsUpserted}${
            r.error ? ` · ${r.error}` : ""
          }`,
        );
      } catch (e) {
        setMsg(
          `Fuente: ${SOURCE_LABEL[source]} · Modo: Manual · Estado: Error · ${
            e instanceof Error ? e.message : e
          }`,
        );
      } finally {
        setRunning(null);
      }
    });
  }

  return (
    <div className="border-border bg-card rounded-[20px] border p-5 shadow-[var(--shadow-sm)]">
      <h2 className="text-sm font-semibold">Sincronización manual</h2>
      <p className="text-muted-foreground mt-1 text-xs">
        Fuerza una sincronización inmediata desde Notion.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="rounded-[14px]"
          disabled={pending}
          onClick={() => trigger("incidents")}
        >
          {running === "incidents"
            ? "Sincronizando…"
            : "Sincronizar incidencias"}
        </Button>
        <Button
          variant="outline"
          className="rounded-[14px]"
          disabled={pending}
          onClick={() => trigger("assets")}
        >
          {running === "assets" ? "Sincronizando…" : "Sincronizar activos"}
        </Button>
      </div>
      {msg && (
        <p className="text-muted-foreground mt-3 font-mono text-xs">{msg}</p>
      )}
    </div>
  );
}
