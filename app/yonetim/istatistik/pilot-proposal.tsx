"use client";

import { useState, type FormEvent } from "react";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const numbers = new Intl.NumberFormat("tr-TR");
const pilotTools = { refinance: "Borç yapılandırma", salary: "Maaş alım gücü", deposit: "Mevduat getirisi" };

export default function PilotProposal({ company, website, requestedTool }: {
  company: string;
  website: string | null;
  requestedTool: string;
}) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");

  function build(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const tool = String(fields.get("tool"));
    const quota = Number(fields.get("quota"));
    const installation = Number(fields.get("installation"));
    const pilot = Number(fields.get("pilot"));
    const rawOrigin = String(fields.get("origin") ?? "").trim();
    let origin: URL;
    try {
      origin = new URL(rawOrigin);
      if (origin.protocol !== "https:" || origin.origin !== rawOrigin.replace(/\/$/, "") || origin.hostname.includes("*")) throw new Error();
    } catch {
      setStatus("Alan adını https://ornek.com biçiminde, sayfa yolu olmadan gir.");
      return;
    }
    if (!Object.hasOwn(pilotTools, tool) || !Number.isSafeInteger(quota) || quota < 1
      || !Number.isFinite(installation) || installation < 0 || !Number.isFinite(pilot) || pilot <= 0) {
      setStatus("Araç, kota ve ücret alanlarını kontrol et. Pilot bedeli sıfırdan büyük olmalı.");
      return;
    }

    setDraft(`Konu: ${company} için 30 günlük Para Hesaplayıcı widget pilotu

Merhaba,

${company} için 30 günlük ücretli pilot teklifimizi aşağıda paylaşıyoruz.

• Hesaplayıcı: ${pilotTools[tool as keyof typeof pilotTools]}
• Kurulum adresi: ${origin.origin}
• Kapsam: Bir hesaplayıcı, marka adı ve renk uyarlaması, iframe kurulum desteği ve dönem sonu kullanım özeti.
• Kota: UTC takvim ayı başına ${numbers.format(quota)} widget açılışı.
• Bir defalık kurulum bedeli: ${money.format(installation)}
• 30 günlük pilot bedeli: ${money.format(pilot)}
• Toplam teklif bedeli: ${money.format(installation + pilot)}

Başlangıç tarihini ve kurulumu yapacak teknik kişiyi birlikte netleştirebiliriz. Pilot sonunda açılış sayısını ve sonraki dönem için ihtiyaçlarınızı birlikte değerlendiririz.

İyi çalışmalar,
Para Hesaplayıcı`);
    setStatus("");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setStatus("Pilot teklifi kopyalandı.");
    } catch {
      setStatus("Teklifi aşağıdaki metin alanından seçip kopyalayabilirsin.");
    }
  }

  return (
    <details className="quote-draft">
      <summary>30 günlük pilot teklifi hazırla</summary>
      <form className="pilot-proposal-form" onSubmit={build} onChange={() => { setDraft(""); setStatus(""); }}>
        <label>Kurulum alanı<input name="origin" type="url" defaultValue={website ?? ""} placeholder="https://ornek.com" required /></label>
        <label>Hesaplayıcı<select name="tool" defaultValue={Object.hasOwn(pilotTools, requestedTool) ? requestedTool : "refinance"}>
          {Object.entries(pilotTools).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Aylık açılış kotası<input name="quota" type="number" min="1" max="1000000000" step="1" required /></label>
        <label>Kurulum bedeli (TL)<input name="installation" type="number" min="0" max="1000000000" step="0.01" required /></label>
        <label>30 günlük pilot bedeli (TL)<input name="pilot" type="number" min="0.01" max="1000000000" step="0.01" required /></label>
        <button type="submit">Teklif taslağını oluştur</button>
      </form>
      {draft && <><label>Teklif metni<textarea value={draft} rows={12} readOnly /></label><button type="button" onClick={() => void copy()}>Pilot teklifini kopyala</button></>}
      <p role="status">{status}</p>
      <h4>Kurulum sırası</h4>
      <ol>
        <li>Müşteriyle alan adını, fiyatı ve başlangıç tarihini doğrula.</li>
        <li>Lisansı tanımla ve iframe kodunu teknik kişiye ilet.</li>
        <li>Onaylı alanda widget’ı aç, ardından ilk açılışı kullanım raporunda doğrula.</li>
        <li>Pilot sonunda açılış özetini çıkar ve devam kapsamını görüş.</li>
      </ol>
    </details>
  );
}
