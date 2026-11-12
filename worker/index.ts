/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import { canOpenPilot, pilotIdPattern, readPilotLicense } from "../lib/widget-pilot";
import { checkDataHealth } from "../lib/data-health";
import { getTodayIso } from "../lib/dates";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  OWNER_EMAIL?: string;
  WIDGET_PILOT_LICENSES?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const requestWindows = new Map<string, { count: number; resetAt: number }>();

function rateLimit(request: Request, scope: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const visitor = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = `${scope}:${visitor}`;
  const current = requestWindows.get(key);
  if (!current || current.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (requestWindows.size > 5000) {
    for (const [entryKey, entry] of requestWindows) if (entry.resetAt <= now) requestWindows.delete(entryKey);
  }
  if (current.count <= limit) return null;
  return new Response(JSON.stringify({ error: "Çok kısa sürede çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin." }), { status: 429, headers: { "content-type": "application/json; charset=utf-8", "retry-after": String(Math.ceil((current.resetAt - now) / 1000)) } });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/widget" || url.pathname === "/widget/") {
      const licenseId = url.searchParams.get("license");
      const headers = new Headers({ "Cache-Control": "no-store", "Content-Security-Policy": "frame-ancestors 'self'" });
      if (licenseId === null) {
        if (url.searchParams.get("demo") !== "1" && url.searchParams.get("tool") !== "refinance") {
          return handler.fetch(request, env, ctx);
        }
        const demo = await handler.fetch(request, env, ctx);
        const response = new Response(demo.body, demo);
        response.headers.append("Content-Security-Policy", "frame-ancestors 'self'");
        response.headers.set("Cache-Control", "no-store");
        return response;
      }
      if (request.method !== "GET") return new Response(null, { status: 405, headers });
      const now = new Date();
      const license = readPilotLicense(env.WIDGET_PILOT_LICENSES, licenseId, now);
      if (!license || !canOpenPilot(request.headers, license.origin)) {
        return new Response("Widget bu alan adı için etkin değil.", { status: 403, headers });
      }

      const month = now.toISOString().slice(0, 7);
      const reserved = await env.DB.prepare(`
        INSERT INTO widget_pilot_usage (license_id, month, opens) VALUES (?, ?, 1)
        ON CONFLICT (license_id, month) DO UPDATE SET opens = opens + 1 WHERE opens < ?
      `).bind(licenseId, month, license.monthlyQuota).run();
      if (!reserved.meta.changes) {
        headers.set("Content-Security-Policy", `frame-ancestors ${license.origin}`);
        return new Response("Widget’ın bu ayki açılış kotası doldu.", { status: 429, headers });
      }

      url.pathname = "/widget";
      url.search = new URLSearchParams({ tool: license.tool, brand: license.brand, color: license.color }).toString();
      const widget = await handler.fetch(new Request(url, request), env, ctx);
      const response = new Response(widget.body, widget);
      response.headers.append("Content-Security-Policy", `frame-ancestors ${license.origin}`);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    if (url.pathname === "/api/admin/widget-pilot-usage" && request.method === "GET") {
      const userEmail = request.headers.get("oai-authenticated-user-email")?.trim().toLocaleLowerCase("en-US");
      const ownerEmail = env.OWNER_EMAIL?.trim().toLocaleLowerCase("en-US");
      if (!ownerEmail || userEmail !== ownerEmail) return Response.json({ error: "forbidden" }, { status: 403 });
      const id = url.searchParams.get("license") ?? "";
      if (!pilotIdPattern.test(id)) return Response.json({ error: "invalid_license" }, { status: 400 });
      const now = new Date();
      const month = now.toISOString().slice(0, 7);
      const settings = readPilotLicense(env.WIDGET_PILOT_LICENSES, id, null);
      const usage = await env.DB.prepare(
        "SELECT month, opens FROM widget_pilot_usage WHERE license_id = ? ORDER BY month DESC LIMIT 12"
      ).bind(id).all<{ month: string; opens: number }>();
      const opens = usage.results.find((row) => row.month === month)?.opens ?? 0;
      return Response.json({
        license: id,
        usage: usage.results,
        month,
        opens,
        settings,
        active: settings !== null && Date.parse(settings.expiresAt) > now.getTime(),
        remaining: settings ? Math.max(0, settings.monthlyQuota - opens) : null,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (url.pathname.startsWith("/api/")) {
      const limited = rateLimit(request, url.pathname === "/api/analytics" ? "analytics" : "api", url.pathname === "/api/analytics" ? 40 : 120);
      if (limited) return limited;
    }

    if (url.pathname === "/api/analytics" && request.method === "POST") {
      const eventTypes = new Set(["page_view", "seo_page_view", "seo_tool_opened", "guide_choice", "calculation_started", "calculation_completed", "calculation_failed", "opportunity_completed", "share_started", "shared_link_opened", "shared_link_converted", "content_exported", "pro_interest", "pro_demo_used", "pricing_cta_clicked", "campaign_opened", "campaign_copy", "campaign_studio_opened", "campaign_completed", "campaign_content_created", "campaign_shared", "widget_demo_used", "widget_embed_copied", "widget_quote_started", "widget_quote_submitted", "scenario_saved", "scenario_opened", "scenario_compared", "scenario_deleted", "scenario_backup_exported", "scenario_backup_imported", "scenario_pinned", "scenario_note_saved", "scenario_report_printed", "decision_report_opened", "decision_report_copied", "decision_result_ready", "decision_result_reported", "decision_completed", "feature_used", "feature_returned", "feature_cohort_started", "feature_cohort_returned", "organic_session_started", "organic_session_completed"]);
      const safeValue = /^[a-z0-9_-]{1,32}$/;
      let payload: Record<string, unknown>;
      try {
        payload = await request.json() as Record<string, unknown>;
      } catch {
        return Response.json({ ok: false }, { status: 400 });
      }
      const { eventType, category, source } = payload;
      if (typeof eventType !== "string" || !eventTypes.has(eventType) || typeof category !== "string" || !safeValue.test(category)) {
        return Response.json({ ok: false }, { status: 400 });
      }
      const normalizedSource = typeof source === "string" && safeValue.test(source) ? source : "direct";
      await env.DB.prepare(`
        INSERT INTO analytics_events (event_type, category, source, occurred_at)
        VALUES (?, ?, ?, ?)
      `).bind(eventType, category, normalizedSource, Math.floor(Date.now() / 1000)).run();
      return Response.json({ ok: true }, { status: 201 });
    }

    if (url.pathname === "/api/feedback" && request.method === "POST") {
      const limited = rateLimit(request, "feedback", 5, 10 * 60_000);
      if (limited) return limited;
      let payload: Record<string, unknown>;
      try { payload = await request.json() as Record<string, unknown>; } catch { return Response.json({ ok: false }, { status: 400 }); }
      const rating = typeof payload.rating === "string" ? payload.rating : "";
      const tool = typeof payload.tool === "string" && /^[a-z0-9_-]{1,32}$/.test(payload.tool) ? payload.tool : "general";
      const message = typeof payload.message === "string" ? payload.message.trim().slice(0, 300) : "";
      if (!["yes", "partial", "no"].includes(rating)) return Response.json({ ok: false }, { status: 400 });
      await env.DB.prepare(`INSERT INTO user_feedback (rating, tool, message, occurred_at) VALUES (?, ?, ?, ?)`).bind(rating, tool, message || null, Math.floor(Date.now() / 1000)).run();
      return Response.json({ ok: true }, { status: 201 });
    }

    if (url.pathname === "/api/creator-leads" && request.method === "POST") {
      const limited = rateLimit(request, "creator-leads", 3, 30 * 60_000);
      if (limited) return limited;
      let payload: Record<string, unknown>;
      try { payload = await request.json() as Record<string, unknown>; } catch { return Response.json({ ok: false }, { status: 400 }); }
      const email = typeof payload.email === "string" ? payload.email.trim().toLocaleLowerCase("en-US") : "";
      const role = typeof payload.role === "string" ? payload.role : "";
      const plan = typeof payload.plan === "string" ? payload.plan : "";
      const consent = payload.consent === true;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!consent || email.length > 160 || !emailPattern.test(email) || !["creator", "agency", "publisher", "brand"].includes(role) || !["creator", "pro", "agency", "corporate"].includes(plan)) return Response.json({ ok: false }, { status: 400 });
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(`
        INSERT INTO creator_leads (email, role, plan, consent_version, created_at, updated_at)
        VALUES (?, ?, ?, 'v1', ?, ?)
        ON CONFLICT(email) DO UPDATE SET role = excluded.role, plan = excluded.plan, consent_version = excluded.consent_version, updated_at = excluded.updated_at
      `).bind(email, role, plan, now, now).run();
      await env.DB.prepare(`INSERT INTO analytics_events (event_type, category, source, occurred_at) VALUES ('pro_interest', ?, 'early_access', ?)`).bind(`${role}_${plan}`, now).run();
      return Response.json({ ok: true }, { status: 201 });
    }

    if (url.pathname === "/api/widget-leads" && request.method === "POST") {
      const limited = rateLimit(request, "widget-leads", 3, 30 * 60_000);
      if (limited) return limited;
      let payload: Record<string, unknown>;
      try { payload = await request.json() as Record<string, unknown>; } catch { return Response.json({ ok: false }, { status: 400 }); }
      const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
      const email = clean(payload.email, 160).toLocaleLowerCase("en-US");
      const company = clean(payload.company, 80);
      const website = clean(payload.website, 180);
      const role = clean(payload.role, 24); const tool = clean(payload.tool, 24); const plan = clean(payload.plan, 24); const message = clean(payload.message, 500);
      const consent = payload.consent === true;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const validWebsite = !website || /^https?:\/\/[^\s]+$/i.test(website);
      if (!consent || !company || !emailPattern.test(email) || !validWebsite || !["publisher", "fintech", "advisor", "hr", "other"].includes(role) || !["debt", "deposit", "salary", "savings", "refinance"].includes(tool) || !["branded", "white_label", "corporate"].includes(plan)) return Response.json({ ok: false }, { status: 400 });
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(`INSERT INTO widget_leads (email, company, website, role, tool, plan, message, consent_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'v1', ?, ?)`).bind(email, company, website || null, role, tool, plan, message || null, now, now).run();
      return Response.json({ ok: true }, { status: 201 });
    }

    const widgetLeadMatch = url.pathname.match(/^\/api\/admin\/widget-leads\/(\d+)$/);
    if (widgetLeadMatch && request.method === "PATCH") {
      const userEmail = request.headers.get("oai-authenticated-user-email")?.trim().toLocaleLowerCase("en-US");
      const ownerEmail = env.OWNER_EMAIL?.trim().toLocaleLowerCase("en-US");
      if (!ownerEmail || !userEmail || userEmail !== ownerEmail) return Response.json({ error: "forbidden" }, { status: 403 });
      const limited = rateLimit(request, "admin-widget-leads", 30, 10 * 60_000);
      if (limited) return limited;
      let payload: Record<string, unknown>;
      try { payload = await request.json() as Record<string, unknown>; } catch { return Response.json({ ok: false }, { status: 400 }); }
      const leadId = Number(widgetLeadMatch[1]);
      const stage = typeof payload.stage === "string" ? payload.stage : "";
      const salesNotes = typeof payload.salesNotes === "string" ? payload.salesNotes.trim().slice(0, 2000) : "";
      const followUpAt = typeof payload.followUpAt === "number" && Number.isInteger(payload.followUpAt) && payload.followUpAt > 0 ? payload.followUpAt : null;
      const markContacted = payload.markContacted === true;
      if (!Number.isSafeInteger(leadId) || leadId < 1 || !["new", "contacted", "proposal", "won", "lost"].includes(stage)) return Response.json({ ok: false }, { status: 400 });
      const now = Math.floor(Date.now() / 1000);
      const result = await env.DB.prepare(`
        UPDATE widget_leads
        SET stage = ?, sales_notes = ?, follow_up_at = ?, last_contacted_at = CASE WHEN ? = 1 THEN ? ELSE last_contacted_at END, updated_at = ?
        WHERE id = ?
      `).bind(stage, salesNotes || null, followUpAt, markContacted ? 1 : 0, now, now, leadId).run();
      if (!result.meta.changes) return Response.json({ ok: false }, { status: 404 });
      return Response.json({ ok: true, updatedAt: now, lastContactedAt: markContacted ? now : undefined });
    }

    if (url.pathname === "/api/admin/data-health" && request.method === "GET") {
      const userEmail = request.headers.get("oai-authenticated-user-email")?.trim().toLocaleLowerCase("en-US");
      const ownerEmail = env.OWNER_EMAIL?.trim().toLocaleLowerCase("en-US");
      if (!ownerEmail || !userEmail || userEmail !== ownerEmail) return Response.json({ error: "forbidden" }, { status: 403 });
      const limited = rateLimit(request, "admin-data-health", 6);
      if (limited) return limited;
      const rows = await checkDataHealth(getTodayIso(), (path) => handler.fetch(new Request(new URL(path, url)), env, ctx));
      return Response.json({ checkedAt: new Date().toISOString(), rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (url.pathname === "/api/admin/stats" && request.method === "GET") {
      const userEmail = request.headers.get("oai-authenticated-user-email")?.trim().toLocaleLowerCase("en-US");
      const ownerEmail = env.OWNER_EMAIL?.trim().toLocaleLowerCase("en-US");
      if (!ownerEmail || !userEmail || userEmail !== ownerEmail) return Response.json({ error: "forbidden" }, { status: 403 });
      const [totalsResult, dailyResult, sourcesResult, segmentsResult, toolsResult, seoPagesResult, feedbackResult, commentsResult, creatorLeadsResult, campaignsResult, widgetLeadsResult, decisionCountsResult, featureUsageResult, retentionResult, organicResult] = await Promise.all([
        env.DB.prepare(`SELECT event_type, COUNT(*) AS total FROM analytics_events GROUP BY event_type`).all<{ event_type: string; total: number }>(),
        env.DB.prepare(`
          SELECT date(occurred_at, 'unixepoch') AS day,
            SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS visits,
            SUM(CASE WHEN event_type = 'calculation_started' THEN 1 ELSE 0 END) AS starts,
            SUM(CASE WHEN event_type IN ('calculation_completed', 'opportunity_completed') THEN 1 ELSE 0 END) AS calculations,
            SUM(CASE WHEN event_type = 'calculation_failed' THEN 1 ELSE 0 END) AS failures,
            SUM(CASE WHEN event_type = 'share_started' THEN 1 ELSE 0 END) AS shares,
            SUM(CASE WHEN event_type = 'shared_link_opened' THEN 1 ELSE 0 END) AS arrivals,
            SUM(CASE WHEN event_type = 'shared_link_converted' THEN 1 ELSE 0 END) AS conversions
          FROM analytics_events WHERE occurred_at >= unixepoch('now', '-30 days')
          GROUP BY day ORDER BY day DESC
        `).all<{ day: string; visits: number; starts: number; calculations: number; failures: number; shares: number; arrivals: number; conversions: number }>(),
        env.DB.prepare(`SELECT source, COUNT(*) AS total FROM analytics_events WHERE event_type = 'page_view' AND occurred_at >= unixepoch('now', '-30 days') GROUP BY source ORDER BY total DESC LIMIT 12`).all<{ source: string; total: number }>(),
        env.DB.prepare(`SELECT category, COUNT(*) AS total FROM analytics_events WHERE event_type = 'page_view' AND occurred_at >= unixepoch('now', '-30 days') GROUP BY category`).all<{ category: string; total: number }>(),
        env.DB.prepare(`SELECT category, SUM(CASE WHEN event_type = 'calculation_started' THEN 1 ELSE 0 END) AS starts, SUM(CASE WHEN event_type IN ('calculation_completed', 'opportunity_completed') THEN 1 ELSE 0 END) AS completions, SUM(CASE WHEN event_type = 'calculation_failed' THEN 1 ELSE 0 END) AS failures FROM analytics_events WHERE event_type IN ('calculation_started', 'calculation_completed', 'opportunity_completed', 'calculation_failed') AND occurred_at >= unixepoch('now', '-30 days') GROUP BY category ORDER BY starts DESC`).all<{ category: string; starts: number; completions: number; failures: number }>(),
        env.DB.prepare(`SELECT category, SUM(CASE WHEN event_type = 'seo_page_view' THEN 1 ELSE 0 END) AS views, SUM(CASE WHEN event_type = 'seo_tool_opened' THEN 1 ELSE 0 END) AS opens FROM analytics_events WHERE event_type IN ('seo_page_view', 'seo_tool_opened') AND occurred_at >= unixepoch('now', '-30 days') GROUP BY category ORDER BY views DESC`).all<{ category: string; views: number; opens: number }>(),
        env.DB.prepare(`SELECT rating, COUNT(*) AS total FROM user_feedback GROUP BY rating`).all<{ rating: string; total: number }>(),
        env.DB.prepare(`SELECT rating, tool, message, occurred_at FROM user_feedback WHERE message IS NOT NULL ORDER BY occurred_at DESC LIMIT 20`).all<{ rating: string; tool: string; message: string; occurred_at: number }>(),
        env.DB.prepare(`SELECT email, role, plan, created_at, updated_at FROM creator_leads ORDER BY updated_at DESC LIMIT 500`).all<{ email: string; role: string; plan: string; created_at: number; updated_at: number }>(),
        env.DB.prepare(`SELECT category, SUM(CASE WHEN event_type = 'campaign_opened' THEN 1 ELSE 0 END) AS opens, SUM(CASE WHEN event_type = 'campaign_copy' THEN 1 ELSE 0 END) AS copies, SUM(CASE WHEN event_type = 'campaign_studio_opened' THEN 1 ELSE 0 END) AS studio_opens, SUM(CASE WHEN event_type = 'campaign_completed' THEN 1 ELSE 0 END) AS completions, SUM(CASE WHEN event_type = 'campaign_content_created' THEN 1 ELSE 0 END) AS content_created, SUM(CASE WHEN event_type = 'campaign_shared' THEN 1 ELSE 0 END) AS shares FROM analytics_events WHERE event_type IN ('campaign_opened', 'campaign_copy', 'campaign_studio_opened', 'campaign_completed', 'campaign_content_created', 'campaign_shared') AND occurred_at >= unixepoch('now', '-30 days') GROUP BY category ORDER BY opens DESC, completions DESC`).all<{ category: string; opens: number; copies: number; studio_opens: number; completions: number; content_created: number; shares: number }>(),
        env.DB.prepare(`SELECT id, email, company, website, role, tool, plan, message, stage, sales_notes, follow_up_at, last_contacted_at, created_at, updated_at FROM widget_leads ORDER BY updated_at DESC LIMIT 500`).all<{ id: number; email: string; company: string; website: string | null; role: string; tool: string; plan: string; message: string | null; stage: string; sales_notes: string | null; follow_up_at: number | null; last_contacted_at: number | null; created_at: number; updated_at: number }>(),
        env.DB.prepare(`SELECT event_type, COUNT(*) AS total FROM analytics_events
          WHERE occurred_at >= unixepoch('now', '-30 days')
            AND event_type IN ('calculation_started', 'calculation_completed', 'calculation_failed', 'scenario_saved', 'decision_report_opened', 'decision_report_copied', 'scenario_report_printed', 'decision_result_ready', 'decision_result_reported', 'decision_completed')
          GROUP BY event_type`).all<{ event_type: string; total: number }>(),
        env.DB.prepare(`SELECT category,
            SUM(CASE WHEN event_type = 'feature_used' THEN 1 ELSE 0 END) AS firstUses,
            SUM(CASE WHEN event_type = 'feature_returned' THEN 1 ELSE 0 END) AS returns
          FROM analytics_events WHERE occurred_at >= unixepoch('now', '-30 days')
            AND event_type IN ('feature_used', 'feature_returned')
            AND category IN ('decision_notebook', 'financial_profile') GROUP BY category`)
          .all<{ category: string; firstUses: number; returns: number }>(),
        env.DB.prepare(`SELECT category,
            SUM(CASE WHEN event_type = 'feature_cohort_started' THEN 1 ELSE 0 END) AS enrolled,
            SUM(CASE WHEN event_type = 'feature_cohort_returned' THEN 1 ELSE 0 END) AS returned
          FROM analytics_events WHERE event_type IN ('feature_cohort_started', 'feature_cohort_returned')
            AND category IN ('decision_notebook', 'financial_profile')
            AND source BETWEEN date('now', '+3 hours', '-60 days') AND date('now', '+3 hours', '-31 days')
          GROUP BY category`).all<{ category: string; enrolled: number; returned: number }>(),
        env.DB.prepare(`SELECT category,
            SUM(CASE WHEN event_type = 'organic_session_started' THEN 1 ELSE 0 END) AS visits,
            SUM(CASE WHEN event_type = 'organic_session_completed' THEN 1 ELSE 0 END) AS completed
          FROM analytics_events WHERE occurred_at >= unixepoch('now', '-30 days')
            AND event_type IN ('organic_session_started', 'organic_session_completed')
            AND category IN ('google', 'bing', 'duckduckgo', 'yahoo') GROUP BY category ORDER BY visits DESC`)
          .all<{ category: string; visits: number; completed: number }>(),
      ]);
      return Response.json({
        organicSearch: organicResult.results,
        featureRetention: Object.fromEntries(retentionResult.results.map((row) => [row.category, { enrolled: Number(row.enrolled), returned: Number(row.returned) }])),
        featureUsage: Object.fromEntries(featureUsageResult.results.map((row) => [row.category, { firstUses: Number(row.firstUses), returns: Number(row.returns) }])),
        decisionCounts: Object.fromEntries(decisionCountsResult.results.map((row) => [row.event_type, Number(row.total)])),
        totals: Object.fromEntries(totalsResult.results.map((row) => [row.event_type, Number(row.total)])),
        daily: dailyResult.results.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key === "day" ? value : Number(value)]))),
        sources: sourcesResult.results.map((row) => ({ source: row.source, total: Number(row.total) })),
        visitorSegments: Object.fromEntries(segmentsResult.results.map((row) => [row.category, Number(row.total)])),
        tools: toolsResult.results.map((row) => ({ category: row.category, starts: Number(row.starts), completions: Number(row.completions), failures: Number(row.failures) })),
        seoPages: seoPagesResult.results.map((row) => ({ category: row.category, views: Number(row.views), opens: Number(row.opens) })),
        feedback: Object.fromEntries(feedbackResult.results.map((row) => [row.rating, Number(row.total)])),
        comments: commentsResult.results,
        creatorLeads: creatorLeadsResult.results,
        campaigns: campaignsResult.results.map((row) => ({ category: row.category, opens: Number(row.opens), copies: Number(row.copies), studioOpens: Number(row.studio_opens), completions: Number(row.completions), contentCreated: Number(row.content_created), shares: Number(row.shares) })),
        widgetLeads: widgetLeadsResult.results,
      });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
