"use client";

import { LIVING_ALTERNATIVES_METHOD, type LivingAlternatives, type LivingCoverageState } from "../lib/living-coverage";

type Props = {
  startDateLabel: string;
  targetDateLabel: string;
  startingValue: number;
  netTargetValue: number | null;
  startExpense: string;
  targetExpense: string;
  onExpenseChange: (field: "start" | "target", value: string) => void;
  state: LivingCoverageState;
  alternatives: LivingAlternatives | null;
  alternativesLoading: boolean;
};

const number = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value);
const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${number(Math.abs(value))}`;

export default function LivingCoveragePanel(props: Props) {
  const result = props.state.status === "ready" ? props.state.result : null;
  return (
    <section className="living-panel" aria-labelledby="living-title">
      <div className="living-header">
        <div className="section-heading">
          <span className="step-number" aria-hidden="true">↔</span>
          <div>
            <h2 id="living-title">Yaşam payı</h2>
            <p>Para kaç kat oldu değil, kaç aylık gideri karşılıyor?</p>
          </div>
        </div>
        <span className="living-badge">Senin giderin · senin ölçütün</span>
      </div>
      <p className="living-intro">İki tarihte de aynı kapsamı kullan: örneğin yalnız kira veya kira, market ve faturaların toplamı. Giderler senin beyanındır; otomatik fiyat tahmini yapılmaz.</p>
      <div className="living-inputs">
        {([
          { key: "start", date: props.startDateLabel, label: "Başlangıçtaki aylık giderin", value: props.startExpense },
          { key: "target", date: props.targetDateLabel, label: "Hedef tarihteki aylık giderin", value: props.targetExpense },
        ] as const).map((field) => (
          <label className="field" htmlFor={`living-${field.key}`} key={field.key}>
            <span>{field.label} (TL)</span>
            <input id={`living-${field.key}`} type="number" inputMode="decimal" min="0.01" step="0.01"
              placeholder="Aylık tutarı yaz"
              value={field.value} onChange={(event) => props.onExpenseChange(field.key, event.target.value)}
              aria-describedby="living-input-note" />
            <small>{field.date}</small>
          </label>
        ))}
      </div>
      <p id="living-input-note" className="living-note">Giderler bu sayfa oturumunda kalır; paylaşım bağlantısına veya kayıtlı hesaplamaya eklenmez. Rapor indirirsen CSV’ye dahil edilir. Tarih aralığı değişince yeniden girmen gerekir.</p>
      {props.netTargetValue === null ? (
        <p className="living-empty" role="status">Yaşam payı için önce Maliyet gerçeği bölümündeki geçersiz yüzdeleri düzelt.</p>
      ) : result ? (
        <div className={`living-result ${result.outcome}`} aria-live="polite">
          <div className="living-verdict">
            <span>Aylık gider karşılığı farkı</span>
            <strong>{signed(result.monthDifference)} ay</strong>
            <p>{result.outcome === "gained" ? "Gider karşılama gücün arttı." : result.outcome === "lost" ? "Gider karşılama gücün azaldı." : "Gider karşılama gücün korundu."}</p>
          </div>
          <div className="living-months">
            <article><span>Başlangıçta</span><strong>{number(result.startMonths)} ay</strong><small>{money(props.startingValue)} ÷ {money(Number(props.startExpense))} / ay</small></article>
            <article><span>Hedef tarihte · masraf sonrası</span><strong>{number(result.targetMonths)} ay</strong><small>{money(props.netTargetValue)} ÷ {money(Number(props.targetExpense))} / ay</small></article>
          </div>
          <dl className="living-details">
            <div><dt>Paranın net değişimi</dt><dd>{signed(result.nominalNetChangePercent)}%</dd></div>
            <div><dt>Beyan ettiğin gider değişimi</dt><dd>{signed(result.expenseChangePercent)}%</dd></div>
            <div><dt>Gider karşılama gücü değişimi</dt><dd>{signed(result.coverageChangePercent)}%</dd></div>
          </dl>
          <p className="living-threshold">Başlangıçtaki {number(result.startMonths)} aylık gider karşılığını korumak için hedefte {money(result.requiredTargetValue)} gerekirdi.
            {result.outcome === "unchanged" ? " Masraf sonrası sonuç bu tutarı karşılıyor." : ` Masraf sonrası sonuç bu tutarın ${money(Math.abs(result.surplus))} ${result.outcome === "gained" ? "üstünde" : "altında"}.`}
          </p>
          {result.nominalNetChangePercent > 0 && result.outcome === "lost" && <p className="living-paradox">TL tutarın büyüdü, fakat girdiğin aylık gider daha hızlı arttığı için daha az aylık gider karşılıyor.</p>}
        </div>
      ) : (
        <p className={`living-empty${props.state.status === "error" ? " error" : ""}`} role={props.state.status === "error" ? "alert" : "status"}>
          {props.state.status === "error" ? props.state.message : props.state.status === "incomplete" ? "Karşılaştırmak için diğer tarihin aylık giderini de gir." : "İki aylık giderini gir; para miktarını yaşamındaki karşılığıyla okuyalım."}
        </p>
      )}
      {result && props.alternatives && (
        <details className="living-alternatives" aria-busy={props.alternativesLoading}>
          <summary>
            <span><strong>Paranın alternatif hayatları</strong><small>Aynı para, farklı seçeneklerde kaç aylık gideri karşılardı?</small></span>
            <span className="living-alternatives-count">{props.alternativesLoading ? "Yükleniyor" : `${props.alternatives.rows.length} seçenek`}</span>
          </summary>
          {props.alternativesLoading ? <p className="living-note" role="status">Aynı dönemin diğer yatırım sonuçları bekleniyor…</p> : (
            <div className="living-alternatives-content">
              <p className="living-note">Yatırımlara ortak maliyet varsayımı uygulanır; nakit TL sabit kalır. Kesikli çizgi, başlangıçtaki {number(props.alternatives.startMonths)} aylık gider karşılığını gösterir.</p>
              <div className="living-alternatives-axis" aria-hidden="true"><span>0 ay</span><span>{number(props.alternatives.scaleMaxMonths)} ay</span></div>
              <ul className="living-alternatives-list">
                {props.alternatives.rows.map((row) => (
                  <li key={row.code} className={`${row.isSelected ? "selected" : ""} ${row.isCash ? "cash" : ""}`}>
                    <div className="living-alternative-heading">
                      <span><strong>{row.label}</strong>{row.isSelected && <em>Seçimin</em>}{row.isCash && <em>Faizsiz · masrafsız</em>}</span>
                      <strong>{number(row.targetMonths)} ay</strong>
                    </div>
                    <div className="living-alternative-track" aria-hidden="true">
                      <span style={{ width: `${row.targetMonths / props.alternatives!.scaleMaxMonths * 100}%` }} />
                      <i style={{ left: `${props.alternatives!.startMonths / props.alternatives!.scaleMaxMonths * 100}%` }} />
                    </div>
                    <div className="living-alternative-caption">
                      <span>{money(row.netTargetValue)}{row.isCash ? " · sabit TL" : " · masraf sonrası"}</span>
                      <span>Başlangıca göre {signed(row.monthDifference)} ay</span>
                    </div>
                    {!row.isSelected && <p className="living-alternative-difference">{props.alternatives!.selectedLabel} seçimine göre {signed(row.differenceFromSelected)} ay</p>}
                  </li>
                ))}
              </ul>
              {props.alternatives.unavailableLabels.length > 0 && <p className="living-alternatives-missing" role="status">Bu dönemde verisi bulunmayan veya hesaplanamayan seçenekler: {props.alternatives.unavailableLabels.join(", ")}. Sıralamaya alınmadılar.</p>}
              <p className="living-method">{LIVING_ALTERNATIVES_METHOD}</p>
            </div>
          )}
        </details>
      )}
      <p className="living-method">Ay karşılığı = o tarihteki para ÷ o tarihteki aylık gider. Bu iki tarihli bir karşılaştırmadır; gelecekte kaç ay geçinebileceğini tahmin etmez, dönem boyunca gider çekilişi simüle etmez. Gider kapsamındaki değişiklikler sonucu etkiler. Resmî veya kişisel TÜFE hesabı değildir; TÜFE ayrıca uygulanmaz. Yalnız yukarıdaki yüzdesel maliyetler dahil, vergi ve sabit ücretler hariçtir.</p>
    </section>
  );
}
