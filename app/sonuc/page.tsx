import type { Metadata } from "next";
import Home from "../page";
import DebtCalculator from "../debt-calculator";
import SalaryPurchasingPowerCalculator from "../salary-purchasing-power-calculator";
import SavingsPlanCalculator from "../savings-plan-calculator";
import DepositReturnCalculator from "../deposit-return-calculator";
import Link from "next/link";
import { describeSharedResult } from "../share-metadata";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const toParams = (values: Record<string, string | string[] | undefined>) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(values)) if (typeof value === "string") params.set(key, value); return params; };
const StudioLink = ({ params }: { params: URLSearchParams }) => <Link className="shared-studio-link" href={`/icerik-studyosu?${params.toString()}`}>Bu sonucu içerik kartına dönüştür →</Link>;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = toParams(await searchParams);
  const details = describeSharedResult(params);
  const image = `/api/share-image?${params.toString()}`;
  return { title: `${details.title} | Para Hesaplayıcı`, description: details.description, robots: { index: false, follow: true }, openGraph: { title: details.title, description: details.description, images: [{ url: image, width: 1200, height: 630, alt: details.title }], type: "website" }, twitter: { card: "summary_large_image", title: details.title, description: details.description, images: [image] } };
}

export default async function SharedResultPage({ searchParams }: Props) {
  const params = toParams(await searchParams);
  if (params.get("tool") === "debt") return <main className="shared-debt-page"><div><span>Paylaşılan borç hesabı</span><h1>{describeSharedResult(params).title}</h1><p>{describeSharedResult(params).description}</p><StudioLink params={params} /></div><DebtCalculator initial={{ principal: params.get("principal") ?? "100000", rate: params.get("rate") ?? "3.5", months: params.get("months") ?? "12" }} /></main>;
  if (params.get("tool") === "salary") return <main className="shared-debt-page"><div><span>Paylaşılan maaş hesabı</span><h1>{describeSharedResult(params).title}</h1><p>{describeSharedResult(params).description}</p><StudioLink params={params} /></div><SalaryPurchasingPowerCalculator initial={{ oldSalary: params.get("oldSalary") ?? "10000", currentSalary: params.get("currentSalary") ?? "30000", salaryDate: params.get("salaryDate") ?? "2022-01", oldIndex: params.get("oldIndex") ?? undefined, currentIndex: params.get("currentIndex") ?? undefined }} /></main>;
  if (params.get("tool") === "savings") return <main className="shared-debt-page"><div><span>Paylaşılan birikim planı</span><h1>{describeSharedResult(params).title}</h1><p>{describeSharedResult(params).description}</p><StudioLink params={params} /></div><SavingsPlanCalculator initial={{ initialAmount: params.get("initialAmount") ?? "50000", monthlyContribution: params.get("monthlyContribution") ?? "5000", annualIncrease: params.get("annualIncrease") ?? "20", years: params.get("years") ?? "5", annualReturn: params.get("annualReturn") ?? "35", inflation: params.get("inflation") ?? "25", target: params.get("target") ?? "1000000" }} /></main>;
  if (params.get("tool") === "deposit") return <main className="shared-debt-page"><div><span>Paylaşılan mevduat hesabı</span><h1>{describeSharedResult(params).title}</h1><p>{describeSharedResult(params).description}</p><StudioLink params={params} /></div><DepositReturnCalculator initial={{ principal: params.get("principal") ?? "100000", annualInterest: params.get("annualInterest") ?? "45", termDays: params.get("termDays") ?? "32", withholding: params.get("withholding") ?? "15", inflation: params.get("inflation") ?? "30" }} /></main>;
  if (params.get("tool") === "personal-inflation") return <main className="shared-summary-page"><span>Paylaşılan kişisel enflasyon özeti</span><h1>{describeSharedResult(params).title}</h1><strong>{describeSharedResult(params).result}</strong><p>{describeSharedResult(params).description}</p><div className="shared-summary-actions"><Link href="/kisisel-enflasyon-hesaplama">Kendi harcama sepetini hesapla →</Link><StudioLink params={params} /></div></main>;
  return <Home />;
}
