"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { trackAnalyticsEvent } from "../analytics";
import { toolCatalog, toolCategories } from "../tool-catalog";

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function ToolsDirectory() {
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Tümü");
  const tools = useMemo(() => { const needle = normalize(query.trim()); return toolCatalog.filter((tool) => (category === "Tümü" || tool.category === category) && (!needle || normalize(`${tool.title} ${tool.copy} ${tool.keywords}`).includes(needle))); }, [query, category]);
  return <><div className="directory-controls"><label><span>Aradığın hesabı yaz</span><input autoComplete="off" onChange={(event) => setQuery(event.target.value)} placeholder="Örn. maaş, borç, enflasyon…" type="search" value={query} /></label><div aria-label="Araç kategorileri" className="directory-filters" role="group">{toolCategories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}</div></div><div className="directory-count"><strong>{tools.length} araç</strong><span>{query || category !== "Tümü" ? "seçimine uyuyor" : "ücretsiz ve kayıt gerektirmiyor"}</span></div>{tools.length ? <div className="directory-grid">{tools.map((tool) => <Link href={tool.href} key={tool.href} onClick={() => trackAnalyticsEvent("seo_tool_opened", tool.tag, "tools_directory")}><div><i aria-hidden="true">{tool.icon}</i><span>{tool.category}</span></div><h2>{tool.title}</h2><p>{tool.copy}</p><b>Hesaplamaya başla <span>→</span></b></Link>)}</div> : <div className="directory-empty"><strong>Bu aramaya uygun araç bulunamadı.</strong><p>Daha kısa bir kelime deneyebilir veya “Tümü” kategorisine dönebilirsin.</p><button onClick={() => { setQuery(""); setCategory("Tümü"); }} type="button">Filtreleri temizle</button></div>}</>;
}
