import type { Metadata } from "next";
import DecisionReportView from "./report-view";

export const metadata: Metadata = {
  title: "Karar Raporu | Para Hesaplayıcı",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return <DecisionReportView />;
}
