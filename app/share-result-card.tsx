"use client";

import { useState } from "react";
import { trackAnalyticsEvent } from "./analytics";

type ShareFormat = "instagram" | "whatsapp" | "x";

export type ShareCardHolding = {
  label: string;
  weightPercent: number;
};

export type ShareCardData = {
  startDate: string;
  targetDate: string;
  indexLabel: string;
  startingValue: number;
  targetValue: number;
  realValue: number | null;
  maxDrawdownPercent: number | null;
  portfolioHoldings: ShareCardHolding[];
  url: string;
};

const FORMATS: { id: ShareFormat; label: string; detail: string; width: number; height: number }[] = [
  { id: "instagram", label: "Instagram", detail: "4:5", width: 1080, height: 1350 },
  { id: "whatsapp", label: "WhatsApp", detail: "1:1", width: 1080, height: 1080 },
  { id: "x", label: "X", detail: "16:9", width: 1200, height: 675 },
];

const money = (value: number) => new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
}).format(value);

const date = (value: string) => new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date(`${value}T12:00:00Z`));

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number, minSize: number, family: string) {
  let size = startSize;
  while (size > minSize) {
    context.font = `700 ${size}px ${family}`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

async function renderCard(data: ShareCardData, format: typeof FORMATS[number]) {
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Görsel oluşturulamadı.");

  const scale = format.width / 1080;
  const p = (value: number) => value * scale;
  const isWide = format.id === "x";
  const background = context.createLinearGradient(0, 0, format.width, format.height);
  background.addColorStop(0, "#0c2d22");
  background.addColorStop(0.58, "#115c45");
  background.addColorStop(1, "#8aab4f");
  context.fillStyle = background;
  context.fillRect(0, 0, format.width, format.height);

  context.fillStyle = "rgba(185,223,115,.16)";
  context.beginPath();
  context.arc(format.width * .91, format.height * .08, p(190), 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255,255,255,.055)";
  context.beginPath();
  context.arc(format.width * .06, format.height * .92, p(260), 0, Math.PI * 2);
  context.fill();

  const margin = p(isWide ? 48 : 58);
  const panelX = margin;
  const panelY = p(isWide ? 42 : 54);
  const panelWidth = format.width - margin * 2;
  const panelHeight = format.height - panelY * 2;
  roundedRect(context, panelX, panelY, panelWidth, panelHeight, p(32));
  context.fillStyle = "#f8f8f2";
  context.fill();

  const contentX = panelX + p(isWide ? 42 : 54);
  const contentWidth = panelWidth - p(isWide ? 84 : 108);
  let y = panelY + p(isWide ? 42 : 54);

  context.fillStyle = "#0f7755";
  roundedRect(context, contentX, y, p(46), p(46), p(13));
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = `700 ${p(27)}px Arial, sans-serif`;
  context.textAlign = "center";
  context.fillText("₺", contentX + p(23), y + p(33));
  context.textAlign = "left";
  context.fillStyle = "#10271f";
  context.font = `700 ${p(24)}px Arial, sans-serif`;
  context.fillText("Para Hesaplayıcı", contentX + p(62), y + p(30));
  context.fillStyle = "#6b7c74";
  context.font = `700 ${p(12)}px Arial, sans-serif`;
  context.fillText("GEÇMİŞİN PARASINI BUGÜNÜN DİLİNE ÇEVİR", contentX + p(62), y + p(47));

  y += p(isWide ? 74 : 94);
  context.fillStyle = "#0f7755";
  context.font = `700 ${p(13)}px Arial, sans-serif`;
  context.fillText(`${data.indexLabel.toLocaleUpperCase("tr-TR")}  ·  ${date(data.startDate)} → ${date(data.targetDate)}`, contentX, y);
  y += p(isWide ? 36 : 52);
  context.fillStyle = "#10271f";
  const headline = "O günkü para bugün ne ederdi?";
  context.font = `700 ${p(isWide ? 38 : 48)}px Georgia, serif`;
  context.fillText(headline, contentX, y);

  y += p(isWide ? 30 : 54);
  const gap = p(16);
  const valueWidth = (contentWidth - gap) / 2;
  const valueHeight = p(isWide ? 104 : 142);
  const values = [
    { label: "BAŞLANGIÇ TUTARI", value: money(data.startingValue), dark: false },
    { label: "SONUÇ DEĞERİ", value: money(data.targetValue), dark: true },
  ];
  values.forEach((item, index) => {
    const x = contentX + index * (valueWidth + gap);
    roundedRect(context, x, y, valueWidth, valueHeight, p(18));
    context.fillStyle = item.dark ? "#10271f" : "#edf2e8";
    context.fill();
    context.fillStyle = item.dark ? "#aeca76" : "#65756d";
    context.font = `700 ${p(11)}px Arial, sans-serif`;
    context.fillText(item.label, x + p(20), y + p(29));
    context.fillStyle = item.dark ? "#ffffff" : "#10271f";
    const size = fitText(context, item.value, valueWidth - p(40), p(isWide ? 29 : 37), p(18), "Georgia, serif");
    context.font = `700 ${size}px Georgia, serif`;
    context.fillText(item.value, x + p(20), y + p(isWide ? 72 : 91));
  });

  y += valueHeight + p(isWide ? 16 : 22);
  const metricHeight = p(isWide ? 74 : 98);
  const metrics = [
    { label: "ENFLASYON SONRASI", value: data.realValue === null ? "Veri yok" : money(data.realValue) },
    { label: "EN BÜYÜK GEÇİCİ KAYIP", value: data.maxDrawdownPercent === null ? "Veri yok" : `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(data.maxDrawdownPercent)}` },
  ];
  metrics.forEach((item, index) => {
    const x = contentX + index * (valueWidth + gap);
    roundedRect(context, x, y, valueWidth, metricHeight, p(14));
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = "#dfe5dc";
    context.lineWidth = p(1);
    context.stroke();
    context.fillStyle = "#75847c";
    context.font = `700 ${p(10)}px Arial, sans-serif`;
    context.fillText(item.label, x + p(18), y + p(25));
    context.fillStyle = "#10271f";
    const size = fitText(context, item.value, valueWidth - p(36), p(isWide ? 20 : 25), p(15), "Arial, sans-serif");
    context.font = `700 ${size}px Arial, sans-serif`;
    context.fillText(item.value, x + p(18), y + p(isWide ? 55 : 65));
  });

  if (!isWide && data.portfolioHoldings.length > 0) {
    y += metricHeight + p(26);
    context.fillStyle = "#65756d";
    context.font = `700 ${p(11)}px Arial, sans-serif`;
    context.fillText("PORTFÖY DAĞILIMI", contentX, y);
    y += p(18);
    const colors = ["#0f7755", "#78a84f", "#d1a839", "#d46f45", "#7866b0", "#3e86a8"];
    let barX = contentX;
    data.portfolioHoldings.forEach((holding, index) => {
      const width = contentWidth * holding.weightPercent / 100;
      context.fillStyle = colors[index % colors.length];
      context.fillRect(barX, y, width, p(13));
      barX += width;
    });
    y += p(34);
    let legendX = contentX;
    data.portfolioHoldings.forEach((holding, index) => {
      const label = `${holding.label} %${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(holding.weightPercent)}`;
      context.font = `700 ${p(10)}px Arial, sans-serif`;
      const width = context.measureText(label).width + p(28);
      if (legendX + width > contentX + contentWidth) {
        legendX = contentX;
        y += p(25);
      }
      context.fillStyle = colors[index % colors.length];
      context.beginPath();
      context.arc(legendX + p(5), y - p(4), p(5), 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#52635b";
      context.fillText(label, legendX + p(15), y);
      legendX += width;
    });
  }

  const footerY = panelY + panelHeight - p(isWide ? 34 : 48);
  context.fillStyle = "#0f7755";
  context.font = `700 ${p(isWide ? 13 : 15)}px Arial, sans-serif`;
  context.fillText(data.url.replace(/^https?:\/\//, ""), contentX, footerY);
  context.textAlign = "right";
  context.fillStyle = "#819087";
  context.font = `400 ${p(10)}px Arial, sans-serif`;
  context.fillText("Geçmiş sonuç yatırım tavsiyesi değildir.", contentX + contentWidth, footerY);
  context.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG oluşturulamadı.")), "image/png", 1);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ShareResultCard({ data }: { data: ShareCardData }) {
  const [formatId, setFormatId] = useState<ShareFormat>("instagram");
  const [status, setStatus] = useState<"idle" | "working" | "downloaded" | "shared" | "copied" | "fallback" | "error">("idle");
  const format = FORMATS.find((item) => item.id === formatId)!;
  const changePercent = (data.targetValue / data.startingValue - 1) * 100;

  async function createBlob() {
    setStatus("working");
    return renderCard(data, format);
  }

  async function handleDownload() {
    try {
      const blob = await createBlob();
      downloadBlob(blob, `para-hesaplayici-${format.id}.png`);
      setStatus("downloaded");
    } catch {
      setStatus("error");
    }
  }

  async function handleShare() {
    try {
      trackAnalyticsEvent("share_started", `visual_${format.id}`, "native");
      const blob = await createBlob();
      const file = new File([blob], `para-hesaplayici-${format.id}.png`, { type: "image/png" });
      const shareData = {
        title: "Para Hesaplayıcı sonucum",
        text: `${data.indexLabel}: ${money(data.startingValue)} → ${money(data.targetValue)}\nKendi hesabını oluştur: ${data.url}`,
        url: data.url,
        files: [file],
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        setStatus("shared");
      } else {
        downloadBlob(blob, `para-hesaplayici-${format.id}.png`);
        setStatus("fallback");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
    }
  }

  async function handleCopyLink() {
    try {
      trackAnalyticsEvent("share_started", "visual_link", "copy");
      await navigator.clipboard.writeText(data.url);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="share-card-panel" aria-labelledby="visual-share-title">
      <div className="share-card-header">
        <div className="section-heading">
          <span className="step-number">05</span>
          <div>
            <h2 id="visual-share-title">Sonucunu görsel olarak paylaş</h2>
            <p>Hesaplamanızdan otomatik hazırlanan kartı indirin veya telefonunuzun paylaşım menüsüne gönderin.</p>
          </div>
        </div>
        <span className="share-card-badge">PNG · Yüksek çözünürlük</span>
      </div>

      <div className="share-card-workspace">
        <div className={`share-card-preview ${formatId}`} aria-label="Oluşturulacak paylaşım kartının önizlemesi">
          <div className="share-preview-brand"><b>₺</b><span><strong>Para Hesaplayıcı</strong><small>Geçmişin parasını bugünün diline çevir</small></span></div>
          <span className="share-preview-period">{data.indexLabel} · {date(data.startDate)} → {date(data.targetDate)}</span>
          <h3>O günkü para bugün ne ederdi?</h3>
          <div className="share-preview-values">
            <article><span>Başlangıç tutarı</span><strong>{money(data.startingValue)}</strong></article>
            <article><span>Sonuç değeri</span><strong>{money(data.targetValue)}</strong><small className={changePercent >= 0 ? "positive" : "negative"}>{changePercent >= 0 ? "+" : ""}%{new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(changePercent)}</small></article>
          </div>
          <div className="share-preview-metrics">
            <span><small>Enflasyon sonrası</small><strong>{data.realValue === null ? "Veri yok" : money(data.realValue)}</strong></span>
            <span><small>En büyük kayıp</small><strong>{data.maxDrawdownPercent === null ? "Veri yok" : `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(data.maxDrawdownPercent)}`}</strong></span>
          </div>
          {formatId !== "x" && data.portfolioHoldings.length > 0 && <div className="share-preview-portfolio"><small>Portföy dağılımı</small><p>{data.portfolioHoldings.map((item) => `${item.label} %${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(item.weightPercent)}`).join(" · ")}</p></div>}
          <footer><strong>{data.url.replace(/^https?:\/\//, "")}</strong><span>Yatırım tavsiyesi değildir.</span></footer>
        </div>

        <div className="share-card-controls">
          <div>
            <span className="share-control-label">Paylaşım biçimi</span>
            <div className="share-format-selector" role="radiogroup" aria-label="Paylaşım kartı biçimi">
              {FORMATS.map((item) => <label key={item.id}>
                <input checked={formatId === item.id} name="share-format" onChange={() => { setFormatId(item.id); setStatus("idle"); }} type="radio" value={item.id} />
                <span><strong>{item.label}</strong><small>{item.detail} · {item.width}×{item.height}</small></span>
              </label>)}
            </div>
          </div>
          <div className="share-card-actions">
            <button disabled={status === "working"} onClick={handleCopyLink} type="button">Canlı bağlantıyı kopyala</button>
            <button disabled={status === "working"} onClick={handleDownload} type="button">{status === "working" ? "Hazırlanıyor…" : "PNG indir"}</button>
            <button className="primary" disabled={status === "working"} onClick={handleShare} type="button">Görseli paylaş</button>
          </div>
          <p className="share-card-status" aria-live="polite">
            {status === "downloaded" && "Görsel indirildi. Seçtiğiniz uygulamaya yükleyebilirsiniz."}
            {status === "shared" && "Paylaşım tamamlandı."}
            {status === "copied" && "Canlı sonuç bağlantısı kopyalandı."}
            {status === "fallback" && "Bu tarayıcı görsel paylaşımını desteklemediği için PNG indirildi."}
            {status === "error" && "Görsel hazırlanamadı. Lütfen tekrar deneyin."}
            {(status === "idle" || status === "working") && "Mobil cihazlarda “Görseli paylaş” desteklenen uygulamaları doğrudan açar."}
          </p>
        </div>
      </div>
    </section>
  );
}
