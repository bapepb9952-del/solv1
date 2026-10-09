import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dojo OS · Constância no tatame", template: "%s · Dojo OS" },
  description: "Frequência, engajamento e evolução da sua comunidade no jiu-jitsu.",
  applicationName: "Dojo OS", manifest: "/manifest.webmanifest", icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17231f" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
