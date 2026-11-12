"use client";

import { useRef } from "react";
import { trackAnalyticsEvent } from "./analytics";

export function useDecisionCompletion(tool: "refinance" | "salary" | "purchase", version: number, enabled = true) {
  const completedVersion = useRef(0);

  return (action: "report" | "save" | "related_tool") => {
    if (!enabled || version === 0 || completedVersion.current === version) return;
    completedVersion.current = version;
    trackAnalyticsEvent("decision_completed", tool, action);
  };
}
