import type { Metadata } from "next";
import Link from "next/link";
import SeoTracker from "../seo-tracker";
import WidgetConfigurator from "./widget-configurator";

export const metadata: Metadata = { title: "Kurumsal Finans Hesaplayıcı Widget", description: "Borç, mevduat, maaş ve birikim hesaplayıcılarını markanıza uyarlayın; canlı demoyu deneyin ve kurumsal teklif alın.", alternates: { canonical: "/kurumsal-widget" }, openGraph: { title: "Kurumsal Hesaplayıcı Widget", description: "Finans hesaplayıcılarını sitenize kendi markanızla ekleyin.", url: "/kurumsal-widget" } };
export default function Page() { return <main className="corporate-widget-page"><SeoTracker page="kurumsal_widget" /><header><Link className="brand" href="/"><span className="brand-mark">₺</span><span><strong>Para Hesaplayıcı</strong><small>Kurumsal Widget</small></span></Link><nav><Link href="/creator-pro">Creator Pro</Link><Link href="/hesaplama-araclari">Araçlar</Link></nav></header><WidgetConfigurator /><footer><Link href="/">Para Hesaplayıcı</Link><span>Finansal hesaplama altyapısını markanıza taşıyın.</span></footer></main>; }
