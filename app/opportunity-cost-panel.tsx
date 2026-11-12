"use client";

import DecisionEvidence from "./decision-evidence";

import { FormEvent, useEffect, useRef, useState } from "react";
import { appendCampaignAttribution, trackAnalyticsEvent, trackCampaignEvent } from "./analytics";

export type OpportunityCostInput = {
  purchaseName: string;
  amount: number;
  purchaseDate: string;
  currentValue: number | null;
};

export type OpportunityAlternative = {
  code: string;
  label: string;
  targetValue: number;
  changePercent: number;
  isPortfolio?: boolean;
};

export type OpportunityCostResult = OpportunityCostInput & {
  targetDate: string;
  alternatives: OpportunityAlternative[];
  unavailableLabels: string[];
};

const opportunityPresets: Array<OpportunityCostInput & { emoji: string }> = [
  { emoji: "📱", purchaseName: "Telefon", amount: 15000, purchaseDate: "2021-09-01", currentValue: 5000 },
  { emoji: "🚗", purchaseName: "Araba", amount: 180000, purchaseDate: "2020-06-15", currentValue: null },
  { emoji: "💍", purchaseName: "Düğün", amount: 100000, purchaseDate: "2020-08-01", currentValue: null },
  { emoji: "✈️", purchaseName: "Tatil", amount: 30000, purchaseDate: "2022-07-01", currentValue: null },
  { emoji: "☕", purchaseName: "Kahve harcamaları", amount: 5000, purchaseDate: "2021-01-04", currentValue: null },
];

const money = (value: number) => new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
}).format(value);

const number = (value: number, digits = 1) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: digits }).format(value);

const date = (value: string) => new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date(`${value}T12:00:00Z`));

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

async function renderOpportunityCard(result: OpportunityCostResult) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Görsel oluşturulamadı.");

  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#0c2d22");
  gradient.addColorStop(.58, "#115c45");
  gradient.addColorStop(1, "#91af57");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1350);
  roundedRect(context, 58, 54, 964, 1242, 34);
  context.fillStyle = "#f8f8f2";
  context.fill();

  context.fillStyle = "#0f7755";
  roundedRect(context, 112, 108, 50, 50, 14);
  context.fill();
  context.fillStyle = "white";
  context.font = "700 29px Arial";
  context.textAlign = "center";
  context.fillText("₺", 137, 143);
  context.textAlign = "left";
  context.fillStyle = "#10271f";
  context.font = "700 26px Arial";
  context.fillText("Para Hesaplayıcı", 180, 137);
  context.fillStyle = "#6b7c74";
  context.font = "700 12px Arial";
  context.fillText("HARCAMANIN FIRSAT MALİYETİ", 180, 157);

  context.fillStyle = "#0f7755";
  context.font = "700 14px Arial";
  context.fillText(`${date(result.purchaseDate)} → ${date(result.targetDate)}`, 112, 225);
  context.fillStyle = "#10271f";
  context.font = "700 51px Georgia";
  context.fillText(`“${result.purchaseName}” yerine`, 112, 292);
  context.fillText("yatırım yapsaydım?", 112, 352);

  roundedRect(context, 112, 395, 856, 118, 18);
  context.fillStyle = "#10271f";
  context.fill();
  context.fillStyle = "#9fb0a8";
  context.font = "700 12px Arial";
  context.fillText("HARCANAN TUTAR", 138, 431);
  context.fillStyle = "white";
  context.font = "700 42px Georgia";
  context.fillText(money(result.amount), 138, 484);
  if (result.currentValue !== null) {
    context.textAlign = "right";
    context.fillStyle = "#9fb0a8";
    context.font = "700 12px Arial";
    context.fillText("BUGÜNKÜ TAHMİNİ DEĞER", 940, 431);
    context.fillStyle = "#b9df73";
    context.font = "700 29px Arial";
    context.fillText(money(result.currentValue), 940, 479);
    context.textAlign = "left";
  }

  context.fillStyle = "#6b7c74";
  context.font = "700 12px Arial";
  context.fillText("AYNI PARA NEREYE ULAŞIRDI?", 112, 566);
  const visible = result.alternatives.slice(0, 7);
  const maxValue = Math.max(...visible.map((item) => item.targetValue), result.amount);
  let y = 594;
  visible.forEach((item, index) => {
    const height = 76;
    roundedRect(context, 112, y, 856, height, 13);
    context.fillStyle = item.isPortfolio ? "#e8f2dd" : index === 0 ? "#eef4e9" : "#ffffff";
    context.fill();
    context.strokeStyle = item.isPortfolio ? "#9ab77c" : "#e0e5dd";
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = "#10271f";
    context.font = "700 17px Arial";
    context.fillText(`${index + 1}. ${item.label}`, 136, y + 31);
    context.fillStyle = item.changePercent >= 0 ? "#0f7755" : "#a4492c";
    context.font = "700 12px Arial";
    context.fillText(`${item.changePercent >= 0 ? "+" : ""}%${number(item.changePercent)}`, 136, y + 54);
    context.textAlign = "right";
    context.fillStyle = "#10271f";
    context.font = "700 23px Georgia";
    context.fillText(money(item.targetValue), 938, y + 42);
    context.textAlign = "left";
    const barWidth = Math.max(8, 420 * item.targetValue / maxValue);
    context.fillStyle = item.isPortfolio ? "#78a84f" : "#0f7755";
    context.fillRect(500, y + 58, barWidth, 5);
    y += 86;
  });

  context.fillStyle = "#0f7755";
  context.font = "700 15px Arial";
  context.fillText("para-hesaplayici.utkanyilmaz.chatgpt.site", 112, 1248);
  context.textAlign = "right";
  context.fillStyle = "#819087";
  context.font = "400 10px Arial";
  context.fillText("Geçmiş sonuç yatırım tavsiyesi değildir.", 968, 1248);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("PNG oluşturulamadı.")),
    "image/png",
    1,
  ));
}

