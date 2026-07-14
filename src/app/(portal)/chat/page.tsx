import { IconChat } from "@/components/icons";

export const metadata = { title: "Chat · Portal Activos Kairos" };

export default function ChatPage() {
  return (
    <div className="portal-reveal flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="bg-accent text-brand-accent mb-6 flex size-[72px] items-center justify-center rounded-[20px]">
        <IconChat width={34} height={34} />
      </span>
      <span className="border-border text-muted-foreground mb-4 rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.1em] uppercase">
        Pronto
      </span>
      <h1 className="text-foreground text-[28px] leading-tight font-extrabold tracking-tight">
        Chat
      </h1>
      <p className="text-muted-foreground mt-2 max-w-[48ch] text-[15px] leading-relaxed">
        Muy pronto podrás escribirnos desde aquí, sin salir de tu portal.
        Mientras tanto seguimos por los canales de siempre.
      </p>
    </div>
  );
}
