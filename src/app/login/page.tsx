import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata = { title: "Acceder · Portal Activos Kairos" };

export default function LoginPage() {
  return (
    <main className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8">
      {/* Fondo vectorial: sol/brújula (claro) o luna+estrella (oscuro) + olas */}
      <svg
        aria-hidden
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      >
        <defs>
          <radialGradient id="kpSun" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#F96302" stopOpacity="0.40" />
            <stop offset="0.55" stopColor="#F8A848" stopOpacity="0.12" />
            <stop offset="1" stopColor="#F8A848" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="kpMoon" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#8FB2E8" stopOpacity="0.28" />
            <stop offset="0.55" stopColor="#6FA8E8" stopOpacity="0.09" />
            <stop offset="1" stopColor="#6FA8E8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="kpSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F96302" stopOpacity="0.20" />
            <stop offset="1" stopColor="#F96302" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Claro — sol / brújula arriba a la derecha */}
        <g className="kp-login-sun">
          <circle cx="980" cy="215" r="290" fill="url(#kpSun)" />
          <circle cx="980" cy="215" r="64" fill="#F96302" fillOpacity="0.16" />
          <circle
            cx="980"
            cy="215"
            r="64"
            fill="none"
            stroke="#F96302"
            strokeOpacity="0.32"
            strokeWidth="1.5"
          />
          <g
            transform="translate(980 215)"
            stroke="#F96302"
            strokeOpacity="0.34"
            strokeWidth="1.5"
            fill="none"
          >
            <path d="M0,-112 L0,112 M-112,0 L112,0" />
            <path
              d="M0,-112 L11,-11 L112,0 L11,11 L0,112 L-11,11 L-112,0 L-11,-11 Z"
              fill="#F8A848"
              fillOpacity="0.10"
            />
          </g>
        </g>

        {/* Oscuro — luna + estrella arriba a la izquierda */}
        <g className="kp-login-moon">
          <circle cx="220" cy="215" r="290" fill="url(#kpMoon)" />
          <circle cx="220" cy="215" r="64" fill="#6FA8E8" fillOpacity="0.14" />
          <circle cx="246" cy="199" r="60" fill="var(--background)" />
          <circle
            cx="220"
            cy="215"
            r="64"
            fill="none"
            stroke="#8FB2E8"
            strokeOpacity="0.32"
            strokeWidth="1.5"
          />
          <g
            transform="translate(700 330) scale(0.26)"
            stroke="#8FB2E8"
            strokeOpacity="0.34"
            strokeWidth="5"
            fill="none"
          >
            <path d="M0,-150 L0,150 M-150,0 L150,0" />
            <path
              d="M0,-150 L14,-14 L150,0 L14,14 L0,150 L-14,14 L-150,0 L-14,-14 Z"
              fill="#8FB2E8"
              fillOpacity="0.14"
            />
          </g>
        </g>

        {/* Olas / mar en capas (comunes) */}
        <path
          fill="#F8A848"
          fillOpacity="0.10"
          d="M0,470 C220,410 380,540 620,480 C860,420 1010,540 1200,460 L1200,800 L0,800 Z"
        />
        <path
          fill="url(#kpSea)"
          d="M0,560 C240,500 400,620 640,560 C880,500 1030,620 1200,540 L1200,800 L0,800 Z"
        />
        <path
          fill="#F96302"
          fillOpacity="0.12"
          d="M0,650 C240,600 420,700 660,650 C900,600 1040,690 1200,650 L1200,800 L0,800 Z"
        />
      </svg>

      <div className="absolute top-5 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
