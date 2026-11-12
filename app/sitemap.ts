import type { MetadataRoute } from "next";
import { guides } from "./guide-catalog";

const base = "https://para-hesaplayici.utkanyilmaz.chatgpt.site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1 },
    { path: "/hesaplama-araclari", priority: 0.95 },
    { path: "/karar-defteri", priority: 0.7 },
    { path: "/icerik-studyosu", priority: 0.8 },
    { path: "/creator-pro", priority: 0.8 },
    { path: "/kampanya-merkezi", priority: 0.8 },
    { path: "/kurumsal-widget", priority: 0.8 },
    { path: "/finans-rehberi", priority: 0.85 },
    ...guides.map((guide) => ({ path: `/finans-rehberi/${guide.slug}`, priority: 0.8, updatedAt: guide.updatedAt })),
    { path: "/gecmis-para-degeri", priority: 0.9 },
    { path: "/harcamanin-firsat-maliyeti", priority: 0.9 },
    { path: "/sigara-maliyeti-hesaplama", priority: 0.9 },
    { path: "/borc-hesaplama", priority: 0.9 },
    { path: "/borc-karar-merkezi", priority: 0.92 },
    { path: "/borc-gelir-orani-hesaplama", priority: 0.9 },
    { path: "/borc-yapilandirma-hesaplama", priority: 0.9 },
    { path: "/kredi-erken-kapama-hesaplama", priority: 0.9 },
    { path: "/maas-alim-gucu-hesaplama", priority: 0.9 },
    { path: "/birikim-hedefi-hesaplama", priority: 0.9 },
    { path: "/mevduat-faiz-hesaplama", priority: 0.9 },
    { path: "/kisisel-enflasyon-hesaplama", priority: 0.9 },
  ];
  return routes.map(({ path, priority, ...entry }) => ({
    url: `${base}${path}`,
    lastModified: "updatedAt" in entry ? entry.updatedAt : undefined,
    changeFrequency: "weekly",
    priority,
  }));
}
