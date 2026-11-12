"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./stats.css";
import PilotProposal from "./pilot-proposal";
import PilotUsage from "./pilot-usage";
import DecisionHealth from "./decision-health";

type WidgetLeadStage = "new" | "contacted" | "proposal" | "won" | "lost";
type WidgetLead = { id: number; email: string; company: string; website: string | null; role: string; tool: string; plan: string; message: string | null; stage: WidgetLeadStage; sales_notes: string | null; follow_up_at: number | null; last_contacted_at: number | null; created_at: number; updated_at: number };

type StatsPayload = {
  totals: Record<string, number>;
  organicSearch: Array<{ category: string; visits: number; completed: number }>;
  featureRetention: Record<string, { enrolled: number; returned: number }>;
  featureUsage: Record<string, { firstUses: number; returns: number }>;
  decisionCounts: Record<string, number>;
  daily: Array<{ day: string; visits: number; starts: number; calculations: number; failures: number; shares: number; arrivals: number; conversions: number }>;
  sources: Array<{ source: string; total: number }>;
  visitorSegments: Record<string, number>;
  tools: Array<{ category: string; starts: number; completions: number; failures: number }>;
  seoPages: Array<{ category: string; views: number; opens: number }>;
  feedback: Record<string, number>;
  comments: Array<{ rating: string; tool: string; message: string; occurred_at: number }>;
  creatorLeads: Array<{ email: string; role: string; plan: string; created_at: number; updated_at: number }>;
  campaigns: Array<{ category: string; opens: number; copies: number; studioOpens: number; completions: number; contentCreated: number; shares: number }>;
  widgetLeads: WidgetLead[];
};

const stageLabels: Record<WidgetLeadStage, string> = { new: "Yeni", contacted: "Görüşüldü", proposal: "Teklif verildi", won: "Kazanıldı", lost: "Kaybedildi" };
const planLabels: Record<string, string> = { branded: "30 günlük pilot", white_label: "Profesyonel", corporate: "Kurumsal · özel fiyat" };
const toolLabels: Record<string, string> = { refinance: "Borç yapılandırma", debt: "Borç hesaplama", deposit: "Mevduat getirisi", salary: "Maaş alım gücü", savings: "Birikim hedefi" };

const labels: Record<string, string> = {
  page_view: "Oturum ziyareti", calculation_started: "Başlatılan hesaplama", calculation_completed: "Tamamlanan ana hesap",
  opportunity_completed: "Keşke Hesabı", calculation_failed: "Başarısız hesaplama", share_started: "Paylaşım girişimi",
  shared_link_opened: "Paylaşım ziyareti", shared_link_converted: "Paylaşımdan dönüşüm",
  seo_page_view: "SEO sayfası ziyareti", seo_tool_opened: "SEO aracına geçiş",
  content_exported: "İçerik çıktısı", pro_interest: "Creator Pro talebi", pro_demo_used: "Creator Pro demo kullanımı", pricing_cta_clicked: "Fiyat sayfası aksiyonu",
  campaign_opened: "Kampanyadan hesaba geçiş", campaign_copy: "Kampanya metni / bağlantısı", campaign_studio_opened: "Kampanyadan stüdyoya geçiş",
  campaign_completed: "Kampanyadan tamamlanan hesap", campaign_content_created: "Kampanyadan üretilen içerik", campaign_shared: "Kampanyadan paylaşım",
  widget_demo_used: "Widget demo seçimi", widget_embed_copied: "Widget kodu kopyalama", widget_quote_started: "Widget teklif başlangıcı", widget_quote_submitted: "Widget teklif talebi",
};

