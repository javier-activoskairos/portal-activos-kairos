import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { assetTone, formatDate } from "@/lib/status";

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
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{a.name}</h3>
        <StatusBadge label={a.status} tone={assetTone(a.status)} />
      </div>
      {a.desired_result && (
        <p className="mt-2 text-sm text-muted-foreground">{a.desired_result}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {a.progress && <span>Progreso: {a.progress}</span>}
        <span>Inicio: {formatDate(a.started_at)}</span>
        {a.status === "Terminado" ? (
          <span>Fin: {formatDate(a.ended_at)}</span>
        ) : (
          <span>Plazo: {formatDate(a.due_at)}</span>
        )}
      </div>
      {a.asset_url && (
        <a
          href={a.asset_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-brand hover:underline"
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
        <h1 className="text-2xl font-semibold">Activos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proyectos en curso y entregados por Activos Kairos.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          En progreso ({inProgress.length})
        </h2>
        {inProgress.length === 0 ? (
          <p className="text-sm text-muted-foreground">
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
        <h2 className="text-sm font-semibold text-muted-foreground">
          Terminados ({done.length})
        </h2>
        {done.length === 0 ? (
          <p className="text-sm text-muted-foreground">
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
