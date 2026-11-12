import type { Metadata } from "next";
import Link from "next/link";
import FinancialProfile from "./financial-profile";
import DecisionNotebook from "./decision-notebook";

export const metadata: Metadata = { title: "Finansal Karar Defteri | Para Hesaplayıcı", description: "Borç, mevduat, maaş ve birikim hesaplarını cihazında sakla ve senaryolarını karşılaştır.", alternates: { canonical: "/karar-defteri" } };

export default function Page() { return <main className="notebook-page"><header><Link className="brand" href="/"><span className="brand-mark">₺</span><span><strong>Para Hesaplayıcı</strong><small>Paranın zaman makinesi</small></span></Link><Link href="/hesaplama-araclari">Araçlar →</Link></header><section className="notebook-hero"><span>Kişisel çalışma alanın</span><h1>Finansal Karar Defteri</h1><p>Hesaplama sonuçlarını kaydet, aynı türden iki senaryoyu yan yana gör. Kayıtların yalnızca bu tarayıcıda tutulur.</p></section><FinancialProfile /><DecisionNotebook /></main>; }
