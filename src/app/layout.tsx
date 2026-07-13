import type { Metadata } from "next";
import "./globals.css";
import { PortalSplash } from "@/components/portal-splash";

export const metadata: Metadata = {
  title: "Portal · Activos Kairos",
  description: "Portal de cliente e incidencias de Activos Kairos.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes de pintar → evita parpadeo (default: claro). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('kp-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <PortalSplash />
        {children}
      </body>
    </html>
  );
}
