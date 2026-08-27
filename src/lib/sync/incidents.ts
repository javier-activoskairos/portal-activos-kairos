/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  notionClient,
  plainText,
  statusName,
  selectName,
  urlValue,
  dateStart,
  dateEnd,
  formulaValue,
} from "@/lib/notion";
import {
  runSync,
  getActiveCompanies,
  type CompanyRef,
  type SyncMode,
} from "@/lib/sync/run";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

function mapIncident(page: any, companyId: string) {
  const p = page.properties;
  return {
    notion_id: page.id,
    company_id: companyId,
    title: plainText(p["Título"]) ?? "(sin título)",
    status: statusName(p["Estado"]) ?? "Pendiente",
    label: selectName(p["Etiqueta"]),
    source: selectName(p["Proveniencia"]),
    additional_info: plainText(p["Info Adicional"]),
    response: plainText(p["Respuesta"]),
    created_by: formulaValue(p["Creado Por Texto"]),
    attachments: (p["Archivo"]?.files ?? [])
      .map((f: any) => ({
        name: f.name ?? "adjunto",
        url: f.file?.url ?? f.external?.url ?? null,
      }))
      .filter((f: any) => f.url),
    created_at: dateStart(p["Fecha de creación"]) ?? page.created_time,
    started_at: dateStart(p["Inicio"]),
    resolved_at: dateEnd(p["Fin"]) ?? dateStart(p["Fin"]),
    sla_deadline: formulaValue(p["Fecha Limite SLA"]),
    source_url: urlValue(p["URL Origen"]),
    error_url: urlValue(p["URL Error"]),
    response_url: urlValue(p["URL Respuesta"]),
    notion_url: page.url,
    last_edited_at: page.last_edited_time,
    synced_at: new Date().toISOString(),
  };
}

/**
 * Escribe el uuid de Supabase en la propiedad "Supabase ID" de Notion.
 *
 * Solo escribe cuando el valor difiere del que ya hay: escribir en Notion
 * cambia last_edited_time, que es justo lo que dispara la sync incremental,
 * así que un PATCH incondicional se realimentaría en cada pasada. Comparando
 * primero, la página se reescribe una vez y a partir de ahí queda estable.
 */
async function writeBackSupabaseIds(
  notion: ReturnType<typeof notionClient>,
  rows: Array<{ id: string; notion_id: string }>,
  currentIds: Map<string, string | null>,
) {
  let written = 0;
  for (const row of rows) {
    if ((currentIds.get(row.notion_id) ?? null) === row.id) continue;
    await notion.pages.update({
      page_id: row.notion_id,
      properties: {
        "Supabase ID": { rich_text: [{ text: { content: row.id } }] },
      },
    });
    written++;
  }
  return written;
}

async function fetchAndUpsert(admin: Admin, since: string | null) {
  const notion = notionClient();
  const dbId = process.env.NOTION_INCIDENTS_DB!;
  const companies = await getActiveCompanies(admin);

  let rowsRead = 0;
  let rowsUpserted = 0;
  let idsWritten = 0;

  // Multi-empresa: sincroniza las incidencias de cada empresa activa.
  for (const company of companies) {
    const filter: any = {
      and: [{ property: "Empresa", relation: { contains: company.notion_id } }],
    };
    if (since) {
      filter.and.push({
        timestamp: "last_edited_time",
        last_edited_time: { on_or_after: since },
      });
    }

    let cursor: string | undefined = undefined;
    do {
      const res: any = await notion.databases.query({
        database_id: dbId,
        filter,
        start_cursor: cursor,
        page_size: 100,
      });
      rowsRead += res.results.length;
      const rows = res.results.map((pg: any) => mapIncident(pg, company.id));
      if (rows.length > 0) {
        const { data: saved, error } = await admin
          .from("incidents")
          .upsert(rows, { onConflict: "notion_id" })
          .select("id, notion_id");
        if (error) throw new Error(`Upsert incidents: ${error.message}`);
        rowsUpserted += rows.length;

        const currentIds = new Map<string, string | null>(
          res.results.map((pg: any) => [
            pg.id,
            plainText(pg.properties["Supabase ID"]),
          ]),
        );
        idsWritten += await writeBackSupabaseIds(
          notion,
          saved ?? [],
          currentIds,
        );
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  }

  console.log(
    `[sync:incidents] Supabase IDs escritos en Notion: ${idsWritten}`,
  );

  await reconcileDeleted(admin, notion, dbId, companies);

  return { rowsRead, rowsUpserted };
}

/**
 * Borra de Supabase las incidencias que ya no existen en Notion.
 *
 * La sync incremental solo hace upsert de lo editado desde `since`, y una página
 * borrada, archivada o desvinculada de su empresa deja de aparecer en la query
 * de Notion: nunca vuelve a tocarse, así que se quedaba viva en la réplica con
 * su último estado. Por eso el portal llegó a listar 140 incidencias abiertas de
 * Activos Kairos cuando en Notion solo había 6.
 *
 * Un borrado no se puede deducir de un incremental, así que aquí se recorre la
 * lista COMPLETA de ids por empresa (sin filtro de fecha y sin traer
 * propiedades, es barato) y se elimina lo que sobra.
 *
 * Regla de seguridad: si la lectura de Notion falla a media paginación, esa
 * empresa se salta entera. Borrar con una lista incompleta vaciaría el portal
 * del cliente.
 */
async function reconcileDeleted(
  admin: Admin,
  notion: ReturnType<typeof notionClient>,
  dbId: string,
  companies: CompanyRef[],
) {
  let deleted = 0;

  for (const company of companies) {
    const vivos = new Set<string>();
    try {
      let cursor: string | undefined = undefined;
      do {
        const res: any = await notion.databases.query({
          database_id: dbId,
          filter: {
            property: "Empresa",
            relation: { contains: company.notion_id },
          },
          // Solo se necesitan los ids de página; el título es la propiedad más
          // barata que la API acepta como filtro de respuesta.
          filter_properties: ["title"],
          start_cursor: cursor,
          page_size: 100,
        });
        for (const pg of res.results) vivos.add(pg.id);
        cursor = res.has_more ? res.next_cursor : undefined;
      } while (cursor);
    } catch (e) {
      console.error(
        `[sync:incidents] reconciliación saltada para ${company.notion_id}:`,
        e instanceof Error ? e.message : e,
      );
      continue;
    }

    const { data: replicadas, error } = await admin
      .from("incidents")
      .select("id, notion_id")
      .eq("company_id", company.id);
    if (error) throw new Error(`Reconciliar incidents: ${error.message}`);

    const huerfanas = (replicadas ?? [])
      .filter((r) => !vivos.has(r.notion_id))
      .map((r) => r.id);
    if (huerfanas.length === 0) continue;

    const { error: delErr } = await admin
      .from("incidents")
      .delete()
      .in("id", huerfanas);
    if (delErr) throw new Error(`Borrar incidents: ${delErr.message}`);
    deleted += huerfanas.length;
  }

  if (deleted > 0) {
    console.log(`[sync:incidents] huérfanas borradas: ${deleted}`);
  }
}

export function syncIncidents(mode: SyncMode = "cron") {
  return runSync("incidents", mode, fetchAndUpsert);
}
