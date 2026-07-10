import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { assetBadge, formatDateShort, formatProgress } from "@/lib/status";

export const metadata = { title: "Activos · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

interface AssetRow {
  id: string;
  name: string;
  status: string;
  desired_result: string | null;
  progress: string | null;
  started_at: string | null;
  ended_at: string | null;
  due_at: string | null;
  asset_url: string | null;
}

function AssetCard({ a }: { a: AssetRow }) {
  const pct = formatProgress(a.progress);
  return (
    <div className="border-border bg-card rounded-[20px] border p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{a.name}</h3>
        <StatusBadge label={a.status} spec={assetBadge(a.status)} />
      </div>
      {a.desired_result && (
        <p className="text-muted-foreground mt-2 text-sm">{a.desired_result}</p>
      )}

      {a.status === "En Progreso" && (
        <div className="mt-4">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>Progreso</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-brand h-full rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        {a.started_at && <span>Inicio: {formatDateShort(a.started_at)}</span>}
        {a.status === "Terminado" && a.ended_at ? (
          <span>Entregado: {formatDateShort(a.ended_at)}</span>
        ) : (
          a.due_at && <span>Entrega estimada: {formatDateShort(a.due_at)}</span>
        )}
      </div>
      {a.asset_url && (
        <a
          href={a.asset_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-accent mt-4 inline-flex text-sm font-medium hover:underline"
        >
          Ver entregable →
        </a>
      )}
    </div>
  );
}

export default async function ActivosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select(
      "id, name, status, desired_result, progress, started_at, ended_at, due_at, asset_url",
    )
    .order("started_at", { ascending: false, nullsFirst: false });

  const assets = (data ?? []) as AssetRow[];
  const inProgress = assets.filter((a) => a.status === "En Progreso");
  const done = assets.filter((a) => a.status === "Terminado");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-brand-accent text-xs font-semibold tracking-wide uppercase">
          Portafolio
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Activos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Proyectos en curso y entregados por Activos Kairos.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-sm font-semibold">
          En progreso ({inProgress.length})
        </h2>
        {inProgress.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay activos en progreso.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {inProgress.map((a) => (
              <AssetCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-sm font-semibold">
          Terminados ({done.length})
        </h2>
        {done.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aún no hay activos terminados.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {done.map((a) => (
              <AssetCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