function download(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "harcamanin-firsat-maliyeti.png";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function OpportunityCostPanel({ defaultAmount, defaultDate, maxDate, onCalculate }: {
  defaultAmount: number;
  defaultDate: string;
  maxDate: string;
  onCalculate: (input: OpportunityCostInput) => Promise<OpportunityCostResult>;
}) {
  const calculateRef = useRef(onCalculate);
  const purchaseInputRef = useRef<HTMLInputElement>(null);
  const [purchaseName, setPurchaseName] = useState("Telefon");
  const [amount, setAmount] = useState(String(Math.round(defaultAmount)));
  const [purchaseDate, setPurchaseDate] = useState(defaultDate);
  const [currentValue, setCurrentValue] = useState("");
  const [result, setResult] = useState<OpportunityCostResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "image" | "downloaded" | "shared" | "copied" | "fallback" | "error">("idle");

  useEffect(() => {
    calculateRef.current = onCalculate;
  }, [onCalculate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tool") !== "opportunity") return;

    const sharedName = params.get("purchase")?.trim() ?? "";
    const sharedAmount = Number(params.get("opportunityAmount"));
    const sharedDate = params.get("opportunityDate") ?? "";
    const currentParam = params.get("currentValue");
    const sharedCurrentValue = currentParam === null ? null : Number(currentParam);
    if (
      !sharedName || sharedName.length > 40 || !Number.isFinite(sharedAmount) || sharedAmount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(sharedDate) || sharedDate >= maxDate ||
      (sharedCurrentValue !== null && (!Number.isFinite(sharedCurrentValue) || sharedCurrentValue < 0))
    ) return;

    const loadTimer = window.setTimeout(() => {
      setPurchaseName(sharedName);
      setAmount(String(sharedAmount));
      setPurchaseDate(sharedDate);
      setCurrentValue(sharedCurrentValue === null ? "" : String(sharedCurrentValue));
      setStatus("loading");
      void calculateRef.current({ purchaseName: sharedName, amount: sharedAmount, purchaseDate: sharedDate, currentValue: sharedCurrentValue })
        .then((next) => {
          setResult(next);
          setStatus("ready");
          trackAnalyticsEvent("opportunity_completed", "shared_opportunity", "shared_link");
          trackAnalyticsEvent("shared_link_converted", "opportunity", "shared_link");
          trackCampaignEvent("campaign_completed");
        })
        .catch((caught) => { setError(caught instanceof Error ? caught.message : "Paylaşılan fırsat maliyeti hesaplanamadı."); setStatus("error"); });
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [maxDate]);

  function createOpportunityUrl(activeResult: OpportunityCostResult) {
    const url = new URL("https://para-hesaplayici.utkanyilmaz.chatgpt.site/sonuc");
    url.search = new URLSearchParams({
      tool: "opportunity",
      purchase: activeResult.purchaseName,
      opportunityAmount: String(activeResult.amount),
      opportunityDate: activeResult.purchaseDate,
      winner: activeResult.alternatives[0]?.label ?? "Yatırım",
      resultValue: String(activeResult.alternatives[0]?.targetValue ?? activeResult.amount),
      ...(activeResult.currentValue === null ? {} : { currentValue: String(activeResult.currentValue) }),
    }).toString();
    return appendCampaignAttribution(url).toString();
  }

  function shareCopy(activeResult: OpportunityCostResult) {
    const winner = activeResult.alternatives[0];
    return `${date(activeResult.purchaseDate)} tarihinde ${money(activeResult.amount)} ödediğim “${activeResult.purchaseName}” yerine ${winner?.label ?? "alternatif birikim"} olsaydı bugün ${winner ? money(winner.targetValue) : "ne olurdu"}? Kendi Keşke Hesabını oluştur:`;
  }

  async function loadPreset(preset: OpportunityCostInput) {
    setPurchaseName(preset.purchaseName);
    setAmount(String(preset.amount));
    setPurchaseDate(preset.purchaseDate);
    setCurrentValue(preset.currentValue === null ? "" : String(preset.currentValue));
    setError("");
    setResult(null);
    setStatus("loading");
    trackAnalyticsEvent("calculation_started", "opportunity", "preset");
    try {
      const next = await calculateRef.current(preset);
      setResult(next);
      setStatus("ready");
      trackAnalyticsEvent("opportunity_completed", "preset", "preset");
    } catch (caught) {
      trackAnalyticsEvent("calculation_failed", "opportunity", "preset");
      setError(caught instanceof Error ? caught.message : "Hazır Keşke Hesabı hesaplanamadı.");
      setStatus("error");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    const numericCurrentValue = currentValue.trim() === "" ? null : Number(currentValue);
    if (!purchaseName.trim()) return setError("Harcamanıza kısa bir ad verin.");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setError("Geçerli bir harcama tutarı girin.");
    if (!purchaseDate || purchaseDate >= maxDate) return setError("Harcama tarihi hedef tarihten önce olmalıdır.");
    if (numericCurrentValue !== null && (!Number.isFinite(numericCurrentValue) || numericCurrentValue < 0)) return setError("Bugünkü tahmini değer sıfır veya daha büyük olmalıdır.");

    setError("");
    setStatus("loading");
    setResult(null);
    trackAnalyticsEvent("calculation_started", "opportunity", "direct");
    try {
      const next = await onCalculate({ purchaseName: purchaseName.trim(), amount: numericAmount, purchaseDate, currentValue: numericCurrentValue });
      setResult(next);
      setStatus("ready");
      trackAnalyticsEvent("opportunity_completed", "custom", "direct");
    } catch (caught) {
      trackAnalyticsEvent("calculation_failed", "opportunity", "direct");
      setError(caught instanceof Error ? caught.message : "Fırsat maliyeti hesaplanamadı.");
      setStatus("error");
    }
  }

  async function handleImage(share: boolean) {
    if (!result) return;
    try {
      setStatus("image");
      const blob = await renderOpportunityCard(result);
      if (share) {
        trackAnalyticsEvent("share_started", "opportunity_image", "native");
        trackCampaignEvent("campaign_shared");
        const liveUrl = createOpportunityUrl(result);
        const file = new File([blob], "harcamanin-firsat-maliyeti.png", { type: "image/png" });
        const shareData = { title: "Harcamanın fırsat maliyeti", text: `${shareCopy(result)} ${liveUrl}`, url: liveUrl, files: [file] };
        if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
          await navigator.share(shareData);
          setStatus("shared");
        } else {
          download(blob);
          setStatus("fallback");
        }
      } else {
        download(blob);
        setStatus("downloaded");
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return setStatus("ready");
      setStatus("error");
    }
  }

  async function copyOpportunityLink() {
    if (!result) return;
    try {
      trackAnalyticsEvent("share_started", "opportunity_link", "copy");
      trackCampaignEvent("campaign_shared");
      await navigator.clipboard.writeText(createOpportunityUrl(result));
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  function shareTo(network: "whatsapp" | "x") {
    if (!result) return;
    trackAnalyticsEvent("share_started", "opportunity_link", network);
    trackCampaignEvent("campaign_shared");
    const message = `${shareCopy(result)} ${createOpportunityUrl(result)}`;
    const target = network === "whatsapp"
      ? `https://wa.me/?text=${encodeURIComponent(message)}`
      : `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function askFriend() {
    if (!result) return;
    trackAnalyticsEvent("share_started", "opportunity_poll", "whatsapp");
    trackCampaignEvent("campaign_shared");
    const winner = result.alternatives[0];
    const message = `${date(result.purchaseDate)} tarihinde ${money(result.amount)} ödediğim “${result.purchaseName}” bugün en iyi tarihsel alternatifte ${winner ? money(winner.targetValue) : "farklı bir değere"} ulaşacaktı. Sence değer miydi? 👀 ${createOpportunityUrl(result)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function startOwnOpportunity() {
    setResult(null);
    setStatus("idle");
    setError("");
    window.history.replaceState(null, "", window.location.pathname);
    window.requestAnimationFrame(() => purchaseInputRef.current?.focus());
  }

  const comparisonBase = result?.currentValue ?? result?.amount ?? 0;

  return (
    <section className="opportunity-panel" aria-labelledby="opportunity-title">
      <div className="opportunity-header">
        <div className="section-heading">
          <span className="step-number">06</span>
          <div>
            <h2 id="opportunity-title">Harcamanın fırsat maliyeti</h2>
            <p>Geçmişteki bir harcamanız yatırımda değerlendirilseydi bugüne en yakın veride ne olurdu?</p>
          </div>
        </div>
        <span className="opportunity-badge">Geçmişe dönük karşılaştırma</span>
      </div>

      <div className="opportunity-presets" aria-label="Hazır Keşke Hesapları">
        <div><strong>Bir hikâyeyle başla</strong><span>Hazır örneği seç; tutarı ve tarihi sonra değiştirebilirsin.</span></div>
        <div className="opportunity-preset-list">
          {opportunityPresets.filter((preset) => preset.purchaseDate < maxDate).map((preset) => (
            <button disabled={status === "loading"} key={preset.purchaseName} onClick={() => void loadPreset(preset)} type="button">
              <span aria-hidden="true">{preset.emoji}</span>{preset.purchaseName}
            </button>
          ))}
        </div>
      </div>

      <form className="opportunity-form" onSubmit={handleSubmit}>
        <label><span>Ne satın aldınız?</span><input maxLength={40} onChange={(event) => setPurchaseName(event.target.value)} placeholder="Örn. Telefon" ref={purchaseInputRef} value={purchaseName} /></label>
        <label><span>Ödediğiniz tutar</span><div className="opportunity-money-input"><input inputMode="decimal" min="1" onChange={(event) => setAmount(event.target.value)} step="1" type="number" value={amount} /><b>₺</b></div></label>
        <label><span>Harcama tarihi</span><input max={maxDate} min="2005-01-03" onChange={(event) => setPurchaseDate(event.target.value)} type="date" value={purchaseDate} /></label>
        <label><span>Bugünkü tahmini değeri <small>İsteğe bağlı</small></span><div className="opportunity-money-input"><input inputMode="decimal" min="0" onChange={(event) => setCurrentValue(event.target.value)} placeholder="Örn. 5.000" step="1" type="number" value={currentValue} /><b>₺</b></div></label>
        <button disabled={status === "loading"} type="submit">{status === "loading" ? "Geçmiş veriler hesaplanıyor…" : "Kaçırılan ihtimalleri hesapla"}</button>
      </form>

      {error && <p className="opportunity-error" role="alert">{error}</p>}

      {result && <div className="opportunity-result">
        <div className="opportunity-verdict">
          <span>{date(result.purchaseDate)} tarihinde {money(result.amount)}</span>
          <h3>{result.alternatives[0] ? <>En güçlü alternatif bugün <em>{money(result.alternatives[0].targetValue)}</em> olacaktı.</> : <>“{result.purchaseName}” yerine ne olabilirdi?</>}</h3>
          {result.alternatives[0] && <strong className="opportunity-winner">{result.alternatives[0].label} · %{number(Math.abs(result.alternatives[0].changePercent))} {result.alternatives[0].changePercent >= 0 ? "artış" : "azalış"}</strong>}
          <p>Sonuçlar {date(result.targetDate)} tarihine en yakın yayımlanmış verilerle hesaplandı.</p>
        </div>
        <div className="opportunity-ranking">
          {result.alternatives.map((item, position) => {
            const difference = item.targetValue - comparisonBase;
            return <article className={item.isPortfolio ? "portfolio" : ""} key={item.code}>
              <span className="opportunity-rank">#{position + 1}</span>
              <div><strong>{item.label}</strong><small>{item.isPortfolio ? "Sizin oluşturduğunuz dağılım" : `%${number(Math.abs(item.changePercent))} ${item.changePercent >= 0 ? "artış" : "azalış"}`}</small></div>
              <div className="opportunity-value"><strong>{money(item.targetValue)}</strong><small className={difference >= 0 ? "positive" : "negative"}>{difference >= 0 ? "+" : "−"}{money(Math.abs(difference))} {result.currentValue !== null ? "ürüne göre" : "harcamaya göre"}</small></div>
            </article>;
          })}
          {result.currentValue !== null && <article className="product-row"><span className="opportunity-rank">—</span><div><strong>{result.purchaseName}</strong><small>Girdiğiniz bugünkü tahmini değer</small></div><div className="opportunity-value"><strong>{money(result.currentValue)}</strong><small>Mevcut ürün</small></div></article>}
        </div>
        {result.unavailableLabels.length > 0 && <p className="opportunity-note">Bu tarih için hesaplanamayanlar: {result.unavailableLabels.join(", ")}.</p>}
        <DecisionEvidence source="Para Hesaplayıcı’nın tarihsel gösterge serileri ve girdiğiniz harcama tutarı." period={`${date(result.purchaseDate)} → ${date(result.targetDate)} (hedef tarih)`} method="Her alternatif için harcama tutarı, göstergenin iki tarih arasındaki değer değişimiyle çarpılır." assumptions="Sonuçlar nominal TL cinsindendir. Ürün değeri girilirse bugünkü tahmininiz, boş bırakılırsa ilk harcama tutarı karşılaştırma tabanıdır. Tarihsel getiri gelecekteki getiriyi göstermez." /><div className="opportunity-share-actions">
          <button onClick={copyOpportunityLink} type="button">Canlı bağlantıyı kopyala</button>
          <button onClick={() => shareTo("whatsapp")} type="button">WhatsApp&apos;ta paylaş</button>
          <button onClick={() => shareTo("x")} type="button">X&apos;te paylaş</button>
          <button className="ask-friend" onClick={askFriend} type="button">Arkadaşına sor: Değer miydi? 👀</button>
          <button disabled={status === "image"} onClick={() => handleImage(false)} type="button">{status === "image" ? "Görsel hazırlanıyor…" : "Sonuç kartını indir"}</button>
          <button className="primary" disabled={status === "image"} onClick={() => handleImage(true)} type="button">Görseli paylaş</button>
          <button className="opportunity-own-cta" onClick={startOwnOpportunity} type="button">Benim Keşke Hesabımı oluştur <span aria-hidden="true">→</span></button>
        </div>
        <p className="opportunity-share-status" aria-live="polite">
          {status === "downloaded" && "Fırsat maliyeti kartı indirildi."}
          {status === "shared" && "Görsel paylaşımı tamamlandı."}
          {status === "copied" && "Canlı Keşke Hesabı bağlantısı kopyalandı."}
          {status === "fallback" && "Doğrudan paylaşım desteklenmediği için görsel indirildi."}
          {(status === "ready" || status === "image") && "Kart Instagram için 1080×1350 PNG olarak hazırlanır."}
        </p>
      </div>}

      {!result && status !== "loading" && <div className="opportunity-empty"><strong>Bir harcama seçin, alternatif geçmişini görün.</strong><p>Bu hesap “şunu satın almasaydınız kesin kazanırdınız” demez; aynı para için gerçekleşmiş tarihsel karşılıkları gösterir.</p></div>}
      <p className="opportunity-method">Alış-satış maliyetleri, vergi ve ürünün kullanım faydası hesaba katılmaz. Sonuçlar geçmiş fiyat hareketidir; geleceğe yönelik öneri değildir.</p>
    </section>
  );
}