const cleanTag = (value: string) => value.trim().toLocaleLowerCase("tr-TR").replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export default function StatisticsPage() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [campaignSource, setCampaignSource] = useState("instagram");
  const [campaignName, setCampaignName] = useState("keske-hesabi");
  const [copied, setCopied] = useState(false);
  const [leadFilter, setLeadFilter] = useState<"all" | WidgetLeadStage>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leadDraft, setLeadDraft] = useState<{ stage: WidgetLeadStage; salesNotes: string; followUpDate: string } | null>(null);
  const [leadSaveStatus, setLeadSaveStatus] = useState("");

  useEffect(() => { void fetch("/api/admin/stats", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(String(response.status)); setData(await response.json() as StatsPayload); }).catch(() => setAccessDenied(true)); }, []);

  if (accessDenied) return <main className="stats-shell"><section className="stats-panel"><span>Yönetici alanı</span><h1>Erişim bulunamadı</h1><p className="stats-empty">Bu büyüme paneli yalnızca site sahibine açıktır.</p><Link href="/">Hesaplayıcıya dön</Link></section></main>;
  if (!data) return <main className="stats-shell"><section className="stats-panel"><span>Yönetici alanı</span><h1>Göstergeler hazırlanıyor…</h1></section></main>;

  const calculations = (data.totals.calculation_completed ?? 0) + (data.totals.opportunity_completed ?? 0);
  const visits = data.totals.page_view ?? 0;
  const starts = data.totals.calculation_started ?? 0;
  const shares = data.totals.share_started ?? 0;
  const arrivals = data.totals.shared_link_opened ?? 0;
  const conversions = data.totals.shared_link_converted ?? 0;
  const conversionRate = arrivals > 0 ? conversions / arrivals * 100 : 0;
  const segment = data.visitorSegments;
  const newVisitors = (segment.new_mobile ?? 0) + (segment.new_desktop ?? 0);
  const returningVisitors = (segment.returning_mobile ?? 0) + (segment.returning_desktop ?? 0);
  const mobileVisitors = (segment.new_mobile ?? 0) + (segment.returning_mobile ?? 0);
  const desktopVisitors = (segment.new_desktop ?? 0) + (segment.returning_desktop ?? 0);
  const pricingViews = data.seoPages.find((page) => page.category === "creator_pro")?.views ?? 0;
  const proDemos = data.totals.pro_demo_used ?? 0;
  const pricingActions = data.totals.pricing_cta_clicked ?? 0;
  const leadCount = data.creatorLeads.length;
  const leadRate = pricingViews > 0 ? leadCount / pricingViews * 100 : 0;
  const countBy = (field: "role" | "plan") => Object.entries(data.creatorLeads.reduce<Record<string, number>>((result, lead) => { result[lead[field]] = (result[lead[field]] ?? 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]);
  const campaignUrl = typeof window === "undefined" ? "" : `${window.location.origin}/?utm_source=${encodeURIComponent(cleanTag(campaignSource) || "direct")}&utm_campaign=${encodeURIComponent(cleanTag(campaignName) || "kampanya")}`;
  const copyCampaign = async () => { await navigator.clipboard.writeText(campaignUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const exportLeads = () => { const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`; const rows = [["E-posta", "Profil", "Paket", "İlk kayıt", "Güncelleme"], ...data.creatorLeads.map((lead) => [lead.email, lead.role, lead.plan, new Date(lead.created_at * 1000).toISOString(), new Date(lead.updated_at * 1000).toISOString()])]; const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\n")}`], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "creator-pro-erken-erisim.csv"; link.click(); URL.revokeObjectURL(url); };
  const exportWidgetLeads = () => { const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`; const rows = [["Şirket", "E-posta", "Web sitesi", "Profil", "Araç", "Paket", "Aşama", "Talep notu", "Satış notu", "Takip tarihi", "Son görüşme", "Güncelleme"], ...data.widgetLeads.map((lead) => [lead.company, lead.email, lead.website, lead.role, toolLabels[lead.tool] ?? lead.tool, planLabels[lead.plan] ?? lead.plan, stageLabels[lead.stage] ?? lead.stage, lead.message, lead.sales_notes, lead.follow_up_at ? new Date(lead.follow_up_at * 1000).toISOString() : "", lead.last_contacted_at ? new Date(lead.last_contacted_at * 1000).toISOString() : "", new Date(lead.updated_at * 1000).toISOString()])]; const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\n")}`], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "kurumsal-widget-satis-takibi.csv"; link.click(); URL.revokeObjectURL(url); };
  const selectedLead = data.widgetLeads.find((lead) => lead.id === selectedLeadId) ?? null;
  const visibleWidgetLeads = leadFilter === "all" ? data.widgetLeads : data.widgetLeads.filter((lead) => lead.stage === leadFilter);
  const stageCount = (stage: WidgetLeadStage) => data.widgetLeads.filter((lead) => lead.stage === stage).length;
  const openLead = (lead: WidgetLead) => { setSelectedLeadId(lead.id); setLeadDraft({ stage: lead.stage, salesNotes: lead.sales_notes ?? "", followUpDate: lead.follow_up_at ? new Date(lead.follow_up_at * 1000).toISOString().slice(0, 10) : "" }); setLeadSaveStatus(""); };
  const saveLead = async (markContacted = false) => { if (!selectedLead || !leadDraft) return; setLeadSaveStatus("Kaydediliyor…"); const followUpAt = leadDraft.followUpDate ? Math.floor(new Date(`${leadDraft.followUpDate}T12:00:00Z`).getTime() / 1000) : null; try { const response = await fetch(`/api/admin/widget-leads/${selectedLead.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ stage: markContacted && leadDraft.stage === "new" ? "contacted" : leadDraft.stage, salesNotes: leadDraft.salesNotes, followUpAt, markContacted }) }); if (!response.ok) throw new Error("failed"); const result = await response.json() as { updatedAt: number; lastContactedAt?: number }; const nextStage = markContacted && leadDraft.stage === "new" ? "contacted" : leadDraft.stage; setData({ ...data, widgetLeads: data.widgetLeads.map((lead) => lead.id === selectedLead.id ? { ...lead, stage: nextStage, sales_notes: leadDraft.salesNotes || null, follow_up_at: followUpAt, last_contacted_at: result.lastContactedAt ?? lead.last_contacted_at, updated_at: result.updatedAt } : lead) }); setLeadDraft({ ...leadDraft, stage: nextStage }); setLeadSaveStatus(markContacted ? "Görüşme kaydedildi." : "Değişiklikler kaydedildi."); } catch { setLeadSaveStatus("Kaydedilemedi. Lütfen tekrar deneyin."); } };
  const quoteDraft = selectedLead ? `Merhaba,\n\n${selectedLead.company} için ${toolLabels[selectedLead.tool] ?? selectedLead.tool} widget talebinizi aldık. İlgilendiğiniz paket: ${planLabels[selectedLead.plan] ?? selectedLead.plan}.\n\nKullanım hacmi, alan adı ve tasarım ihtiyacınızı netleştirdikten sonra kurulum kapsamını ve kesin teklifi paylaşabiliriz. Uygun olduğunuz kısa bir görüşme zamanı iletebilir misiniz?\n\nİyi çalışmalar,\nPara Hesaplayıcı` : "";
  const copyQuote = async () => { await navigator.clipboard.writeText(quoteDraft); setLeadSaveStatus("Teklif taslağı kopyalandı."); };

  return <main className="stats-shell">
    <header><div><span>Yalnızca yönetici</span><h1>Büyüme hunisi</h1><p>Kişisel finans verileri kaydedilmeden ziyaretçilerin üründeki yolculuğunu ölçer.</p></div><Link href="/">Hesaplayıcıya dön</Link></header>
    <section className="stats-grid">
      <article><span>Ziyaret</span><strong>{visits.toLocaleString("tr-TR")}</strong><small>Kimliksiz oturum görüntülemeleri</small></article>
      <article><span>Hesaplama sonuçları</span><strong>{calculations.toLocaleString("tr-TR")}</strong><small>{starts.toLocaleString("tr-TR")} başlatma olayı</small></article>
      <article><span>Paylaşım</span><strong>{shares.toLocaleString("tr-TR")}</strong><small>Başlatılan paylaşım akışları</small></article>
      <article className="accent"><span>Viral dönüşüm</span><strong>%{conversionRate.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</strong><small>{arrivals.toLocaleString("tr-TR")} paylaşımlı ziyaretten {conversions.toLocaleString("tr-TR")} hesaplama</small></article>
    </section>
    <section className="stats-panel">
      <div><span>Son 30 gün</span><h2>Tekrar kullanım</h2></div>
      <p>Defterde kayıt açma, Finansal Fotoğraf’ta ay açma veya kaydetme ölçülür. Aynı tarayıcı her özellik için günde bir kez sayılır. İlk kullanımdan sonraki farklı günlerdeki işlemler dönüş olarak görünür.</p>
      <div className="stats-table"><table>
        <thead><tr><th scope="col">Özellik</th><th scope="col">İlk kullanım</th><th scope="col">Dönüş günü</th></tr></thead>
        <tbody>{[["decision_notebook", "Karar Defteri"], ["financial_profile", "Finansal Fotoğraf"]].map(([key, label]) => (
          <tr key={key}><th scope="row">{label}</th><td>{data.featureUsage?.[key]?.firstUses ?? 0}</td><td>{data.featureUsage?.[key]?.returns ?? 0}</td></tr>
        ))}</tbody>
      </table></div>
    </section>
    <section className="stats-panel">
      <div><span>İlk kullanım grupları</span><h2>30 günlük geri dönüş</h2></div>
      <p>31–60 gün önce ölçüme giren tarayıcılardan, sonraki 30 gün içinde en az bir farklı günde tekrar kullananlar. Her tarayıcı özellik başına bir dönüş üretebilir.</p>
      <div className="stats-table"><table>
        <thead><tr><th scope="col">Özellik</th><th scope="col">İlk kullanım</th><th scope="col">Geri dönen</th><th scope="col">Oran</th></tr></thead>
        <tbody>{[["decision_notebook", "Karar Defteri"], ["financial_profile", "Finansal Fotoğraf"]].map(([key, label]) => {
          const counts = data.featureRetention?.[key];
          const rate = counts && counts.enrolled > 0 && counts.returned <= counts.enrolled
            ? new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 1 }).format(counts.returned / counts.enrolled)
            : "Henüz ölçülemiyor";
          return <tr key={key}><th scope="row">{label}</th><td>{counts?.enrolled ?? 0}</td><td>{counts?.returned ?? 0}</td><td>{rate}</td></tr>;
        })}</tbody>
      </table></div>
    </section>
    <section className="stats-panel">
      <div><span>Son 30 gün</span><h2>Organik aramadan hesaplamaya</h2></div>
      <p>Arama motoru yönlendirmesi görülen tarayıcı oturumları ve bunlardan en az bir hesaplamayı tamamlayanlar. Kampanya etiketli girişler hariç tutulur.</p>
      {(data.organicSearch ?? []).length > 0 ? <div className="stats-table"><table>
        <thead><tr><th scope="col">Arama motoru</th><th scope="col">Oturum</th><th scope="col">Hesap tamamlayan</th></tr></thead>
        <tbody>{data.organicSearch.map((row) => <tr key={row.category}><th scope="row">{row.category}</th><td>{row.visits}</td><td>{row.completed}</td></tr>)}</tbody>
      </table></div> : <p className="stats-empty">Ölçülen organik oturum henüz yok.</p>}
    </section>
    <DecisionHealth counts={data.decisionCounts} />
    <PilotUsage />
    <section className="stats-panel"><div><span>Ticari sinyal</span><h2>İçerik Stüdyosu ve Creator Pro</h2></div><div className="stats-feedback"><article><span>İçerik çıktısı</span><strong>{data.totals.content_exported ?? 0}</strong></article><article><span>Pro talebi</span><strong>{data.totals.pro_interest ?? 0}</strong></article><article><span>Talep / çıktı</span><strong>%{((data.totals.content_exported ?? 0) > 0 ? (data.totals.pro_interest ?? 0) / (data.totals.content_exported ?? 1) * 100 : 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</strong></article></div></section>
    <section className="stats-panel"><div><span>Ticari dönüşüm</span><h2>Creator Pro hunisi</h2></div><div className="commercial-funnel"><article><span>1</span><div><small>Fiyat sayfası</small><strong>{pricingViews}</strong></div></article><i>→</i><article><span>2</span><div><small>Markalı demo</small><strong>{proDemos}</strong></div></article><i>→</i><article><span>3</span><div><small>Paket aksiyonu</small><strong>{pricingActions}</strong></div></article><i>→</i><article className="qualified"><span>4</span><div><small>E-posta bırakan</small><strong>{leadCount}</strong></div></article></div><p className="commercial-funnel-note">Fiyat sayfasından iletişim bırakan kullanıcıya dönüşüm: <strong>%{leadRate.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</strong>. Bu oran yeterli trafik oluşmadan ürün–pazar uyumu kanıtı sayılmaz.</p><div className="commercial-breakdown"><div><h3>Paket tercihi</h3>{countBy("plan").length > 0 ? countBy("plan").map(([name, total]) => <p key={name}><span>{name}</span><strong>{total}</strong></p>) : <small>Henüz veri yok.</small>}</div><div><h3>Kullanıcı profili</h3>{countBy("role").length > 0 ? countBy("role").map(([name, total]) => <p key={name}><span>{name}</span><strong>{total}</strong></p>) : <small>Henüz veri yok.</small>}</div></div></section>
    <section className="stats-panel"><div className="stats-panel-heading"><div><span>Satışa hazır talep</span><h2>Creator Pro erken erişim listesi</h2></div>{data.creatorLeads.length > 0 && <button className="stats-export-button" onClick={exportLeads} type="button">CSV indir</button>}</div>{data.creatorLeads.length > 0 ? <div className="stats-table"><table><thead><tr><th>E-posta</th><th>Profil</th><th>Paket</th><th>Kayıt</th></tr></thead><tbody>{data.creatorLeads.map((lead) => <tr key={lead.email}><td>{lead.email}</td><td>{lead.role}</td><td>{lead.plan}</td><td>{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(lead.updated_at * 1000))}</td></tr>)}</tbody></table></div> : <p className="stats-empty">Henüz iletişim bırakan bir Creator Pro adayı yok.</p>}</section>
    <section className="stats-panel"><div><span>Kurumsal gelir hunisi</span><h2>Widget talebi ve satış sonucu</h2></div><div className="stats-feedback widget-sales-summary"><article><span>Demo seçimi</span><strong>{data.totals.widget_demo_used ?? 0}</strong></article><article><span>Nitelikli talep</span><strong>{data.widgetLeads.length}</strong></article><article><span>Teklif verildi</span><strong>{stageCount("proposal")}</strong></article><article><span>Kazanıldı</span><strong>{stageCount("won")}</strong></article></div></section>
    <section className="stats-panel"><div className="stats-panel-heading"><div><span>Kurumsal satış merkezi</span><h2>Widget adaylarını takip et</h2></div>{data.widgetLeads.length > 0 && <button className="stats-export-button" onClick={exportWidgetLeads} type="button">Satış listesini indir</button>}</div>{data.widgetLeads.length > 0 ? <><div className="lead-filters"><button className={leadFilter === "all" ? "active" : ""} onClick={() => setLeadFilter("all")} type="button">Tümü <b>{data.widgetLeads.length}</b></button>{(Object.keys(stageLabels) as WidgetLeadStage[]).map((stage) => <button className={leadFilter === stage ? "active" : ""} key={stage} onClick={() => setLeadFilter(stage)} type="button">{stageLabels[stage]} <b>{stageCount(stage)}</b></button>)}</div><div className="lead-workspace"><div className="stats-table lead-table"><table><thead><tr><th>Şirket</th><th>Aşama</th><th>Paket</th><th>Takip</th></tr></thead><tbody>{visibleWidgetLeads.map((lead) => <tr className={selectedLeadId === lead.id ? "selected" : ""} key={lead.id} onClick={() => openLead(lead)}><td><strong>{lead.company}</strong><small>{lead.email}</small></td><td><span className={`lead-stage ${lead.stage}`}>{stageLabels[lead.stage]}</span></td><td>{planLabels[lead.plan] ?? lead.plan}</td><td>{lead.follow_up_at ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(lead.follow_up_at * 1000)) : "—"}</td></tr>)}</tbody></table>{visibleWidgetLeads.length === 0 && <p className="stats-empty">Bu aşamada aday yok.</p>}</div>{selectedLead && leadDraft ? <aside className="lead-editor"><div className="lead-editor-heading"><div><span>Aday ayrıntısı</span><h3>{selectedLead.company}</h3></div><button aria-label="Aday ayrıntısını kapat" onClick={() => setSelectedLeadId(null)} type="button">×</button></div><div className="lead-contact"><a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a>{selectedLead.website && <a href={selectedLead.website} rel="noreferrer" target="_blank">Web sitesini aç ↗</a>}</div><dl><div><dt>Araç</dt><dd>{toolLabels[selectedLead.tool] ?? selectedLead.tool}</dd></div><div><dt>Paket</dt><dd>{planLabels[selectedLead.plan] ?? selectedLead.plan}</dd></div><div><dt>Talep notu</dt><dd>{selectedLead.message || "Not bırakılmadı."}</dd></div></dl><label>Satış aşaması<select onChange={(event) => setLeadDraft({ ...leadDraft, stage: event.target.value as WidgetLeadStage })} value={leadDraft.stage}>{(Object.keys(stageLabels) as WidgetLeadStage[]).map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label><label>Takip tarihi<input onChange={(event) => setLeadDraft({ ...leadDraft, followUpDate: event.target.value })} type="date" value={leadDraft.followUpDate} /></label><label>Görüşme notları<textarea maxLength={2000} onChange={(event) => setLeadDraft({ ...leadDraft, salesNotes: event.target.value })} placeholder="İhtiyaç, bütçe, karar verici ve sonraki adım…" value={leadDraft.salesNotes} /></label><div className="lead-actions"><button onClick={() => void saveLead(false)} type="button">Değişiklikleri kaydet</button><button className="secondary" onClick={() => void saveLead(true)} type="button">Görüşüldü işaretle</button></div><div className="quote-draft"><span>Hazır teklif başlangıcı</span><pre>{quoteDraft}</pre><button onClick={() => void copyQuote()} type="button">Teklif metnini kopyala</button></div><PilotProposal key={selectedLead.id} company={selectedLead.company} website={selectedLead.website} requestedTool={selectedLead.tool} /><p aria-live="polite" className="lead-save-status">{leadSaveStatus}</p></aside> : <aside className="lead-editor empty"><span>Aday ayrıntısı</span><h3>Bir şirket seçin</h3><p>Satış aşaması, takip tarihi, görüşme notu ve teklif taslağı burada açılır.</p></aside>}</div></> : <p className="stats-empty">Henüz kurumsal widget teklif talebi yok.</p>}</section>
    <section className="stats-panel"><div><span>Son 30 gün</span><h2>Günlük büyüme hunisi</h2></div>{data.daily.length > 0 ? <div className="stats-table"><table><thead><tr><th>Gün</th><th>Ziyaret</th><th>Başlangıç</th><th>Sonuç</th><th>Hata</th><th>Paylaşım</th><th>Gelen</th><th>Dönüşen</th></tr></thead><tbody>{data.daily.map((row) => <tr key={row.day}><td>{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(`${row.day}T12:00:00Z`))}</td><td>{row.visits}</td><td>{row.starts}</td><td>{row.calculations}</td><td>{row.failures}</td><td>{row.shares}</td><td>{row.arrivals}</td><td>{row.conversions}</td></tr>)}</tbody></table></div> : <p className="stats-empty">Henüz olay kaydı yok. Site kullanıldıkça bu ekran otomatik dolacak.</p>}</section>
    <div className="stats-split">
      <section className="stats-panel"><div><span>Kitle yapısı</span><h2>Ziyaret davranışı</h2></div><div className="stats-feedback"><article><span>Yeni</span><strong>{newVisitors}</strong></article><article><span>Geri dönen</span><strong>{returningVisitors}</strong></article><article><span>Mobil / Masaüstü</span><strong>{mobileVisitors} / {desktopVisitors}</strong></article></div></section>
      <section className="stats-panel"><div><span>Edinme</span><h2>Kampanya kaynakları</h2></div><div className="stats-event-list compact">{data.sources.length > 0 ? data.sources.map((item) => <div key={item.source}><span>{item.source}</span><strong>{item.total}</strong></div>) : <p className="stats-empty">Kaynak verisi henüz oluşmadı.</p>}</div></section>
    </div>
    <section className="stats-panel"><div><span>Son 30 gün</span><h2>Araç bazında tamamlama</h2></div>{data.tools.length > 0 ? <div className="stats-table"><table><thead><tr><th>Araç</th><th>Başlangıç</th><th>Sonuç</th><th>Hata</th><th>Oran</th></tr></thead><tbody>{data.tools.map((tool) => <tr key={tool.category}><td>{tool.category}</td><td>{tool.starts}</td><td>{tool.completions}</td><td>{tool.failures}</td><td>%{(tool.starts > 0 ? tool.completions / tool.starts * 100 : 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</td></tr>)}</tbody></table></div> : <p className="stats-empty">Araç verisi henüz oluşmadı.</p>}</section>
    <section className="stats-panel"><div><span>Organik büyüme</span><h2>SEO sayfalarının dönüşümü</h2></div>{data.seoPages.length > 0 ? <div className="stats-table"><table><thead><tr><th>Sayfa / araç</th><th>Ziyaret</th><th>Araca geçiş</th><th>Geçiş oranı</th></tr></thead><tbody>{data.seoPages.map((page) => <tr key={page.category}><td>{page.category}</td><td>{page.views}</td><td>{page.opens}</td><td>%{(page.views > 0 ? page.opens / page.views * 100 : 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</td></tr>)}</tbody></table></div> : <p className="stats-empty">SEO sayfası verisi henüz oluşmadı.</p>}</section>
    <section className="stats-panel"><div><span>İçerik dağıtımı</span><h2>Hazır kampanya performansı</h2></div>{data.campaigns.length > 0 ? <div className="stats-table"><table><thead><tr><th>Kampanya</th><th>Hesaba geçiş</th><th>Tamamlanan</th><th>İçerik</th><th>Paylaşım</th><th>Merkez aksiyonu</th></tr></thead><tbody>{data.campaigns.map((campaign) => <tr key={campaign.category}><td>{campaign.category}</td><td>{campaign.opens}</td><td>{campaign.completions}</td><td>{campaign.contentCreated}</td><td>{campaign.shares}</td><td>{campaign.copies + campaign.studioOpens}</td></tr>)}</tbody></table></div> : <p className="stats-empty">Kampanya Merkezi kullanıldıkça içerik bazlı veriler burada oluşacak.</p>}</section>
    <section className="stats-panel"><div><span>Dağıtım aracı</span><h2>Kampanya bağlantısı oluştur</h2></div><div className="campaign-builder"><label>Kaynak<input value={campaignSource} onChange={(event) => setCampaignSource(event.target.value)} placeholder="instagram" /></label><label>Kampanya<input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="keske-hesabi" /></label><button type="button" onClick={copyCampaign}>{copied ? "Kopyalandı" : "Bağlantıyı kopyala"}</button></div><code className="campaign-url">{campaignUrl}</code></section>
    <section className="stats-panel"><div><span>Toplam olaylar</span><h2>Ürün olayları</h2></div><div className="stats-event-list">{Object.entries(labels).map(([key, label]) => <div key={key}><span>{label}</span><strong>{(data.totals[key] ?? 0).toLocaleString("tr-TR")}</strong></div>)}</div></section>
    <section className="stats-panel"><div><span>Kullanıcı sesi</span><h2>Hesap işine yaradı mı?</h2></div><div className="stats-feedback"><article><span>Evet</span><strong>{data.feedback.yes ?? 0}</strong></article><article><span>Kısmen</span><strong>{data.feedback.partial ?? 0}</strong></article><article><span>Hayır</span><strong>{data.feedback.no ?? 0}</strong></article></div>{data.comments.length > 0 && <div className="stats-comments">{data.comments.map((comment, index) => <article key={`${comment.occurred_at}-${index}`}><div><span>{comment.rating === "yes" ? "Evet" : comment.rating === "partial" ? "Kısmen" : "Hayır"}</span><small>{comment.tool}</small></div><p>{comment.message}</p></article>)}</div>}</section>
    <p className="stats-privacy">Ziyaret sayısı benzersiz kişi değil, oturum görüntülemesidir. Analitik kayıtlarında tutar, tarih, yatırım aracı, harcama adı, e-posta veya IP adresi uygulama veritabanına yazılmaz.</p>
  </main>;
}
