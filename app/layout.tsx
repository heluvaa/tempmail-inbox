import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tempmail Inbox — Email Sementara Gratis",
  description:
    "Buat alamat email sementara dalam sekali klik. Terima pesan langsung di browser, tanpa daftar, tanpa password email pribadi.",
  applicationName: "Tempmail Inbox",
  keywords: ["tempmail", "email sementara", "disposable email", "inbox sementara"],
  openGraph: {
    title: "Tempmail Inbox — Email Sementara Gratis",
    description:
      "Alamat email sekali pakai, inbox langsung di browser. Cocok untuk verifikasi tanpa spam.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6d28d9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap"
        />
      </head>
      <body>
        <div className="blob" style={{ width: 260, height: 260, background: "#c4b5fd", top: -70, right: -60 }} />
        <div className="blob" style={{ width: 220, height: 220, background: "#fed7aa", top: 240, left: -90 }} />
        <div className="blob" style={{ width: 200, height: 200, background: "#fde68a", bottom: -60, right: -40 }} />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}