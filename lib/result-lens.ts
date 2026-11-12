export const RESULT_LENS_OPTIONS = [
  { id: "gross", label: "Brüt TL" },
  { id: "net", label: "Masraf sonrası" },
  { id: "real", label: "Alım gücü" },
] as const;

export type ResultLens = typeof RESULT_LENS_OPTIONS[number]["id"];
type LensBase = {
  label: string;
  valueLabel: string;
  priceBasis: "target" | "start";
  explanation: string;
};
export type ResultLensView = LensBase & (
  | { status: "ready"; value: number; changePercent: number; direction: "gain" | "loss" | "flat" }
  | { status: "loading" | "unavailable"; message: string }
);
export type ResultLenses = Record<ResultLens, ResultLensView>;

export function parseResultLens(value: unknown): ResultLens {
  return value === "net" || value === "real" ? value : "gross";
}

export function createResultLenses(input: {
  startingValue: number;
  grossTargetValue: number;
  netTargetValue: number | null;
  cpiMultiplier: number | null;
  cpiLoading: boolean;
}): ResultLenses {
  const build = (base: LensBase, value: number | null, message: string): ResultLensView => {
    const changePercent = value === null ? NaN : (value / input.startingValue - 1) * 100;
    if (!Number.isFinite(input.startingValue) || input.startingValue <= 0 || value === null ||
      !Number.isFinite(value) || value < 0 || !Number.isFinite(changePercent)) {
      return { ...base, status: "unavailable", message };
    }
    return {
      ...base, status: "ready", value, changePercent,
      // Match the displayed two-decimal percentage; avoid a green/red +0.00%.
      direction: Math.round(Math.abs(changePercent) * 100) === 0 ? "flat" : changePercent > 0 ? "gain" : "loss",
    };
  };
  const gross = build({
    label: "Brüt TL", valueLabel: "Hedef tarihteki brüt TL karşılığı", priceBasis: "target",
    explanation: "Seçilen ölçütün tarihsel değişimi uygulanır. Yatırım maliyetleri ve TÜFE düşülmemiştir.",
  }, input.grossTargetValue, "Brüt sonuç hesaplanamadı; tutarı ve tarihleri kontrol edin.");
  const net = build({
    label: "Masraf sonrası", valueLabel: "Hedef tarihte masraf sonrası TL", priceBasis: "target",
    explanation: "Maliyet gerçeği bölümündeki alış, satış ve yıllık giderler düşülmüştür. TÜFE, vergi ve sabit ücretler dahil değildir.",
  }, input.netTargetValue, "Masraf sonrası sonuç için Maliyet gerçeği bölümündeki yüzdeleri kontrol edin.");
  const realBase: LensBase = {
    label: "Alım gücü", valueLabel: "Başlangıç alım gücüyle net karşılık", priceBasis: "start",
    explanation: "Masraf sonrası tutar dönem TÜFE çarpanına bölünür. Bu, hedef tarihte eline geçecek nominal TL değil, başlangıç fiyat düzeyindeki karşılığıdır. Vergi ve sabit ücretler hariçtir.",
  };
  let real: ResultLensView;
  if (net.status !== "ready") {
    real = { ...realBase, status: "unavailable", message: net.message };
  } else if (input.cpiMultiplier !== null && Number.isFinite(input.cpiMultiplier) && input.cpiMultiplier > 0) {
    real = build(realBase, net.value / input.cpiMultiplier, "Alım gücü bu tutarlarla hesaplanamadı.");
  } else {
    real = { ...realBase, status: input.cpiLoading ? "loading" : "unavailable",
      message: input.cpiLoading ? "Alım gücü için dönem TÜFE verisi bekleniyor…" : "Bu dönem için TÜFE verisi alınamadı. Alım gücü yerine brüt sonuç gösterilmiyor." };
  }
  return { gross, net, real };
}

export function resultLensCsvRows(lenses: ResultLenses, selected: ResultLens): (string | number)[][] {
  const lens = lenses[selected];
  return [
    ["Ana kartta seçilen görünüm", lens.label],
    ["Ana kart fiyat düzeyi", lens.priceBasis === "start" ? "Başlangıç tarihi fiyat düzeyi" : "Hedef tarihi nominal TL"],
    ...(lens.status === "ready"
      ? [["Ana kart tutarı (TL)", lens.value], ["Ana kart değişimi (%)", lens.changePercent]]
      : [["Ana kart durumu", lens.message]]),
    ["Ana kart yöntemi", lens.explanation],
  ];
}
