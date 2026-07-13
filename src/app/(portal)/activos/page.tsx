import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { IconArrow } from "@/components/icons";
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

function InProgressCard({ a }: { a: AssetRow }) {
  const pct = formatProgress(a.progress);
  return (
    <div className="border-border bg-card flex flex-col rounded-[20px] border p-[22px] shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-foreground text-base font-semibold tracking-tight">
          {a.name}
        </h3>
        <StatusBadge label={a.status} spec={assetBadge(a.status)} />
      </div>
      {a.desired_result && (
        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
          {a.desired_result}
        </p>
      )}
      <div className="mt-auto">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">
            {a.due_at
              ? `Entrega estimada · ${formatDateShort(a.due_at)}`
              : "Entrega por definir"}
          </span>
          <span className="text-brand-accent font-mono text-xs font-semibold">
            {pct}%
          </span>
        </div>
        <div className="bg-muted h-[7px] overflow-hidden rounded-full">
          <div
            className="bg-brand h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
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
    <div className="portal-reveal space-y-10">
      <div>
        <p className="text-brand-accent text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          Tus activos
        </p>
        <h1 className="text-foreground mt-2.5 text-[28px] leading-tight font-extrabold tracking-tight">
          Lo que estamos construyendo para ti.
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-[15px] leading-relaxed">
          Cada activo es un sistema que se queda contigo. Aquí ves su avance y
          su entrega estimada.
        </p>
      </div>

      {/* En proceso */}
      <section>
        <div className="mb-3.5 flex items-center gap-2.5">
          <h2 className="text-foreground text-[17px] font-bold tracking-tight">
            En proceso
          </h2>
          <span className="text-brand-accent bg-accent rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold">
            {inProgress.length}
          </span>
        </div>
        {inProgress.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-[20px] border px-5 py-8 text-center text-sm shadow-[var(--shadow-sm)]">
            No hay activos en progreso ahora mismo.
          </p>
        ) : (
          <div className="grid gap-3.5 min-[900px]:grid-cols-3 sm:grid-cols-2">
            {inProgress.map((a) => (
              <InProgressCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      {/* Terminados */}
      <section>
        <div className="mb-3.5 flex items-center gap-2.5">
          <h2 className="text-foreground text-[17px] font-bold tracking-tight">
            Terminados
          </h2>
          <span className="text-success-foreground bg-success rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold">
            {done.length}
          </span>
        </div>
        {done.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-[20px] border px-5 py-8 text-center text-sm shadow-[var(--shadow-sm)]">
            Aún no hay activos terminados.
          </p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-[18px] border shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Estado
                  </th>
                  <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Activo
                  </th>
                  <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Entregado
                  </th>
                  <th className="text-muted-foreground px-[18px] py-3.5 text-right text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Entregable
                  </th>
                </tr>
              </thead>
              <tbody>
                {done.map((a) => (
                  <tr key={a.id} className="border-border/60 border-t">
                    <td className="px-[18px] py-4 align-middle">
                      <StatusBadge
                        label={a.status}
                        spec={assetBadge(a.status)}
                      />
                    </td>
                    <td className="text-foreground px-[18px] py-4 align-middle text-sm font-semibold">
                      {a.name}
                    </td>
                    <td className="text-muted-foreground px-[18px] py-4 align-middle text-sm whitespace-nowrap">
                      {a.ended_at ? formatDateShort(a.ended_at) : "—"}
                    </td>
                    <td className="px-[18px] py-4 text-right align-middle">
                      {a.asset_url ? (
                        <a
                          href={a.asset_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-accent inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                        >
                          Ver entregable
                          <IconArrow width={15} height={15} />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
