"use client";

import { useState } from "react";
import { saveScenario, type SavedScenario } from "../lib/saved-scenarios";
import { trackAnalyticsEvent } from "./analytics";

export default function SaveScenarioButton({ scenario, onSaved }: { scenario: Omit<SavedScenario, "id" | "createdAt">; onSaved?: () => void }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  function save() {
    try {
      saveScenario(scenario);
      setSaved(true);
      onSaved?.();
      setError(false);
      trackAnalyticsEvent("scenario_saved", scenario.tool, "calculator_result");
      window.setTimeout(() => setSaved(false), 2200);
    } catch {
      setError(true);
    }
  }
  return <button disabled={saved} className="save-scenario-button" onClick={save} type="button">{saved ? "Deftere kaydedildi ✓" : error ? "Kaydedilemedi · Tekrar dene" : "Karar Defteri’ne kaydet"}</button>;
}
