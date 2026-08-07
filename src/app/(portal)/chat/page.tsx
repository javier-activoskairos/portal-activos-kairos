import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
import { ChatView, type ChatMessage } from "./chat-view";

export const metadata = { title: "Chat · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

/** Mensajes que se cargan de entrada; el resto queda fuera del hilo visible. */
const HISTORY = 200;

export default async function ChatPage() {
  const ctx = await getPortalDb();
  if (!ctx) redirect("/acceso-denegado");
  const { db, companyId, session } = ctx;

  // Los últimos N, y se le dan a la vista en orden cronológico.
  const { data } = await db
    .from("chat_messages")
    .select("id, body, author_name, author_side, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(HISTORY);

  const messages = ((data ?? []) as ChatMessage[]).slice().reverse();

  return (
    <div className="portal-reveal">
      <ChatView
        companyId={companyId}
        initialMessages={messages}
        readOnly={Boolean(session.viewingAs)}
      />
    </div>
  );
}
