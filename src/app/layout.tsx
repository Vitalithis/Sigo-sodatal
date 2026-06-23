import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Sodatal - Control de Flota",
  description: "Supervisión técnica y alertas de mantenimiento para camiones distribuidores Sodatal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="m-0 p-0">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased m-0 p-0 bg-slate-100 text-slate-900 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}