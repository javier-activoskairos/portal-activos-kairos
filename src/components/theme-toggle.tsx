"use client";

import { useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "@/components/icons";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "kp-theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

/**
 * Interruptor claro/oscuro. Alterna la clase `dark` en <html> y persiste en
 * localStorage. Lee el estado real del DOM (aplicado por el script inline del
 * layout raíz) vía useSyncExternalStore → sin parpadeo ni fallo de hidratación.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage no disponible → sin persistencia.
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Cambiar tema"
      title="Cambiar tema"
      onClick={toggle}
      className={cn(
        "border-border bg-muted relative h-[30px] w-[62px] shrink-0 cursor-pointer rounded-full border p-0 transition-colors",
        className,
      )}
    >
      <span
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute inset-y-0 left-[9px] flex items-center transition-opacity"
        style={{ opacity: dark ? 1 : 0 }}
      >
        <IconSun width={13} height={13} />
      </span>
      <span
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute inset-y-0 right-[9px] flex items-center transition-opacity"
        style={{ opacity: dark ? 0 : 1 }}
      >
        <IconMoon width={13} height={13} />
      </span>
      <span
        aria-hidden
        className="bg-card text-brand-accent absolute top-[3px] left-[3px] flex size-6 items-center justify-center rounded-full shadow-[var(--shadow-sm)] transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{ transform: dark ? "translateX(32px)" : "translateX(0)" }}
      >
        {dark ? (
          <IconMoon width={14} height={14} />
        ) : (
          <IconSun width={14} height={14} />
        )}
      </span>
    </button>
  );
}
