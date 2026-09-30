import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ORIGEN — Estudio de arquitectura · Símbolo maestro 3D",
  description:
    "ORIGEN, estudio de arquitectura inspirado en la Sierra de Albarracín (Teruel). Símbolo maestro 3D monolítico: Tierra, Tiempo y Mano ensamblados en un único emblema de piedra caliza.",
  keywords: [
    "ORIGEN",
    "arquitectura",
    "Sierra de Albarracín",
    "Teruel",
    "3D",
    "glTF",
    "Three.js",
    "piedra caliza",
    "monolito",
  ],
  authors: [{ name: "ORIGEN" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  openGraph: {
    title: "ORIGEN — Símbolo maestro 3D",
    description: "Emblema monolítico de piedra caliza: Tierra · Tiempo · Mano.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ORIGEN — Símbolo maestro 3D",
    description: "Emblema monolítico de piedra caliza: Tierra · Tiempo · Mano.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-stone-950 text-stone-100`}
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
