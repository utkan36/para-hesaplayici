"use client";

import { useEffect } from "react";
import { getAnalyticsSource, trackAnalyticsEvent, trackPageView } from "./analytics";

export default function SeoTracker({ page }: { page: string }) {
  useEffect(() => {
    trackPageView();
    trackAnalyticsEvent("seo_page_view", page, getAnalyticsSource());
  }, [page]);
  return null;
}
