import { primaryKey, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const analyticsEvents = sqliteTable("analytics_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("event_type").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull().default("direct"),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_analytics_events_occurred_at").on(table.occurredAt),
  index("idx_analytics_events_type_date").on(table.eventType, table.occurredAt),
]);

export const userFeedback = sqliteTable("user_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rating: text("rating").notNull(),
  tool: text("tool").notNull().default("general"),
  message: text("message"),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_user_feedback_occurred_at").on(table.occurredAt),
  index("idx_user_feedback_rating").on(table.rating),
]);

export const creatorLeads = sqliteTable("creator_leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  plan: text("plan").notNull(),
  consentVersion: text("consent_version").notNull().default("v1"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_creator_leads_created_at").on(table.createdAt),
  index("idx_creator_leads_plan").on(table.plan),
]);

export const widgetLeads = sqliteTable("widget_leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  company: text("company").notNull(),
  website: text("website"),
  role: text("role").notNull(),
  tool: text("tool").notNull(),
  plan: text("plan").notNull(),
  message: text("message"),
  stage: text("stage").notNull().default("new"),
  salesNotes: text("sales_notes"),
  followUpAt: integer("follow_up_at", { mode: "timestamp" }),
  lastContactedAt: integer("last_contacted_at", { mode: "timestamp" }),
  consentVersion: text("consent_version").notNull().default("v1"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_widget_leads_created_at").on(table.createdAt),
  index("idx_widget_leads_plan").on(table.plan),
  index("idx_widget_leads_tool").on(table.tool),
  index("idx_widget_leads_stage").on(table.stage),
  index("idx_widget_leads_follow_up_at").on(table.followUpAt),
]);

export const widgetPilotUsage = sqliteTable("widget_pilot_usage", {
  licenseId: text("license_id").notNull(),
  month: text("month").notNull(),
  opens: integer("opens").notNull(),
}, (table) => [primaryKey({ columns: [table.licenseId, table.month] })]);
