export type LivingCoverage = {
  startMonths: number;
  targetMonths: number;
  monthDifference: number;
  expenseChangePercent: number;
  coverageChangePercent: number;
  requiredTargetValue: number;
  surplus: number;
  nominalNetChangePercent: number;
  outcome: "gained" | "lost" | "unchanged";
};

export function calculateLivingCoverage({
  startingValue,
  netTargetValue,
  startMonthlyExpense,
  targetMonthlyExpense,
}: {
  startingValue: number;
  netTargetValue: number;
  startMonthlyExpense: number;
  targetMonthlyExpense: number;
}): LivingCoverage {
  const values = [startingValue, netTargetValue, startMonthlyExpense, targetMonthlyExpense];
  if (values.some((value) => !Number.isFinite(value)) || startingValue <= 0 ||
    netTargetValue < 0 || startMonthlyExpense <= 0 || targetMonthlyExpense <= 0) {
    throw new Error("Yaşam payı hesaplanamadı: geçerli tutarlar ve sıfırdan büyük aylık giderler gerekli.");
  }

  const startMonths = startingValue / startMonthlyExpense;
  const targetMonths = netTargetValue / targetMonthlyExpense;
  const monthDifference = targetMonths - startMonths;
  const requiredTargetValue = startMonths * targetMonthlyExpense;
  const surplus = netTargetValue - requiredTargetValue;
  const expenseChangePercent = (targetMonthlyExpense / startMonthlyExpense - 1) * 100;
  const coverageChangePercent = (targetMonths / startMonths - 1) * 100;
  const nominalNetChangePercent = (netTargetValue / startingValue - 1) * 100;
  if ([startMonths, targetMonths, monthDifference, requiredTargetValue, surplus,
    expenseChangePercent, coverageChangePercent, nominalNetChangePercent].some((value) => !Number.isFinite(value))) {
    throw new Error("Yaşam payı hesaplanamadı: tutarlar hesaplama aralığını aşıyor.");
  }

  return {
    startMonths,
    targetMonths,
    monthDifference,
    requiredTargetValue,
    surplus,
    expenseChangePercent,
    coverageChangePercent,
    nominalNetChangePercent,
    outcome: coverageChangePercent > 1e-8 ? "gained" : coverageChangePercent < -1e-8 ? "lost" : "unchanged",
  };
}

export type LivingCoverageState =
  | { status: "empty" | "incomplete" }
  | { status: "error"; message: string }
  | { status: "ready"; result: LivingCoverage };

export function readLivingCoverage({ startExpenseInput, targetExpenseInput, ...amounts }: {
  startExpenseInput: string;
  targetExpenseInput: string;
  startingValue: number;
  netTargetValue: number;
}): LivingCoverageState {
  const start = startExpenseInput.trim();
  const target = targetExpenseInput.trim();
  if (!start && !target) return { status: "empty" };
  if ([start, target].some((value) => value && (!Number.isFinite(Number(value)) || Number(value) <= 0))) {
    return { status: "error", message: "Aylık giderleri sıfırdan büyük ve geçerli TL tutarları olarak girin." };
  }
  if (!start || !target) return { status: "incomplete" };
  try {
    return { status: "ready", result: calculateLivingCoverage({
      ...amounts, startMonthlyExpense: Number(start), targetMonthlyExpense: Number(target),
    }) };
  } catch {
    return { status: "error", message: "Bu tutarlarla sonuç hesaplanamadı. Gider ve yatırım tutarlarını kontrol edin." };
  }
}

export type LivingAlternativeInput = { code: string; label: string; netTargetValue: number | null };
export type LivingAlternativeRow = {
  code: string;
  label: string;
  netTargetValue: number;
  targetMonths: number;
  monthDifference: number;
  differenceFromSelected: number;
  outcome: LivingCoverage["outcome"];
  isSelected: boolean;
  isCash: boolean;
};
export type LivingAlternatives = {
  rows: LivingAlternativeRow[];
  unavailableLabels: string[];
  startMonths: number;
  scaleMaxMonths: number;
  selectedLabel: string;
};

