import { searchReferrer } from "../lib/search-referrer";

export type AnalyticsEventType = "page_view" | "seo_page_view" | "seo_tool_opened" | "guide_choice" | "calculation_started" | "calculation_completed" | "calculation_failed" | "opportunity_completed" | "share_started" | "shared_link_opened" | "shared_link_converted" | "content_exported" | "pro_interest" | "pro_demo_used" | "pricing_cta_clicked" | "campaign_opened" | "campaign_copy" | "campaign_studio_opened" | "campaign_completed" | "campaign_content_created" | "campaign_shared" | "widget_demo_used" | "widget_embed_copied" | "widget_quote_started" | "widget_quote_submitted" | "scenario_saved" | "scenario_opened" | "scenario_compared" | "scenario_deleted" | "scenario_backup_exported" | "scenario_backup_imported" | "scenario_pinned" | "scenario_note_saved" | "scenario_report_printed" | "decision_report_opened" | "decision_report_copied" | "decision_result_ready" | "decision_result_reported" | "decision_completed" | "feature_used" | "feature_returned" | "feature_cohort_started" | "feature_cohort_returned" | "organic_session_started" | "organic_session_completed";

const VISITOR_KEY = "para-hesaplayici-returning-visitor-v1";
const SESSION_VIEW_KEY = "para-hesaplayici-page-view-v2";

function safeToken(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "direct";
}

export function getAnalyticsSource() {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source");
  const campaign = params.get("utm_campaign");
  if (source || campaign) return safeToken([source, campaign].filter(Boolean).join("_"));
  if (params.has("amount") || params.has("tool")) return "shared_link";
  return "direct";
}

export function appendCampaignAttribution(url: URL) {
  if (typeof window === "undefined") return url;
  const current = new URLSearchParams(window.location.search);
  const campaign = current.get("utm_campaign");
  if (!campaign) return url;
  url.searchParams.set("utm_campaign", safeToken(campaign));
  url.searchParams.set("utm_source", safeToken(current.get("utm_source") || "kampanya_merkezi"));
  return url;
}

export function trackCampaignEvent(eventType: "campaign_studio_opened" | "campaign_completed" | "campaign_content_created" | "campaign_shared") {
  if (typeof window === "undefined") return;
  const campaign = new URLSearchParams(window.location.search).get("utm_campaign");
  if (!campaign) return;
  if (eventType === "campaign_completed" || eventType === "campaign_studio_opened") {
    const key = `para-campaign:${eventType}:${safeToken(campaign)}:${window.location.pathname}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "tracked");
  }
  trackAnalyticsEvent(eventType, safeToken(campaign), "campaign_flow");
}

export function trackPageView() {
  if (typeof window === "undefined") return;
  trackOrganicSession(false);
  const viewKey = `${SESSION_VIEW_KEY}:${window.location.pathname}`;
  if (window.sessionStorage.getItem(viewKey)) return;
  const returning = window.localStorage.getItem(VISITOR_KEY) === "seen";
  const device = window.matchMedia("(max-width: 720px)").matches ? "mobile" : "desktop";
  window.sessionStorage.setItem(viewKey, "tracked");
  window.localStorage.setItem(VISITOR_KEY, "seen");
  trackAnalyticsEvent("page_view", `${returning ? "returning" : "new"}_${device}`, getAnalyticsSource());
}

const organicKey = "para-organic-session-v1";
const organicWindow = 30 * 60_000;
let organicEntryChecked = false;

function trackOrganicSession(completed: boolean) {
  if (typeof window === "undefined") return;
  try {
    const canStart = !completed && !organicEntryChecked;
    organicEntryChecked = true;
    const now = Date.now();
    const current = JSON.parse(window.sessionStorage.getItem(organicKey) ?? "null") as {
      source: string; lastActivity: number; completed: boolean;
    } | null;
    if (current && now - current.lastActivity < organicWindow) {
      window.sessionStorage.setItem(organicKey, JSON.stringify({ ...current, lastActivity: now, completed: current.completed || completed }));
      if (completed && !current.completed) trackAnalyticsEvent("organic_session_completed", current.source, "organic_search");
      return;
    }
    if (!canStart) return;
    const source = searchReferrer(document.referrer, window.location.origin, window.location.search);
    if (!source) return;
    window.sessionStorage.setItem(organicKey, JSON.stringify({ source, lastActivity: now, completed: false }));
    trackAnalyticsEvent("organic_session_started", source, "organic_search");
  } catch {
    // Analytics does not block the calculator when storage is unavailable.
  }
}

export function trackAnalyticsEvent(eventType: AnalyticsEventType, category: string, source = "direct") {
  if (eventType === "calculation_completed" || eventType === "opportunity_completed") trackOrganicSession(true);
  const body = JSON.stringify({ eventType, category, source });
  void fetch("/api/analytics", {
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => undefined);
}
