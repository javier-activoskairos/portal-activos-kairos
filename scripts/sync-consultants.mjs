// Sync de consultores: [AKE] - Equipo (Notion) → portal.
// Copia estable de los consultores con enlaces de agenda (Notion Calendar) y
// foto, para el botón "Agendar Reunión". Descarga y redimensiona las imágenes
// (las de Notion caducan) a public/consultants/*.webp y escribe
// src/data/consultants.json. Pensado para correr a diario en GitHub Actions.
import fs from "fs";
import sharp from "sharp";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
if (!NOTION_TOKEN) throw new Error("NOTION_TOKEN no definido");
// [AKE] - Equipo (database_id)
const EQUIPO_DB = "20e0114d-3502-80b6-93dd-c271a24fae60";

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

async function query() {
  const r = await fetch(
    `https://api.notion.com/v1/databases/${EQUIPO_DB}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          or: [
            { property: "URL Astrapi", url: { is_not_empty: true } },
            { property: "URL Areté", url: { is_not_empty: true } },
          ],
        },
        page_size: 50,
      }),
    },
  );
  if (!r.ok) throw new Error(`Notion ${r.status}: ${await r.text()}`);
  return r.json();
}

const data = await query();
fs.mkdirSync("public/consultants", { recursive: true });

const out = [];
for (const p of data.results) {
  const pr = p.properties;
  const name = (pr["Persona"].title[0]?.plain_text || "").trim();
  if (!name) continue;
  const slug = slugify(name);
  const color = (pr["Color HEX"].rich_text[0]?.plain_text || "#F96302").trim();

  const meetings = {};
  if (pr["URL Astrapi"].url) meetings.astrapi = pr["URL Astrapi"].url;
  if (pr["URL Areté"].url) meetings.arete = pr["URL Areté"].url;
  if (pr["URL Prótos"].url) meetings.protos = pr["URL Prótos"].url;

  const file = (pr["Imagen"].files || [])[0];
  const imgUrl = file && (file.file?.url || file.external?.url);
  if (imgUrl) {
    try {
      const buf = Buffer.from(await (await fetch(imgUrl)).arrayBuffer());
      await sharp(buf)
        .resize(256, 256, { fit: "cover", position: "attention" })
        .webp({ quality: 82 })
        .toFile(`public/consultants/${slug}.webp`);
    } catch (e) {
      console.error(`imagen ${slug}: ${e.message}`);
    }
  }

  out.push({ slug, name, color, image: `/consultants/${slug}.webp`, meetings });
}

// Javier (admin) primero.
out.sort((a, b) => (a.slug === "javier" ? -1 : 0) - (b.slug === "javier" ? -1 : 0));
fs.writeFileSync(
  "src/data/consultants.json",
  JSON.stringify(out, null, 2) + "\n",
);
console.log(`Sincronizados ${out.length} consultores: ${out.map((c) => c.slug).join(", ")}`);