export const LIVING_ALTERNATIVES_METHOD = "Aynı başlangıç TL tutarı, aynı tarih aralığı ve aynı beyan edilen aylık gider karşılaştırılır. Yatırım seçeneklerinin brüt sonucuna Maliyet gerçeği bölümündeki ortak yüzdeler bir kez uygulanır; bunlar her ürünün gerçek masrafı değildir. Nakit TL sabit kalır; faiz ve yatırım maliyeti uygulanmaz. TÜFE ayrıca düşülmez. Sıralama yalnız bu geçmiş dönemin gider karşılığıdır; risk sıralaması, gelecek tahmini veya yatırım önerisi değildir.";

export function compareLivingAlternatives({
  startingValue, startMonthlyExpense, targetMonthlyExpense, selected, alternatives,
}: {
  startingValue: number;
  startMonthlyExpense: number;
  targetMonthlyExpense: number;
  selected: LivingAlternativeInput & { netTargetValue: number };
  alternatives: readonly LivingAlternativeInput[];
}): LivingAlternatives {
  const amounts = { startingValue, startMonthlyExpense, targetMonthlyExpense };
  const selectedCoverage = calculateLivingCoverage({ ...amounts, netTargetValue: selected.netTargetValue });
  if (!selected.code || selected.code === "CASH") throw new Error("Geçerli bir yatırım seçimi gerekli.");
  const rows: LivingAlternativeRow[] = [];
  const unavailableLabels: string[] = [];
  const seen = new Set<string>();
  // The current calculation is authoritative, including while comparisons load.
  const inputs = [selected, ...alternatives.filter((item) => item.code !== "CASH"),
    { code: "CASH", label: "Nakit TL", netTargetValue: startingValue }];
  for (const input of inputs) {
    if (seen.has(input.code)) continue;
    seen.add(input.code);
    try {
      if (input.netTargetValue === null) throw new Error("Veri yok");
      const coverage = calculateLivingCoverage({ ...amounts, netTargetValue: input.netTargetValue });
      rows.push({
        code: input.code,
        label: input.label,
        netTargetValue: input.netTargetValue,
        targetMonths: coverage.targetMonths,
        monthDifference: coverage.monthDifference,
        differenceFromSelected: coverage.targetMonths - selectedCoverage.targetMonths,
        outcome: coverage.outcome,
        isSelected: input.code === selected.code,
        isCash: input.code === "CASH",
      });
    } catch {
      unavailableLabels.push(input.label);
    }
  }
  rows.sort((a, b) => b.targetMonths - a.targetMonths);
  return {
    rows, unavailableLabels,
    startMonths: selectedCoverage.startMonths,
    scaleMaxMonths: Math.max(selectedCoverage.startMonths, ...rows.map((row) => row.targetMonths)),
    selectedLabel: selected.label,
  };
}

export function livingAlternativesCsvRows(comparison: LivingAlternatives): (string | number)[][] {
  return [
    [],
    ["PARANIN ALTERNATİF HAYATLARI", ""],
    ["Yöntem", LIVING_ALTERNATIVES_METHOD],
    ["Başlangıç gider karşılığı (ay)", comparison.startMonths],
    ["Fark için seçilen ölçüt", comparison.selectedLabel],
    ["Ölçüt", "Senaryo", "Hedef TL (yatırımda masraf sonrası)", "Hedef gider karşılığı (ay)", "Başlangıca göre fark (ay)", "Seçilen ölçüte göre fark (ay)"],
    ...comparison.rows.map((row) => [row.label, row.isCash ? "Faizsiz ve masrafsız nakit" : row.isSelected ? "Seçilen yatırım · ortak maliyet" : "Alternatif yatırım · ortak maliyet", row.netTargetValue, row.targetMonths, row.monthDifference, row.differenceFromSelected]),
    ...(comparison.unavailableLabels.length ? [["Verisi bulunmayan veya hesaplanamayan seçenekler", comparison.unavailableLabels.join(", ")]] : []),
  ];
}
