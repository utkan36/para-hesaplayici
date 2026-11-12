import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://para-hesaplayici.utkanyilmaz.chatgpt.site"),
  verification: {
    google: "X7krBAgv3j480_Rvh_lsNv3iWSeZau658X-UnfGjNuA",
  },
  title: "Para Hesaplayıcı",
  description: "Borç planlarını karşılaştırın, maaşınızın alım gücünü ölçün ve büyük harcamaların fırsat maliyetini hesaplayın.",
  openGraph: {
    title: "Para Hesaplayıcı | Finansal Karar Araçları",
    description: "Borç, maaş ve büyük harcama kararlarını karşılaştırın.",
    type: "website",
    locale: "tr_TR",
    siteName: "Para Hesaplayıcı",
  },
  twitter: {
    card: "summary",
    title: "Para Hesaplayıcı | Finansal Karar Araçları",
    description: "Borç, maaş ve büyük harcama kararlarını karşılaştırın.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
