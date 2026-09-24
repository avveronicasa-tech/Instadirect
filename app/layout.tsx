import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaDirect — Painel",
  description: "Automação de DM para Instagram, rodando na sua própria conta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
