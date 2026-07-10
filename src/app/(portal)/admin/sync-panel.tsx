"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runManualSync } from "./actions";

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
          `${source}: ${r.status} · leídos ${r.rowsRead} · escritos ${r.rowsUpserted}${
            r.error ? ` · ${r.error}` : ""
          }`,
        );
      } catch (e) {
        setMsg(`${source}: error · ${e instanceof Error ? e.message : e}`);
      } finally {
        setRunning(null);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Sincronización manual</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Fuerza una sincronización inmediata desde Notion.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => trigger("incidents")}
        >
          {running === "incidents" ? "Sincronizando…" : "Sincronizar incidencias"}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => trigger("assets")}
        >
          {running === "assets" ? "Sincronizando…" : "Sincronizar activos"}
        </Button>
      </div>
      {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
