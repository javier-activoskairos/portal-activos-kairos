import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal · Activos Kairos",
  description: "Portal de cliente e incidencias de Activos Kairos.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
