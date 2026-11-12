import type { Metadata } from "next";
import type { CSSProperties } from "react";
import DebtRefinanceCalculator from "../debt-refinance-calculator";
import DebtCalculator from "../debt-calculator";
import DepositReturnCalculator from "../deposit-return-calculator";
import SalaryPurchasingPowerCalculator from "../salary-purchasing-power-calculator";
import SavingsPlanCalculator from "../savings-plan-calculator";

export const metadata: Metadata = { title: "Finans Hesaplayıcı Widget", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const names: Record<string, string> = { refinance: "Borç Yapılandırma", debt: "Borç Hesaplama", deposit: "Mevduat Getirisi", salary: "Maaş Alım Gücü", savings: "Birikim Hedefi" };

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const tool = typeof params.tool === "string" && Object.hasOwn(names, params.tool) ? params.tool : "debt";
  const brand = typeof params.brand === "string" ? params.brand.replace(/[<>]/g, "").trim().slice(0, 32) || "Markanız" : "Markanız";
  const color = typeof params.color === "string" && /^#[0-9a-fA-F]{6}$/.test(params.color) ? params.color : "#176b4d";
  return <main className="embedded-widget" style={{ "--widget-brand": color } as CSSProperties}><header><div><span>{brand.slice(0, 1).toLocaleUpperCase("tr-TR")}</span><strong>{brand}</strong></div><small>{names[tool]} · Para Hesaplayıcı altyapısı</small></header>{tool === "refinance" ? <DebtRefinanceCalculator useProfile={false} /> : tool === "debt" ? <DebtCalculator /> : tool === "deposit" ? <DepositReturnCalculator /> : tool === "salary" ? <SalaryPurchasingPowerCalculator embedded /> : <SavingsPlanCalculator />}</main>;
}
