import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/yonetim/", "/api/"] }],
    sitemap: "https://para-hesaplayici.utkanyilmaz.chatgpt.site/sitemap.xml",
  };
}
