import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import PwaRegister from "./pwa-register";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Toro | Build Your Best Version", template: "%s | Toro" },
  description: "Toro te acompaña a construir tu mejor versión con entrenamiento, hábitos y nutrición.",
  applicationName: "TORO",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TORO" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/toro-icon-1024.png", sizes: "1024x1024", type: "image/png" }],
    apple: [{ url: "/icons/toro-icon-1024.png", sizes: "1024x1024", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#090a08", colorScheme: "dark light", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${montserrat.variable} h-full antialiased`} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: "try { const theme = localStorage.getItem('toro-theme'); if (theme === 'light') { document.documentElement.dataset.theme = 'light'; document.documentElement.style.colorScheme = 'light'; } } catch {}" }} />
      <body className="w-full" suppressHydrationWarning><PwaRegister />{children}</body>
    </html>
  );
}
