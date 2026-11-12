import { getTodayIso } from "../lib/dates";
import { trackAnalyticsEvent } from "./analytics";

export function trackFeatureUsage(feature: "decision_notebook" | "financial_profile") {
  const key = `para-feature-day:${feature}`;
  const day = getTodayIso();
  try {
    const previous = window.localStorage.getItem(key);
    const cohortKey = `${key}:cohort-v1`;
    const first = window.localStorage.getItem(cohortKey);
    const returnedKey = `${cohortKey}:returned`;
    if (!first) {
      window.localStorage.setItem(cohortKey, day);
      trackAnalyticsEvent("feature_cohort_started", feature, day);
    } else if (first < day && !window.localStorage.getItem(returnedKey)) {
      const days = (Date.parse(day) - Date.parse(first)) / 86_400_000;
      if (days <= 30) {
        window.localStorage.setItem(returnedKey, "1");
        trackAnalyticsEvent("feature_cohort_returned", feature, first);
      }
    }
    if (previous === day) return;
    window.localStorage.setItem(key, day);
    trackAnalyticsEvent(previous && previous < day ? "feature_returned" : "feature_used", feature, "local_feature");
  } catch {
    // The feature remains usable when browser storage is unavailable.
  }
}
