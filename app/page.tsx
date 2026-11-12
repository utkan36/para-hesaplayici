"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { compareContributionTimingTotals, type ContributionTimingWinner } from "../lib/contribution-timing";
import { getTodayIso, getYesterdayIso, subtractYearsIso } from "../lib/dates";
import { calculateCostAdjustedGoal, calculateCostAndInflationOutcome, calculateCostRetentionFactor, calculateInvestmentCosts, calculatePurchasingPowerThreshold } from "../lib/investment-costs";
import { analyzeInvestmentTimingSensitivity, type InvestmentDelayOutcome, type TimingPosition, type TimingSensitivityLevel } from "../lib/investment-delay";
import { calculateHistoryRisk } from "../lib/history-risk";
import { compareLivingAlternatives, livingAlternativesCsvRows, readLivingCoverage, type LivingCoverageState } from "../lib/living-coverage";
import { createPeriodProfile } from "../lib/period-profile";
import { calculateBuyAndHoldPortfolio } from "../lib/portfolio";
import { createResultLenses, parseResultLens, RESULT_LENS_OPTIONS, resultLensCsvRows, type ResultLens } from "../lib/result-lens";
import { createRecurringContributionPlan } from "../lib/recurring-opportunity";
import { describeRiskLimits, evaluateRiskLimits } from "../lib/risk-limits";
import {
  calculateContributionPlanWeights,
  calculateNominalGoalFromPurchasingPower,
  calculateRequiredMonthlyContribution,
} from "../lib/savings-goal";
import { calculateSavingsStressScenarios, type SavingsStressScenario } from "../lib/savings-stress";
import HistoryChart, { type HistoryPoint } from "./history-chart";
import LivingCoveragePanel from "./living-coverage-panel";
import OpportunityCostPanel, { type OpportunityCostInput, type OpportunityCostResult } from "./opportunity-cost-panel";
import RecurringOpportunityPanel, { type RecurringOpportunityInput, type RecurringOpportunityResult } from "./recurring-opportunity-panel";
import ResultLensCard from "./result-lens-card";
import ScenarioHistoryChart, { type ScenarioSeries } from "./scenario-history-chart";
import ShareResultCard from "./share-result-card";
import TrustCenter from "./trust-center";
import { getAnalyticsSource, trackAnalyticsEvent, trackCampaignEvent, trackPageView } from "./analytics";
import FeedbackPanel from "./feedback-panel";
import { fetchComparisonData, getComparisonMultiplier, getPeriodMultiplier, FUEL_DATA_VERSION, BITCOIN_DATA_VERSION, type IndexCode, type RateSnapshot } from "./historical-data-client";
import { calculateHistoricalResult, formatDate, formatPeriod, type CalculationMode, type CalculationResult, type CurrencyCode, type SavingsGoalValueMode } from "./historical-calculation";
import HistoricalReferenceNotice from "./historical-reference-notice";
import { historicalShareUrl } from "./historical-share-url";
import ToolsHub from "./tools-hub";

type IndexGroup = "finance" | "daily";
type DelayDays = 7 | 30 | 90;
type LossLimitPercent = 10 | 20 | 30;
type DurationLimitDays = 180 | 365 | 1095;
type AnalysisView = "overview" | "purchasing" | "risk" | "savings" | "portfolio" | "alternatives" | "tools";

type ComparisonResult = {
  indexCode: IndexCode;
  label: string;
  multiplier: number;
  targetTryValue: number;
  requiredStartingTryValue: number;
  changePercent: number;
};

type SavedScenario = {
  id: string;
  name: string;
  savedAt: string;
  amount: number;
  resultLens?: ResultLens;
  calculationMode?: CalculationMode;
  goalValueMode?: SavingsGoalValueMode;
  currency: CurrencyCode;
  startDate: string;
  targetDate: string;
  indexCode: IndexCode;
  targetTryValue: number;
  changePercent: number;
  realChange: number | null;
  selectedRank: number | null;
  comparisonCount: number;
  buyCostPercent?: number;
  sellCostPercent?: number;
  annualCostPercent?: number;
  delayDays?: DelayDays;
};

type DelayAnalysis = {
  earlierStartDate: string | null;
  earlierTargetValue: number | null;
  delayedStartDate: string;
  delayedTargetValue: number;
  difference: number;
  impactPercent: number;
  outcome: InvestmentDelayOutcome;
  spread: number;
  spreadPercent: number;
  sensitivityLevel: TimingSensitivityLevel;
  bestPosition: TimingPosition;
  worstPosition: TimingPosition;
  sampleCount: number;
};

type SavingsSimulationResult = {
  mode: "contribution" | "goal";
  monthlyContribution: number;
  finalMonthlyContribution: number;
  annualIncreasePercent: number;
  goalInputAmount: number | null;
  goalAmount: number | null;
  goalValueMode: SavingsGoalValueMode | null;
  contributionCount: number;
  totalPaid: number;
  initialTargetValue: number;
  contributionsTargetValue: number;
  grossTargetValue: number;
  costImpact: number;
  costsApplied: boolean;
  buyCostPercent: number;
  sellCostPercent: number;
  annualCostPercent: number;
  flatTargetValue: number;
  increaseImpact: number;
  targetValue: number;
  gain: number;
  gainPercent: number;
  upfrontTargetValue: number;
  strategyDifference: number;
  strategyWinner: ContributionTimingWinner;
  stressScenarios: SavingsStressScenario[];
};

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "TRY", label: "Türk lirası", symbol: "₺" },
  { code: "USD", label: "ABD doları", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
];

const INDICES: { code: IndexCode; label: string; description: string; available: boolean; group: IndexGroup }[] = [
  { code: "TUFE", label: "TÜFE", description: "TÜİK aylık tüketici fiyatları", available: true, group: "finance" },
  { code: "USD", label: "ABD doları", description: "TCMB referans kuru", available: true, group: "finance" },
  { code: "EUR", label: "Euro", description: "TCMB referans kuru", available: true, group: "finance" },
  { code: "ALTIN", label: "Gram altın", description: "Uluslararası XAU referansı", available: true, group: "finance" },
  { code: "BIST", label: "BIST 100", description: "Günlük fiyat endeksi kapanışı", available: true, group: "finance" },
  { code: "FAIZ", label: "Mevduat", description: "32 günlük yenilenen brüt TL faizi", available: true, group: "finance" },
  { code: "BTC", label: "Bitcoin", description: "BTC/USD kapanışı × TCMB USD/TL", available: true, group: "finance" },
  { code: "BENZIN", label: "Benzin 95", description: "EPDK ulusal litre fiyatı", available: true, group: "daily" },
  { code: "MOTORIN", label: "Motorin", description: "EPDK ulusal litre fiyatı", available: true, group: "daily" },
  { code: "ASGARI", label: "Net asgari ücret", description: "Aylık resmî net tutar", available: true, group: "daily" },
];

const MIN_DATE = "2005-01-03";
const BITCOIN_MIN_DATE = "2014-09-17";
const FUEL_MIN_DATE = "2016-01-01";
const MAX_DATE = getTodayIso();
const DEFAULT_TARGET_DATE = getYesterdayIso();
const SAVED_SCENARIOS_KEY = "para-hesaplayici:saved-scenarios:v1";
const MAX_SAVED_SCENARIOS = 12;
const MAX_MONTHLY_CONTRIBUTIONS = 120;
const SAVINGS_INDEX_CODES: IndexCode[] = ["USD", "EUR", "ALTIN", "BIST", "FAIZ", "BTC"];
const PORTFOLIO_PRESETS: Record<"temkinli" | "dengeli" | "atak", Partial<Record<IndexCode, number>>> = {
  temkinli: { FAIZ: 45, ALTIN: 30, USD: 15, EUR: 10 },
  dengeli: { ALTIN: 30, FAIZ: 25, BIST: 20, USD: 10, EUR: 5, BTC: 10 },
  atak: { BTC: 30, BIST: 30, ALTIN: 20, USD: 10, FAIZ: 10 },
};
const DELAY_OPTIONS: DelayDays[] = [7, 30, 90];
const LOSS_LIMIT_OPTIONS: LossLimitPercent[] = [10, 20, 30];
const DURATION_LIMIT_OPTIONS: { days: DurationLimitDays; label: string }[] = [
  { days: 180, label: "6 ay" },
  { days: 365, label: "1 yıl" },
  { days: 1095, label: "3 yıl" },
];
const DATE_PRESETS = [
  { years: 1, label: "Son 1 yıl" },
  { years: 5, label: "Son 5 yıl" },
  { years: 10, label: "Son 10 yıl" },
];
const ANALYSIS_VIEWS: { id: AnalysisView; label: string; shortLabel: string; description: string; icon: string }[] = [
  { id: "overview", label: "Genel bakış", shortLabel: "Özet", description: "Ana sonuç ve tarihsel yolculuk", icon: "◎" },
  { id: "purchasing", label: "Alım gücü", shortLabel: "Alım gücü", description: "Masraf, TÜFE ve yaşam karşılığı", icon: "₺" },
  { id: "risk", label: "Risk", shortLabel: "Risk", description: "Düşüş, toparlanma ve tarih hassasiyeti", icon: "◷" },
  { id: "savings", label: "Birikim", shortLabel: "Birikim", description: "Düzenli katkı ve hedef planı", icon: "+" },
  { id: "portfolio", label: "Portföy", shortLabel: "Portföy", description: "Dağılım ve senaryo karşılaştırması", icon: "◫" },
  { id: "alternatives", label: "Alternatifler", shortLabel: "Alternatif", description: "Ölçütler ve fırsat maliyeti", icon: "⇄" },
  { id: "tools", label: "Araçlar", shortLabel: "Araçlar", description: "Kaydetme, rapor ve paylaşım", icon: "↗" },
];
function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function isSavedScenario(value: unknown): value is SavedScenario {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<SavedScenario>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.savedAt === "string" &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount) &&
    CURRENCIES.some((currency) => currency.code === item.currency) &&
    typeof item.startDate === "string" &&
    typeof item.targetDate === "string" &&
    isIsoDate(item.startDate) &&
    isIsoDate(item.targetDate) &&
    INDICES.some((index) => index.code === item.indexCode) &&
    typeof item.targetTryValue === "number" &&
    Number.isFinite(item.targetTryValue) &&
    typeof item.changePercent === "number" &&
    Number.isFinite(item.changePercent) &&
    (item.realChange === null || (typeof item.realChange === "number" && Number.isFinite(item.realChange))) &&
    (item.selectedRank === null || (typeof item.selectedRank === "number" && Number.isFinite(item.selectedRank))) &&
    typeof item.comparisonCount === "number" &&
    Number.isFinite(item.comparisonCount) &&
    [item.buyCostPercent, item.sellCostPercent, item.annualCostPercent].every((cost) =>
      cost === undefined || (typeof cost === "number" && Number.isFinite(cost) && cost >= 0 && cost < 100),
    ) &&
    (item.delayDays === undefined || [7, 30, 90].includes(item.delayDays)) &&
    (item.resultLens === undefined || RESULT_LENS_OPTIONS.some((option) => option.id === item.resultLens)) &&
    (item.calculationMode === undefined || item.calculationMode === "forward" || item.calculationMode === "reverse") &&
    (item.goalValueMode === undefined || item.goalValueMode === "nominal" || item.goalValueMode === "purchasing-power")
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("Bağlantı kopyalanamadı.");
}

function formatMoney(value: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "TRY" ? 0 : 2,
  }).format(value);
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: digits }).format(value);
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}%${formatNumber(Math.abs(value))}`;
}

function escapeCsvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function getPeriodYears(startDate: string, targetDate: string) {
  const startTime = new Date(`${startDate}T12:00:00Z`).getTime();
  const targetTime = new Date(`${targetDate}T12:00:00Z`).getTime();
  return (targetTime - startTime) / (365.2425 * 24 * 60 * 60 * 1000);
}

function annualizeMultiplier(multiplier: number, years: number) {
  if (years <= 0 || multiplier <= 0) return null;
  return (Math.pow(multiplier, 1 / years) - 1) * 100;
}

type HistorySource = {
  path: string;
  field: string;
  fuel?: "gasoline" | "diesel";
};

const HISTORY_SOURCES: Partial<Record<IndexCode, HistorySource>> = {
  TUFE: { path: "/api/cpi", field: "indexValue" },
  USD: { path: "/api/fx", field: "USD" },
  EUR: { path: "/api/fx", field: "EUR" },
  ALTIN: { path: "/api/gold", field: "gramTry" },
  BIST: { path: "/api/bist", field: "close" },
  FAIZ: { path: "/api/deposit", field: "multiplier" },
  BTC: { path: "/api/bitcoin", field: "closeTry" },
  BENZIN: { path: "/api/fuel", field: "pricePerLiter", fuel: "gasoline" },
  MOTORIN: { path: "/api/fuel", field: "pricePerLiter", fuel: "diesel" },
  ASGARI: { path: "/api/minimum-wage", field: "netMonthly" },
};

function createHistoryDates(startDate: string, targetDate: string) {
  const startTime = new Date(`${startDate}T12:00:00Z`).getTime();
  const targetTime = new Date(`${targetDate}T12:00:00Z`).getTime();
  const pointCount = 10;
  const dates = Array.from({ length: pointCount }, (_, index) => {
    const ratio = index / (pointCount - 1);
    return new Date(startTime + (targetTime - startTime) * ratio).toISOString().slice(0, 10);
  });

  return [...new Set(dates)];
}

function addMonthsIso(value: string, monthOffset: number) {
  const [year, month, day] = value.split("-").map(Number);
  const targetMonth = month - 1 + monthOffset;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();

  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

function addDaysIso(value: string, dayOffset: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function createMonthlyContributionDates(startDate: string, targetDate: string) {
  const dates: string[] = [];

  for (let offset = 1; offset <= MAX_MONTHLY_CONTRIBUTIONS + 1; offset += 1) {
    const date = addMonthsIso(startDate, offset);
    if (date >= targetDate) break;
    dates.push(date);
  }

  return dates;
}

async function fetchHistoryPoints({
  startDate,
  targetDate,
  indexCode,
  startingTryValue,
  startRate,
}: {
  startDate: string;
  targetDate: string;
  indexCode: IndexCode;
  startingTryValue: number;
  startRate: number;
}): Promise<HistoryPoint[]> {
  const source = HISTORY_SOURCES[indexCode];

  if (!source) throw new Error("Grafik veri kaynağı bulunamadı.");

  const dates = createHistoryDates(startDate, targetDate);

  return Promise.all(dates.map(async (date) => {
    if (date === startDate) return { date, value: startingTryValue };

    const query = new URLSearchParams({ startDate, targetDate: date });
    if (indexCode === "BTC") query.set("v", BITCOIN_DATA_VERSION);
    if (source.fuel) {
      query.set("fuel", source.fuel);
      query.set("v", FUEL_DATA_VERSION);
    }

    const response = await fetch(`${source.path}?${query.toString()}`, { cache: "no-store" });
    const data = await response.json() as {
      target?: Record<string, unknown>;
      multiplier?: number;
      error?: string;
    };

    if (!response.ok) throw new Error(data.error || "Grafik verisi alınamadı.");

    if (indexCode === "FAIZ") {
      if (typeof data.multiplier !== "number" || !Number.isFinite(data.multiplier)) {
        throw new Error("Mevduat grafik verisi okunamadı.");
      }

      return { date, value: startingTryValue * data.multiplier };
    }

    const targetRate = data.target?.[source.field];
    if (typeof targetRate !== "number" || !Number.isFinite(targetRate)) {
      throw new Error("Grafik veri noktası okunamadı.");
    }

    return { date, value: startingTryValue * (targetRate / startRate) };
  }));
}

async function fetchScenarioHistoryPoints({
  startDate,
  targetDate,
  indexCode,
  startingTryValue,
}: {
  startDate: string;
  targetDate: string;
  indexCode: IndexCode;
  startingTryValue: number;
}): Promise<HistoryPoint[]> {
  const dates = createHistoryDates(startDate, targetDate);
  const placeholderRate: RateSnapshot = {
    requestedDate: startDate,
    actualDate: startDate,
    USD: 1,
    EUR: 1,
  };

  return Promise.all(dates.map(async (date) => {
    if (date === startDate) return { date, value: startingTryValue };

    const query = new URLSearchParams({ startDate, targetDate: date });
    let multiplier: number;

    if (indexCode === "USD" || indexCode === "EUR") {
      const data = await fetchComparisonData<{ start?: RateSnapshot; target?: RateSnapshot }>(
        `/api/fx?${query.toString()}`,
        "Kur karşılaştırma verisi alınamadı.",
      );
      if (!data.start || !data.target) throw new Error("Kur karşılaştırma verisi eksik.");
      multiplier = data.target[indexCode] / data.start[indexCode];
    } else {
      multiplier = await getComparisonMultiplier(indexCode, query, placeholderRate, placeholderRate);
    }

    return { date, value: startingTryValue * multiplier };
  }));
}

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const analysisNavRef = useRef<HTMLElement>(null);
  const savingsRequestRef = useRef(0);
  const savingsMultiplierCacheRef = useRef(new Map<string, number[]>());
  const delayMultiplierCacheRef = useRef(new Map<string, number>());
  const [amount, setAmount] = useState("10000");
  const [calculationMode, setCalculationMode] = useState<CalculationMode>("forward");
  const [reverseGoalValueMode, setReverseGoalValueMode] = useState<SavingsGoalValueMode>("nominal");
  const [currency, setCurrency] = useState<CurrencyCode>("TRY");
  const [startDate, setStartDate] = useState("2021-01-04");
  const [targetDate, setTargetDate] = useState(DEFAULT_TARGET_DATE);
  const [indexCode, setIndexCode] = useState<IndexCode>("USD");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [resultLens, setResultLens] = useState<ResultLens>("gross");
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [comparisonNote, setComparisonNote] = useState("");
  const [portfolioWeights, setPortfolioWeights] = useState<Partial<Record<IndexCode, string>>>({});
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [scenarioCodes, setScenarioCodes] = useState<IndexCode[]>([]);
  const [scenarioSeries, setScenarioSeries] = useState<ScenarioSeries[]>([]);
  const [scenarioCpiPoints, setScenarioCpiPoints] = useState<HistoryPoint[]>([]);
  const [scenarioMode, setScenarioMode] = useState<"nominal" | "real">("nominal");
  const [scenarioNote, setScenarioNote] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isScenarioLoading, setIsScenarioLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared" | "error">("idle");
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloaded" | "error">("idle");
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [savedScenarioName, setSavedScenarioName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [confirmClearSaved, setConfirmClearSaved] = useState(false);
  const [monthlyContribution, setMonthlyContribution] = useState("1000");
  const [annualContributionIncrease, setAnnualContributionIncrease] = useState("0");
  const [savingsGoal, setSavingsGoal] = useState("500000");
  const [savingsMode, setSavingsMode] = useState<"contribution" | "goal">("contribution");
  const [savingsGoalValueMode, setSavingsGoalValueMode] = useState<SavingsGoalValueMode>("nominal");
  const [savingsSimulation, setSavingsSimulation] = useState<SavingsSimulationResult | null>(null);
  const [selectedStressMisses, setSelectedStressMisses] = useState(3);
  const [savingsError, setSavingsError] = useState("");
  const [isSavingsLoading, setIsSavingsLoading] = useState(false);
  const [buyCostPercent, setBuyCostPercent] = useState("0");
  const [sellCostPercent, setSellCostPercent] = useState("0");
  const [annualCostPercent, setAnnualCostPercent] = useState("0");
  const livingPeriodKey = `${startDate}/${targetDate}`;
  const [livingExpenses, setLivingExpenses] = useState({ periodKey: livingPeriodKey, start: "", target: "" });
  // Adjust during render so no effect can leave previous-period expenses visible.
  if (livingExpenses.periodKey !== livingPeriodKey) {
    setLivingExpenses({ periodKey: livingPeriodKey, start: "", target: "" });
  }
  const [delayDays, setDelayDays] = useState<DelayDays>(30);
  const [lossLimitPercent, setLossLimitPercent] = useState<LossLimitPercent>(20);
  const [durationLimitDays, setDurationLimitDays] = useState<DurationLimitDays>(365);
  const [delayAnalysis, setDelayAnalysis] = useState<DelayAnalysis | null>(null);
  const [delayError, setDelayError] = useState("");
  const [isDelayLoading, setIsDelayLoading] = useState(false);
  const [analysisView, setAnalysisView] = useState<AnalysisView>("overview");
  const [isSharedVisit, setIsSharedVisit] = useState(false);

  const selectedCurrency = CURRENCIES.find((item) => item.code === currency)!;
  const selectedIndex = INDICES.find((item) => item.code === indexCode)!;
  const historyRisk = historyPoints.length >= 2 ? calculateHistoryRisk(historyPoints) : null;
  const riskLimitAssessment = historyRisk
    ? evaluateRiskLimits({
        maxDrawdownPercent: historyRisk.maxDrawdownPercent,
        underwaterDays: historyRisk.longestUnderwaterDays,
        hasOpenDrawdown: historyRisk.hasOpenDrawdown,
        lossLimitPercent,
        durationLimitDays,
      })
    : null;
  const riskLimitCopy = riskLimitAssessment ? describeRiskLimits(riskLimitAssessment) : null;
  const financeIndices = INDICES.filter((item) => item.group === "finance");
  const dailyIndices = INDICES.filter((item) => item.group === "daily");
  const periodYears = getPeriodYears(startDate, targetDate);
  const annualizedChange = result ? annualizeMultiplier(result.multiplier, periodYears) : null;
  const cpiComparison = comparisons.find((item) => item.indexCode === "TUFE");
  const cpiMultiplier = result && cpiComparison ? cpiComparison.multiplier : null;
  const realMultiplier = result && cpiMultiplier ? result.multiplier / cpiMultiplier : null;
  const realChange = realMultiplier === null ? null : (realMultiplier - 1) * 100;
  const annualizedInflation = cpiMultiplier === null ? null : annualizeMultiplier(cpiMultiplier, periodYears);
  const annualizedRealChange = realMultiplier === null ? null : annualizeMultiplier(realMultiplier, periodYears);
  const bestComparison = comparisons[0] ?? null;
  const selectedRankIndex = comparisons.findIndex((item) => item.indexCode === indexCode);
  const selectedRank = selectedRankIndex >= 0 ? selectedRankIndex + 1 : null;
  const opportunityDifference = result && bestComparison
    ? result.calculationMode === "reverse"
      ? Math.max(0, result.startingTryValue - bestComparison.requiredStartingTryValue)
      : Math.max(0, bestComparison.targetTryValue - result.targetTryValue)
    : null;
  const portfolioComparisons = comparisons.filter((item) => SAVINGS_INDEX_CODES.includes(item.indexCode));
  const portfolioTotal = portfolioComparisons.reduce(
    (total, item) => total + (Number(portfolioWeights[item.indexCode]) || 0),
    0,
  );
  const portfolioWeightsAreValid = portfolioComparisons.every((item) => {
    const value = Number(portfolioWeights[item.indexCode]) || 0;
    return Number.isFinite(value) && value >= 0 && value <= 100;
  });
  const portfolioResult = result && portfolioWeightsAreValid && Math.abs(portfolioTotal - 100) < 0.000001
    ? calculateBuyAndHoldPortfolio(
        portfolioComparisons.map((item) => ({
          code: item.indexCode,
          label: item.label,
          weightPercent: Number(portfolioWeights[item.indexCode]) || 0,
          multiplier: item.multiplier,
        })),
        result.startingTryValue,
        result.targetTryValue,
      )
    : null;
  const portfolioRanking = portfolioResult
    ? [...portfolioComparisons.map((item) => ({
        code: item.indexCode,
        value: result?.calculationMode === "reverse" ? item.requiredStartingTryValue : item.targetTryValue,
      })), {
        code: "PORTFOLIO",
        value: result?.calculationMode === "reverse" ? portfolioResult.requiredStartingValue : portfolioResult.targetValue,
      }].sort((first, second) => result?.calculationMode === "reverse"
        ? first.value - second.value
        : second.value - first.value)
    : [];
  const portfolioRank = portfolioRanking.findIndex((item) => item.code === "PORTFOLIO") + 1;
  const rawCostValues = [buyCostPercent, sellCostPercent, annualCostPercent];
  const numericCostValues = rawCostValues.map(Number);
  const costsAreValid = rawCostValues.every((value) => value.trim() !== "") && numericCostValues.every((value) =>
    Number.isFinite(value) && value >= 0 && value < 100,
  );
  const costAnalysis = result && SAVINGS_INDEX_CODES.includes(indexCode) && costsAreValid
    ? calculateInvestmentCosts(
        result.targetTryValue,
        result.startingTryValue,
        periodYears,
        numericCostValues[0],
        numericCostValues[1],
        numericCostValues[2],
      )
    : null;
  const costAdjustedGoal = result && result.calculationMode === "reverse" && costAnalysis
    ? calculateCostAdjustedGoal(
        result.startingTryValue,
        result.targetTryValue,
        periodYears,
        numericCostValues[0],
        numericCostValues[1],
        numericCostValues[2],
      )
    : null;
  const livingCoverageState: LivingCoverageState = result?.calculationMode === "forward" && costAnalysis && livingExpenses.periodKey === livingPeriodKey
    ? readLivingCoverage({
        startExpenseInput: livingExpenses.start,
        targetExpenseInput: livingExpenses.target,
        startingValue: result.startingTryValue,
        netTargetValue: costAnalysis.netTargetValue,
      })
    : { status: "empty" };
  const livingCoverage = livingCoverageState.status === "ready" ? livingCoverageState.result : null;
  const livingAlternatives = livingCoverage && result && costAnalysis
    ? compareLivingAlternatives({
        startingValue: result.startingTryValue,
        startMonthlyExpense: Number(livingExpenses.start),
        targetMonthlyExpense: Number(livingExpenses.target),
        selected: { code: indexCode, label: selectedIndex.label, netTargetValue: costAnalysis.netTargetValue },
        alternatives: INDICES.filter((item) => item.available && SAVINGS_INDEX_CODES.includes(item.code)).map((item) => {
          const comparison = comparisons.find((entry) => entry.indexCode === item.code);
          const retention = calculateCostRetentionFactor(periodYears, numericCostValues[0], numericCostValues[1], numericCostValues[2]);
          return { code: item.code, label: item.label, netTargetValue: comparison ? comparison.targetTryValue * retention : null };
        }),
      })
    : null;
  const costAdjustedStartingCurrencyValue = result && costAdjustedGoal
    ? result.numericAmount / costAdjustedGoal.retentionFactor
    : null;
  const costAdjustedAdditionalCurrencyValue = result && costAdjustedStartingCurrencyValue !== null
    ? costAdjustedStartingCurrencyValue - result.numericAmount
    : null;
  const costAndInflationOutcome = result && costAnalysis && cpiMultiplier && (
    result.calculationMode === "forward" || costAdjustedGoal
  )
    ? calculateCostAndInflationOutcome(
        result.calculationMode === "reverse" ? costAdjustedGoal!.requiredGrossTargetValue : result.targetTryValue,
        result.calculationMode === "reverse" ? costAdjustedGoal!.requiredStartingValue : result.startingTryValue,
        cpiMultiplier,
        periodYears,
        numericCostValues[0],
        numericCostValues[1],
        numericCostValues[2],
      )
    : null;
  const purchasingPowerThreshold = result && costAnalysis && cpiMultiplier
    ? calculatePurchasingPowerThreshold(
        result.multiplier,
        cpiMultiplier,
        periodYears,
        numericCostValues[0],
        numericCostValues[1],
        numericCostValues[2],
      )
    : null;
  const resultLenses = result?.calculationMode === "forward" && SAVINGS_INDEX_CODES.includes(indexCode)
    ? createResultLenses({
        startingValue: result.startingTryValue,
        grossTargetValue: result.targetTryValue,
        netTargetValue: costAnalysis?.netTargetValue ?? null,
        cpiMultiplier,
        cpiLoading: isComparisonLoading,
      })
    : null;
  const periodProfile = costAndInflationOutcome && purchasingPowerThreshold && historyRisk && delayAnalysis
    ? createPeriodProfile({
        realNetChangePercent: costAndInflationOutcome.realNetChangePercent,
        maxDrawdownPercent: historyRisk.maxDrawdownPercent,
        timingSensitivityLevel: delayAnalysis.sensitivityLevel,
        timingSpreadPercent: delayAnalysis.spreadPercent,
        thresholdOutcome: purchasingPowerThreshold.outcome,
      })
    : null;
  const resultLensReady = !resultLenses || resultLenses[resultLens].status === "ready";
  const activeStressScenario = savingsSimulation
    ? savingsSimulation.stressScenarios.find((item) => item.missedCount === selectedStressMisses)
      ?? savingsSimulation.stressScenarios[0]
      ?? null
    : null;
  const hasScenarioInflationData = Boolean(
    result &&
    scenarioCpiPoints.length > 1 &&
    scenarioSeries.every((item) => item.points.length === scenarioCpiPoints.length),
  );
  const displayedScenarioSeries = scenarioMode === "real" && result && hasScenarioInflationData
    ? scenarioSeries.map((item) => ({
        ...item,
        points: item.points.map((point, pointIndex) => ({
          ...point,
          value: point.value / (scenarioCpiPoints[pointIndex].value / result.startingTryValue),
        })),
      }))
    : scenarioSeries;

  useEffect(() => {
    let loadTimer: number | undefined;

    try {
      const storedValue = window.localStorage.getItem(SAVED_SCENARIOS_KEY);
      if (!storedValue) return;

      const parsedValue = JSON.parse(storedValue) as unknown;
      if (!Array.isArray(parsedValue)) throw new Error("Kayıt biçimi geçersiz.");

      const validScenarios = parsedValue.filter(isSavedScenario).slice(0, MAX_SAVED_SCENARIOS);
      loadTimer = window.setTimeout(() => setSavedScenarios(validScenarios), 0);
    } catch {
      window.localStorage.removeItem(SAVED_SCENARIOS_KEY);
    }

    return () => {
      if (loadTimer !== undefined) window.clearTimeout(loadTimer);
    };
  }, []);

  useEffect(() => { trackPageView(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isOpportunityLink = params.get("tool") === "opportunity";
    const sharedAmount = isOpportunityLink ? params.get("opportunityAmount") : params.get("amount");
    const sharedCurrency = isOpportunityLink ? "TRY" : params.get("currency");
    const sharedStartDate = isOpportunityLink ? params.get("opportunityDate") : params.get("start");
    const sharedTargetDate = isOpportunityLink ? DEFAULT_TARGET_DATE : params.get("target");
    const sharedIndex = isOpportunityLink ? "TUFE" : params.get("index");
    const sharedBuyCost = params.get("buyCost");
    const sharedSellCost = params.get("sellCost");
    const sharedAnnualCost = params.get("annualCost");
    const sharedDelay = params.get("delay");
    const sharedMode = params.get("mode");
    const sharedGoalValue = params.get("goalValue");
    const sharedLens = parseResultLens(params.get("lens"));

    if (![sharedAmount, sharedCurrency, sharedStartDate, sharedTargetDate, sharedIndex].some(Boolean)) return;
    trackAnalyticsEvent("shared_link_opened", isOpportunityLink ? "opportunity" : "main", "shared_link");

    const numericAmount = Number(sharedAmount);
    const currencyIsValid = CURRENCIES.some((item) => item.code === sharedCurrency);
    const indexIsValid = INDICES.some((item) => item.code === sharedIndex && item.available);
    const sharedCosts = [sharedBuyCost, sharedSellCost, sharedAnnualCost].map((value) => value === null ? 0 : Number(value));
    const sharedCostsAreValid = sharedCosts.every((value) => Number.isFinite(value) && value >= 0 && value < 100);
    const sharedDelayDays = sharedDelay === null ? 30 : Number(sharedDelay);
    const sharedDelayIsValid = DELAY_OPTIONS.includes(sharedDelayDays as DelayDays);
    const sharedModeIsValid = sharedMode === null || sharedMode === "forward" || sharedMode === "reverse";
    const sharedGoalValueIsValid = sharedGoalValue === null || sharedGoalValue === "nominal" || sharedGoalValue === "purchasing-power";
    const datesAreValid = Boolean(
      sharedStartDate &&
      sharedTargetDate &&
      isIsoDate(sharedStartDate) &&
      isIsoDate(sharedTargetDate) &&
      sharedStartDate >= MIN_DATE &&
      sharedTargetDate <= MAX_DATE &&
      sharedStartDate < sharedTargetDate,
    );
    const indexMinimumDate = sharedIndex === "BTC"
      ? BITCOIN_MIN_DATE
      : sharedIndex === "BENZIN" || sharedIndex === "MOTORIN"
        ? FUEL_MIN_DATE
        : MIN_DATE;

    const loadTimer = window.setTimeout(() => {
      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0 ||
        !currencyIsValid ||
        !indexIsValid ||
        !sharedCostsAreValid ||
        !sharedDelayIsValid ||
        !sharedModeIsValid ||
        !sharedGoalValueIsValid ||
        !datesAreValid ||
        !sharedStartDate ||
        sharedStartDate < indexMinimumDate
      ) {
        setFormError("Paylaşılan bağlantıdaki hesaplama bilgileri geçerli değil.");
        return;
      }

      setAmount(String(numericAmount));
      setCalculationMode((sharedMode as CalculationMode | null) ?? "forward");
      setReverseGoalValueMode((sharedGoalValue as SavingsGoalValueMode | null) ?? "nominal");
      setCurrency(sharedCurrency as CurrencyCode);
      setStartDate(sharedStartDate);
      setTargetDate(sharedTargetDate!);
      setIndexCode(sharedIndex as IndexCode);
      setBuyCostPercent(String(sharedCosts[0]));
      setSellCostPercent(String(sharedCosts[1]));
      setAnnualCostPercent(String(sharedCosts[2]));
      setDelayDays(sharedDelayDays as DelayDays);
      setResultLens(sharedLens);
      setIsSharedVisit(!isOpportunityLink);
      if (isOpportunityLink) setAnalysisView("alternatives");

      window.setTimeout(() => formRef.current?.requestSubmit(), 0);
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!result || scenarioCodes.length === 0) return;

    let cancelled = false;

    const seriesRequest = Promise.allSettled(scenarioCodes.map(async (code) => {
      const item = INDICES.find((index) => index.code === code)!;
      const points = await fetchScenarioHistoryPoints({
        startDate,
        targetDate,
        indexCode: code,
        startingTryValue: result.startingTryValue,
      });

      return { indexCode: code, label: item.label, points } satisfies ScenarioSeries;
    }));
    const inflationRequest = fetchScenarioHistoryPoints({
      startDate,
      targetDate,
      indexCode: "TUFE",
      startingTryValue: result.startingTryValue,
    }).catch(() => [] as HistoryPoint[]);

    void Promise.all([seriesRequest, inflationRequest]).then(([settled, inflationPoints]) => {
      if (cancelled) return;

      const successfulSeries = settled
        .flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
      const failedCount = settled.length - successfulSeries.length;

      setScenarioSeries(successfulSeries);
      setScenarioCpiPoints(inflationPoints);
      if (inflationPoints.length < 2) setScenarioMode("nominal");
      const notes = [];
      if (failedCount > 0) notes.push(`${failedCount} ölçütün grafik verisi şu anda alınamadı`);
      if (inflationPoints.length < 2) notes.push("reel görünüm için TÜFE serisi alınamadı");
      setScenarioNote(notes.length > 0 ? `${notes.join("; ")}.` : "");
      setIsScenarioLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [result, scenarioCodes, startDate, targetDate]);

  useEffect(() => {
    if (!result || !SAVINGS_INDEX_CODES.includes(indexCode)) return;

    let cancelled = false;
    const minimumStartDate = indexCode === "BTC" ? BITCOIN_MIN_DATE : MIN_DATE;
    const earlierStartCandidate = addDaysIso(startDate, -delayDays);
    const earlierStartDate = earlierStartCandidate >= minimumStartDate ? earlierStartCandidate : null;
    const delayedStartDate = addDaysIso(startDate, delayDays);

    function getCachedMultiplier(comparisonStartDate: string) {
      const cacheKey = `${indexCode}:${comparisonStartDate}:${targetDate}`;
      const cachedMultiplier = delayMultiplierCacheRef.current.get(cacheKey);
      if (cachedMultiplier !== undefined) return Promise.resolve(cachedMultiplier);

      return getPeriodMultiplier(indexCode, comparisonStartDate, targetDate).then((multiplier) => {
        delayMultiplierCacheRef.current.set(cacheKey, multiplier);
        return multiplier;
      });
    }

    const delayedRequest = delayedStartDate >= targetDate
      ? Promise.reject(new Error(`${delayDays} günlük gecikme hedef tarihini aşıyor.`))
      : getCachedMultiplier(delayedStartDate);
    const earlierRequest = earlierStartDate
      ? getCachedMultiplier(earlierStartDate)
      : Promise.resolve(null);

    void Promise.all([delayedRequest, earlierRequest])
      .then(([delayedMultiplier, earlierMultiplier]) => {
        if (cancelled) return;
        const delayedTargetValue = result.startingTryValue * delayedMultiplier;
        const earlierTargetValue = earlierMultiplier === null ? null : result.startingTryValue * earlierMultiplier;
        const sensitivity = analyzeInvestmentTimingSensitivity(
          result.targetTryValue,
          delayedTargetValue,
          earlierTargetValue,
        );
        setDelayAnalysis({
          earlierStartDate,
          earlierTargetValue,
          delayedStartDate,
          delayedTargetValue,
          ...sensitivity,
        });
        setDelayError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setDelayAnalysis(null);
        setDelayError(error instanceof Error ? error.message : "Gecikme etkisi hesaplanamadı.");
      })
      .finally(() => {
        if (!cancelled) setIsDelayLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [result, indexCode, startDate, targetDate, delayDays]);

  function markDirty() {
    setAnalysisView("overview");
    setResult(null);
    setComparisons([]);
    setComparisonNote("");
    setPortfolioWeights({});
    setHistoryPoints([]);
    setScenarioCodes([]);
    setScenarioSeries([]);
    setScenarioCpiPoints([]);
    setScenarioMode("nominal");
    setScenarioNote("");
    setIsHistoryLoading(false);
    setIsScenarioLoading(false);
    setSavingsSimulation(null);
    setSavingsError("");
    setIsSavingsLoading(false);
    setDelayAnalysis(null);
    setDelayError("");
    setIsDelayLoading(false);
    setFormError("");
    setShareStatus("idle");
    setDownloadStatus("idle");
    setSavedScenarioName("");
    setSaveStatus("idle");
    savingsRequestRef.current += 1;

    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    }
  }

  function selectAnalysisView(view: AnalysisView) {
    setAnalysisView(view);
    window.requestAnimationFrame(() => analysisNavRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function startOwnCalculation() {
    setIsSharedVisit(false);
    markDirty();
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function applyPortfolioPreset(preset: keyof typeof PORTFOLIO_PRESETS | "equal") {
    if (portfolioComparisons.length === 0) return;

    const rawWeights = portfolioComparisons.map((item) => preset === "equal"
      ? 1
      : PORTFOLIO_PRESETS[preset][item.indexCode] ?? 0);
    const rawTotal = rawWeights.reduce((total, value) => total + value, 0);
    const basis = rawTotal > 0 ? rawWeights : portfolioComparisons.map(() => 1);
    const basisTotal = basis.reduce((total, value) => total + value, 0);
    let assigned = 0;
    const next: Partial<Record<IndexCode, string>> = {};

    portfolioComparisons.forEach((item, position) => {
      const weight = position === portfolioComparisons.length - 1
        ? 100 - assigned
        : Math.round(basis[position] / basisTotal * 100);
      assigned += weight;
      next[item.indexCode] = String(weight);
    });
    setPortfolioWeights(next);
  }

  async function calculateOpportunityCost(input: OpportunityCostInput): Promise<OpportunityCostResult> {
    const target = DEFAULT_TARGET_DATE;
    const eligibleCodes = SAVINGS_INDEX_CODES.filter((code) => code !== "BTC" || input.purchaseDate >= BITCOIN_MIN_DATE);
    const skippedCodes = SAVINGS_INDEX_CODES.filter((code) => !eligibleCodes.includes(code));
    const settled = await Promise.allSettled(eligibleCodes.map(async (code) => {
      const multiplier = await getPeriodMultiplier(code, input.purchaseDate, target);
      const label = INDICES.find((item) => item.code === code)?.label ?? code;
      return {
        code,
        label,
        multiplier,
        targetValue: input.amount * multiplier,
        changePercent: (multiplier - 1) * 100,
      };
    }));
    const successful = settled
      .filter((item): item is PromiseFulfilledResult<{
        code: IndexCode;
        label: string;
        multiplier: number;
        targetValue: number;
        changePercent: number;
      }> => item.status === "fulfilled")
      .map((item) => item.value);
    const failedLabels = settled.flatMap((item, position) => item.status === "rejected"
      ? [INDICES.find((index) => index.code === eligibleCodes[position])?.label ?? eligibleCodes[position]]
      : []);

    const weightedCodes = portfolioComparisons.filter((item) => (Number(portfolioWeights[item.indexCode]) || 0) > 0);
    const portfolioInputs = weightedCodes.map((item) => {
      const opportunityItem = successful.find((entry) => entry.code === item.indexCode);
      return opportunityItem ? {
        code: item.indexCode,
        label: item.label,
        weightPercent: Number(portfolioWeights[item.indexCode]) || 0,
        multiplier: opportunityItem.multiplier,
      } : null;
    });
    const opportunityPortfolio = portfolioWeightsAreValid && Math.abs(portfolioTotal - 100) < 0.000001 &&
      portfolioInputs.length > 0 && portfolioInputs.every((item) => item !== null)
      ? calculateBuyAndHoldPortfolio(
          portfolioInputs.filter((item): item is NonNullable<typeof item> => item !== null),
          input.amount,
          input.amount,
        )
      : null;

    const alternatives = [
      ...successful.map((item) => ({
        code: item.code,
        label: item.label,
        targetValue: item.targetValue,
        changePercent: item.changePercent,
      })),
      ...(opportunityPortfolio ? [{
        code: "PORTFOLIO",
        label: "Kişisel portföyünüz",
        targetValue: opportunityPortfolio.targetValue,
        changePercent: opportunityPortfolio.changePercent,
        isPortfolio: true,
      }] : []),
    ].sort((first, second) => second.targetValue - first.targetValue);

    if (alternatives.length === 0) throw new Error("Bu tarih için karşılaştırılabilir yatırım verisi bulunamadı.");

    return {
      ...input,
      targetDate: target,
      alternatives,
      unavailableLabels: [
        ...skippedCodes.map((code) => INDICES.find((item) => item.code === code)?.label ?? code),
        ...failedLabels,
        ...(!opportunityPortfolio && weightedCodes.length > 0 ? ["Kişisel portföy"] : []),
      ],
    };
  }

  async function calculateRecurringOpportunityCost(input: RecurringOpportunityInput): Promise<RecurringOpportunityResult> {
    const contributionPlan = createRecurringContributionPlan({ ...input, targetDate: DEFAULT_TARGET_DATE, maxMonths: MAX_MONTHLY_CONTRIBUTIONS });
    const { cohorts, totalSpent } = contributionPlan;
    const multiplierCache = new Map<string, Promise<number>>();
    const multiplierFor = (code: IndexCode, contributionDate: string) => {
      const key = `${code}:${contributionDate}`;
      const cached = multiplierCache.get(key);
      if (cached) return cached;
      const request = getPeriodMultiplier(code, contributionDate, DEFAULT_TARGET_DATE);
      multiplierCache.set(key, request);
      return request;
    };

    const inflationProtectedValue = (await Promise.all(cohorts.map(async (cohort) => cohort.amount * await multiplierFor("TUFE", cohort.date))))
      .reduce((total, value) => total + value, 0);
    const eligibleCodes = SAVINGS_INDEX_CODES.filter((code) => code !== "BTC" || cohorts[0].date >= BITCOIN_MIN_DATE);
    const settled = await Promise.allSettled(eligibleCodes.map(async (code) => {
      const values = await Promise.all(cohorts.map(async (cohort) => cohort.amount * await multiplierFor(code, cohort.date)));
      const targetValue = values.reduce((total, value) => total + value, 0);
      return { code, label: INDICES.find((item) => item.code === code)?.label ?? code, targetValue, gain: targetValue - totalSpent };
    }));
    const successful = settled.filter((item): item is PromiseFulfilledResult<{ code: IndexCode; label: string; targetValue: number; gain: number }> => item.status === "fulfilled").map((item) => item.value);
    const unavailableLabels = settled.flatMap((item, index) => item.status === "rejected" ? [INDICES.find((entry) => entry.code === eligibleCodes[index])?.label ?? eligibleCodes[index]] : []);
    if (!eligibleCodes.includes("BTC")) unavailableLabels.push("Bitcoin");

    const weightedCodes = portfolioComparisons.filter((item) => (Number(portfolioWeights[item.indexCode]) || 0) > 0);
    const recurringPortfolioReady = portfolioWeightsAreValid && Math.abs(portfolioTotal - 100) < 0.000001 && weightedCodes.length > 0 && weightedCodes.every((item) => successful.some((entry) => entry.code === item.indexCode));
    const portfolioTarget = recurringPortfolioReady ? weightedCodes.reduce((total, item) => {
      const alternative = successful.find((entry) => entry.code === item.indexCode)!;
      return total + alternative.targetValue * (Number(portfolioWeights[item.indexCode]) || 0) / 100;
    }, 0) : null;
    const alternatives = [...successful.map((item) => ({ ...item })), ...(portfolioTarget === null ? [] : [{ code: "PORTFOLIO", label: "Kişisel portföyünüz", targetValue: portfolioTarget, gain: portfolioTarget - totalSpent, isPortfolio: true }])].sort((a, b) => b.targetValue - a.targetValue);
    if (alternatives.length === 0) throw new Error("Bu dönem için karşılaştırılabilir yatırım verisi bulunamadı.");
    if (!recurringPortfolioReady && weightedCodes.length > 0) unavailableLabels.push("Kişisel portföy");
    return { ...input, targetDate: DEFAULT_TARGET_DATE, contributionCount: contributionPlan.contributionCount, totalSpent, inflationProtectedValue, alternatives, unavailableLabels };
  }

  function getPresetStartDate(years: number) {
    if (!targetDate) return "";
    const minimumDate = indexCode === "BTC"
      ? BITCOIN_MIN_DATE
      : indexCode === "BENZIN" || indexCode === "MOTORIN"
        ? FUEL_MIN_DATE
        : MIN_DATE;
    const calculatedDate = subtractYearsIso(targetDate, years);
    return calculatedDate < minimumDate ? minimumDate : calculatedDate;
  }

  function applyDatePreset(years: number) {
    const presetDate = getPresetStartDate(years);
    if (!presetDate || presetDate >= targetDate) return;
    setStartDate(presetDate);
    markDirty();
  }

  function toggleScenario(code: IndexCode) {
    if (scenarioCodes.includes(code)) {
      if (scenarioCodes.length === 1) {
        setScenarioNote("Grafikte en az bir ölçüt seçili kalmalıdır.");
        return;
      }

      setScenarioNote("");
      setScenarioSeries([]);
      setScenarioCpiPoints([]);
      setIsScenarioLoading(true);
      setScenarioCodes(scenarioCodes.filter((item) => item !== code));
      return;
    }

    if (scenarioCodes.length >= 3) {
      setScenarioNote("Aynı grafikte en fazla üç ölçüt karşılaştırılabilir.");
      return;
    }

    setScenarioNote("");
    setScenarioSeries([]);
    setScenarioCpiPoints([]);
    setIsScenarioLoading(true);
    setScenarioCodes([...scenarioCodes, code]);
  }

  function persistSavedScenarios(nextScenarios: SavedScenario[]) {
    window.localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(nextScenarios));
    setSavedScenarios(nextScenarios);
  }

  function handleSaveScenario() {
    if (!result || !resultLensReady || isComparisonLoading || comparisons.length === 0) return;

    const defaultName = result.calculationMode === "reverse"
      ? `${formatMoney(result.inputAmount, "TRY")} ${result.goalValueMode === "purchasing-power" ? "alım gücü" : "hedefi"} · ${selectedIndex.label}`
      : `${formatMoney(result.numericAmount, currency)} · ${selectedIndex.label}`;
    const nextScenario: SavedScenario = {
      id: crypto.randomUUID(),
      name: savedScenarioName.trim() || defaultName,
      savedAt: new Date().toISOString(),
      amount: result.inputAmount,
      resultLens: resultLenses ? resultLens : "gross",
      calculationMode: result.calculationMode,
      goalValueMode: result.goalValueMode ?? undefined,
      currency,
      startDate,
      targetDate,
      indexCode,
      targetTryValue: result.targetTryValue,
      changePercent: result.changePercent,
      realChange,
      selectedRank,
      comparisonCount: comparisons.length,
      buyCostPercent: costAnalysis ? numericCostValues[0] : 0,
      sellCostPercent: costAnalysis ? numericCostValues[1] : 0,
      annualCostPercent: costAnalysis ? numericCostValues[2] : 0,
      delayDays,
    };

    try {
      persistSavedScenarios([nextScenario, ...savedScenarios].slice(0, MAX_SAVED_SCENARIOS));
      setSavedScenarioName("");
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  function loadSavedScenario(savedScenario: SavedScenario) {
    markDirty();
    setCalculationMode(savedScenario.calculationMode ?? "forward");
    setReverseGoalValueMode(savedScenario.goalValueMode ?? "nominal");
    setAmount(String(savedScenario.amount));
    setCurrency(savedScenario.currency);
    setStartDate(savedScenario.startDate);
    setTargetDate(savedScenario.targetDate);
    setIndexCode(savedScenario.indexCode);
    setBuyCostPercent(String(savedScenario.buyCostPercent ?? 0));
    setSellCostPercent(String(savedScenario.sellCostPercent ?? 0));
    setAnnualCostPercent(String(savedScenario.annualCostPercent ?? 0));
    setDelayDays(savedScenario.delayDays ?? 30);
    setResultLens(parseResultLens(savedScenario.resultLens));
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  function deleteSavedScenario(id: string) {
    try {
      persistSavedScenarios(savedScenarios.filter((item) => item.id !== id));
      setConfirmClearSaved(false);
    } catch {
      // Tarayıcı depolaması kapalı olsa bile kayıt ekrandan kaldırılabilir.
      setSavedScenarios(savedScenarios.filter((item) => item.id !== id));
    }
  }

  function clearSavedScenarios() {
    if (!confirmClearSaved) {
      setConfirmClearSaved(true);
      return;
    }

    try {
      window.localStorage.removeItem(SAVED_SCENARIOS_KEY);
    } finally {
      setSavedScenarios([]);
      setConfirmClearSaved(false);
    }
  }

  async function handleSavingsSimulation() {
    if (!result || !SAVINGS_INDEX_CODES.includes(indexCode)) return;

    const numericContribution = Number(monthlyContribution);
    const numericGoal = Number(savingsGoal);
    const numericAnnualIncrease = Number(annualContributionIncrease);
    if (savingsMode === "contribution" && (!Number.isFinite(numericContribution) || numericContribution <= 0)) {
      setSavingsError("Aylık ekleme için sıfırdan büyük geçerli bir tutar girin.");
      setSavingsSimulation(null);
      return;
    }

    if (savingsMode === "goal" && (!Number.isFinite(numericGoal) || numericGoal <= 0)) {
      setSavingsError("Hedef için sıfırdan büyük geçerli bir tutar girin.");
      setSavingsSimulation(null);
      return;
    }

    if (!Number.isFinite(numericAnnualIncrease) || numericAnnualIncrease < 0 || numericAnnualIncrease > 100) {
      setSavingsError("Yıllık katkı artışı için 0 ile 100 arasında geçerli bir oran girin.");
      setSavingsSimulation(null);
      return;
    }

    if (!costsAreValid) {
      setSavingsError("Birikim planı için maliyet yüzdelerini 0 ile 100 arasında geçerli biçimde girin.");
      setSavingsSimulation(null);
      return;
    }

    if (savingsMode === "goal" && savingsGoalValueMode === "purchasing-power" && cpiMultiplier === null) {
      setSavingsError("Alım gücü hedefi için TÜFE karşılaştırmasının hazırlanmasını bekleyin.");
      setSavingsSimulation(null);
      return;
    }

    const contributionDates = createMonthlyContributionDates(startDate, targetDate);
    if (contributionDates.length === 0) {
      setSavingsError("Düzenli birikim hesabı için tarihler arasında en az bir tam ay olmalıdır.");
      setSavingsSimulation(null);
      return;
    }

    if (contributionDates.length > MAX_MONTHLY_CONTRIBUTIONS) {
      setSavingsError("Düzenli birikim simülatörü en fazla 10 yıllık aylık eklemeyi hesaplar.");
      setSavingsSimulation(null);
      return;
    }

    setSavingsError("");
    setSavingsSimulation(null);
    setIsSavingsLoading(true);
    const requestId = ++savingsRequestRef.current;

    try {
      const cacheKey = `${indexCode}:${startDate}:${targetDate}`;
      let contributionMultipliers = savingsMultiplierCacheRef.current.get(cacheKey);

      if (contributionMultipliers === undefined) {
        contributionMultipliers = [];
        const batchSize = 6;

        for (let index = 0; index < contributionDates.length; index += batchSize) {
          const batch = contributionDates.slice(index, index + batchSize);
          const multipliers = await Promise.all(
            batch.map((date) => getPeriodMultiplier(indexCode, date, targetDate)),
          );
          contributionMultipliers.push(...multipliers);
        }

        savingsMultiplierCacheRef.current.set(cacheKey, contributionMultipliers);
      }

      const grossContributionPlan = calculateContributionPlanWeights(contributionMultipliers, numericAnnualIncrease);
      const netContributionMultipliers = contributionMultipliers.map((multiplier, index) => (
        multiplier * calculateCostRetentionFactor(
          getPeriodYears(contributionDates[index], targetDate),
          numericCostValues[0],
          numericCostValues[1],
          numericCostValues[2],
        )
      ));
      const netFlatContributionMultiplierSum = netContributionMultipliers.reduce((total, multiplier) => total + multiplier, 0);
      const netContributionPlan = calculateContributionPlanWeights(netContributionMultipliers, numericAnnualIncrease);
      const initialRetentionFactor = calculateCostRetentionFactor(
        periodYears,
        numericCostValues[0],
        numericCostValues[1],
        numericCostValues[2],
      );
      const netInitialTargetValue = result.targetTryValue * initialRetentionFactor;

      const effectiveGoalAmount = savingsMode === "goal" && savingsGoalValueMode === "purchasing-power"
        ? calculateNominalGoalFromPurchasingPower(numericGoal, cpiMultiplier!)
        : numericGoal;
      const plannedMonthlyContribution = savingsMode === "goal"
        ? calculateRequiredMonthlyContribution(effectiveGoalAmount, netInitialTargetValue, netContributionPlan.weightedMultiplierSum)
        : numericContribution;
      const finalMonthlyContribution = plannedMonthlyContribution * netContributionPlan.finalContributionFactor;
      const totalContributions = plannedMonthlyContribution * netContributionPlan.contributionFactorSum;
      const grossContributionsTargetValue = plannedMonthlyContribution * grossContributionPlan.weightedMultiplierSum;
      const contributionsTargetValue = plannedMonthlyContribution * netContributionPlan.weightedMultiplierSum;
      const totalPaid = result.startingTryValue + totalContributions;
      const grossTargetValue = result.targetTryValue + grossContributionsTargetValue;
      const targetValue = netInitialTargetValue + contributionsTargetValue;
      const gain = targetValue - totalPaid;
      const timingComparison = compareContributionTimingTotals(
        contributionsTargetValue,
        totalContributions,
        result.multiplier * initialRetentionFactor,
      );
      const upfrontTargetValue = netInitialTargetValue + timingComparison.upfrontTargetValue;
      const flatTargetValue = netInitialTargetValue + plannedMonthlyContribution * netFlatContributionMultiplierSum;
      const stressScenarios = calculateSavingsStressScenarios(
        plannedMonthlyContribution,
        numericAnnualIncrease,
        netContributionMultipliers,
        targetValue,
      );

      if (requestId !== savingsRequestRef.current) return;

      setSelectedStressMisses(stressScenarios.some((item) => item.missedCount === 3)
        ? 3
        : stressScenarios[0]?.missedCount ?? 1);

      setSavingsSimulation({
        mode: savingsMode,
        monthlyContribution: plannedMonthlyContribution,
        finalMonthlyContribution,
        annualIncreasePercent: numericAnnualIncrease,
        goalInputAmount: savingsMode === "goal" ? numericGoal : null,
        goalAmount: savingsMode === "goal" ? effectiveGoalAmount : null,
        goalValueMode: savingsMode === "goal" ? savingsGoalValueMode : null,
        contributionCount: contributionDates.length,
        totalPaid,
        initialTargetValue: netInitialTargetValue,
        contributionsTargetValue,
        grossTargetValue,
        costImpact: grossTargetValue - targetValue,
        costsApplied: numericCostValues.some((value) => value > 0),
        buyCostPercent: numericCostValues[0],
        sellCostPercent: numericCostValues[1],
        annualCostPercent: numericCostValues[2],
        flatTargetValue,
        increaseImpact: targetValue - flatTargetValue,
        targetValue,
        gain,
        gainPercent: totalPaid > 0 ? gain / totalPaid * 100 : 0,
        upfrontTargetValue,
        strategyDifference: timingComparison.difference,
        strategyWinner: timingComparison.winner,
        stressScenarios,
      });
    } catch (error) {
      if (requestId !== savingsRequestRef.current) return;
      setSavingsError(error instanceof Error ? error.message : "Düzenli birikim verileri alınamadı.");
    } finally {
      if (requestId === savingsRequestRef.current) setIsSavingsLoading(false);
    }
  }

  function createShareUrl() {
    if (!result) return new URL("https://para-hesaplayici.utkanyilmaz.chatgpt.site/sonuc");
    return historicalShareUrl({
      amount: String(result.inputAmount), currency, start: startDate, target: targetDate,
      index: indexCode, mode: result.calculationMode, goalValue: result.goalValueMode ?? "nominal",
      delay: String(delayDays), label: selectedIndex.label, resultValue: String(result.targetTryValue),
    }, costAnalysis ? numericCostValues : null, resultLenses ? resultLens : null);
  }

  async function handleShare() {
    if (!result || !resultLensReady || typeof window === "undefined") return;

    const shareUrl = createShareUrl();
    trackAnalyticsEvent("share_started", "main", "native_or_copy");
    trackCampaignEvent("campaign_shared");
    window.history.replaceState(null, "", `${shareUrl.pathname}${shareUrl.search}${shareUrl.hash}`);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Para Hesaplayıcı sonucu",
          text: result.calculationMode === "reverse"
            ? `${formatMoney(result.inputAmount, "TRY")} ${result.goalValueMode === "purchasing-power" ? "başlangıç alım gücü" : "hedefi"} için gereken tarihsel ${selectedIndex.label} tutarı`
            : `${formatMoney(result.numericAmount, currency)} tutarının ${selectedIndex.label} karşılaştırması`,
          url: shareUrl.toString(),
        });
        setShareStatus("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await copyText(shareUrl.toString());
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  }

  function handleCsvDownload() {
    if (!result || comparisons.length === 0 || typeof window === "undefined") return;

    try {
      const rows: (string | number)[][] = [
        ["PARA HESAPLAYICI RAPORU", ""],
        ["Hesaplama modu", result.calculationMode === "reverse" ? "Hedeften geriye" : "Tutardan sonuca"],
        ...(resultLenses ? resultLensCsvRows(resultLenses, resultLens) : []),
        ["Başlangıç tarihi", startDate],
        ["Hedef tarih", targetDate],
        ["Başlangıç tutarı", formatMoney(result.numericAmount, currency)],
        ...(result.calculationMode === "reverse"
          ? [
              ["Hedefin değer türü", result.goalValueMode === "purchasing-power" ? "Başlangıç alım gücü" : "Hedef tarih TL'si"],
              [result.goalValueMode === "purchasing-power" ? "Başlangıç alım gücü hedefi" : "Girilen hedef TL tutarı", formatMoney(result.inputAmount, "TRY")],
              ...(result.goalValueMode === "purchasing-power"
                ? [["Hedef tarihte gereken nominal TL", formatMoney(result.targetTryValue, "TRY")]]
                : []),
            ]
          : []),
        ["Başlangıç TL karşılığı", formatMoney(result.startingTryValue, "TRY")],
        ["Seçilen ölçüt", selectedIndex.label],
        ["Hedef TL karşılığı", formatMoney(result.targetTryValue, "TRY")],
        ["Toplam değişim", formatSignedPercent(result.changePercent)],
        ["Yıllık bileşik değişim", annualizedChange === null ? "—" : formatSignedPercent(annualizedChange)],
        ["TÜFE sonrası reel değişim", realChange === null ? "—" : formatSignedPercent(realChange)],
        [result.calculationMode === "reverse" ? "Sermaye verimliliği sırası" : "Performans sırası", selectedRank === null ? "—" : `${selectedRank} / ${comparisons.length}`],
        [result.calculationMode === "reverse" ? "En düşük başlangıç gerektiren" : "Dönem lideri", bestComparison?.label ?? "—"],
        [result.calculationMode === "reverse" ? "Başlangıç sermayesi farkı" : "Lidere göre fark", opportunityDifference === null ? "—" : formatMoney(opportunityDifference, "TRY")],
        ...(costAnalysis ? [
          [],
          ["MALİYET ETKİSİ", ""],
          ["Alış maliyeti", `%${formatNumber(numericCostValues[0])}`],
          ["Satış maliyeti", `%${formatNumber(numericCostValues[1])}`],
          ["Yıllık gider", `%${formatNumber(numericCostValues[2])}`],
          ...(result.calculationMode === "reverse" && costAdjustedGoal && costAdjustedStartingCurrencyValue !== null && costAdjustedAdditionalCurrencyValue !== null
            ? [
                ["Masrafsız gereken başlangıç", formatMoney(result.numericAmount, currency)],
                ["Masraflar dahil gereken başlangıç", formatMoney(costAdjustedStartingCurrencyValue, currency)],
                ["Ek başlangıç sermayesi", formatMoney(costAdjustedAdditionalCurrencyValue, currency)],
                ["Masraflar sonrası hedef", formatMoney(costAdjustedGoal.netTargetValue, "TRY")],
                ["Brüt değerin korunan kısmı", `%${formatNumber(costAnalysis.retainedPercent)}`],
              ]
            : [
                ["Masraf sonrası değer", formatMoney(costAnalysis.netTargetValue, "TRY")],
                ["Maliyetlerin götürdüğü tutar", formatMoney(costAnalysis.costImpact, "TRY")],
                ["Masraf sonrası değişim", formatSignedPercent(costAnalysis.netChangePercent)],
              ]),
          ...(costAndInflationOutcome ? [
            ["Masraf ve TÜFE sonrası alım gücü", formatMoney(costAndInflationOutcome.realTargetValue, "TRY")],
            ["Masraf ve TÜFE sonrası reel değişim", formatSignedPercent(costAndInflationOutcome.realNetChangePercent)],
            ["Maliyet ve enflasyonun toplam etkisi", formatMoney(costAndInflationOutcome.totalDrag, "TRY")],
          ] : []),
          ...(purchasingPowerThreshold ? [
            ["Alım gücünü korumak için gereken yıllık brüt getiri", formatSignedPercent(purchasingPowerThreshold.requiredAnnualReturnPercent)],
            ["Gerçekleşen tarihsel yıllık brüt getiri", formatSignedPercent(purchasingPowerThreshold.actualAnnualReturnPercent)],
            ["Koruma eşiğine göre fark", `${purchasingPowerThreshold.marginPercentagePoints >= 0 ? "+" : "−"}${formatNumber(Math.abs(purchasingPowerThreshold.marginPercentagePoints))} puan`],
            ["Koruma eşiği sonucu", purchasingPowerThreshold.outcome === "above" ? "Eşik geçildi" : purchasingPowerThreshold.outcome === "below" ? "Eşiğin altında kaldı" : "Eşikle aynı"],
          ] : []),
        ] : []),
        ...(livingCoverage ? [
          [],
          ["YAŞAM PAYI", ""],
          ["Gider kaynağı", "Kullanıcı beyanı; iki tarihte aynı gider kapsamı varsayılır"],
          ["Başlangıçtaki aylık gider (TL)", Number(livingExpenses.start)],
          ["Hedef tarihteki aylık gider (TL)", Number(livingExpenses.target)],
          ["Başlangıç aylık gider karşılığı (ay)", livingCoverage.startMonths],
          ["Masraf sonrası hedef aylık gider karşılığı (ay)", livingCoverage.targetMonths],
          ["Aylık gider karşılığı farkı (ay)", livingCoverage.monthDifference],
          ["Paranın net değişimi (%)", livingCoverage.nominalNetChangePercent],
          ["Beyan edilen gider değişimi (%)", livingCoverage.expenseChangePercent],
          ["Gider karşılama gücü değişimi (%)", livingCoverage.coverageChangePercent],
          ["Başlangıç gider karşılığını korumak için gereken hedef TL", livingCoverage.requiredTargetValue],
          ["Koruma tutarına göre fazlalık / açık (TL)", livingCoverage.surplus],
          ["Yaşam payı yöntemi", "O tarihteki para / o tarihteki aylık gider. Gelecek geçim süresi tahmini veya TÜFE hesabı değildir; dönem içi gider çekilişi, vergi ve sabit ücretler dahil değildir. Yüzdesel maliyetler net hedefte bir kez uygulanır."],
          ...(livingAlternatives && !isComparisonLoading ? livingAlternativesCsvRows(livingAlternatives) : []),
        ] : []),
        ...(delayAnalysis ? [
          [],
          ["TARİH HASSASİYETİ", ""],
          ["Karşılaştırma aralığı", `±${delayDays} gün`],
          ...(delayAnalysis.earlierStartDate && delayAnalysis.earlierTargetValue !== null ? [
            ["Erken başlangıç", delayAnalysis.earlierStartDate],
            ["Erken başlangıç hedef değeri", formatMoney(delayAnalysis.earlierTargetValue, "TRY")],
          ] : []),
          ["Seçilen başlangıç", startDate],
          ["Seçilen başlangıç hedef değeri", formatMoney(result.targetTryValue, "TRY")],
          ["Gecikmeli başlangıç", delayAnalysis.delayedStartDate],
          ["Gecikmeli hedef değer", formatMoney(delayAnalysis.delayedTargetValue, "TRY")],
          ["Gecikme farkı", formatMoney(Math.abs(delayAnalysis.difference), "TRY")],
          ["En iyi ile en kötü sonuç aralığı", formatMoney(delayAnalysis.spread, "TRY")],
          ["Tarih kaynaklı oynama", `%${formatNumber(delayAnalysis.spreadPercent)}`],
          ["Tarih hassasiyeti", delayAnalysis.sensitivityLevel === "low" ? "Düşük" : delayAnalysis.sensitivityLevel === "medium" ? "Orta" : "Yüksek"],
          ["Geç başlamanın sonucu", delayAnalysis.outcome === "cost" ? "Gecikme maliyeti" : delayAnalysis.outcome === "benefit" ? "Bekleme avantajı" : "Eşit"],
        ] : []),
        ...(periodProfile && costAndInflationOutcome && purchasingPowerThreshold && historyRisk && delayAnalysis ? [
          [],
          ["DÖNEM KARNESİ", ""],
          ["Örneklem özeti", periodProfile.verdict],
          ["Masraf ve TÜFE sonrası reel değişim", formatSignedPercent(costAndInflationOutcome.realNetChangePercent)],
          ["Örneklemde en büyük düşüş", `−%${formatNumber(historyRisk.maxDrawdownPercent)}`],
          ["Tarih hassasiyeti", delayAnalysis.sensitivityLevel === "low" ? "Düşük" : delayAnalysis.sensitivityLevel === "medium" ? "Orta" : "Yüksek"],
          ["Alım gücü koruma eşiği", purchasingPowerThreshold.outcome === "above" ? "Geçildi" : purchasingPowerThreshold.outcome === "below" ? "Altında kalındı" : "Tam karşılandı"],
        ] : []),
        ...(historyRisk ? [
          [],
          ["YOLCULUK RİSKİ", ""],
          ["Veri kapsamı", `${historyRisk.sampleCount} örnek nokta; tam günlük seri değildir`],
          ["En uzun örnekleme aralığı", `${historyRisk.maxSampleGapDays} gün`],
          ["Örneklemde en büyük düşüş", `−%${formatNumber(historyRisk.maxDrawdownPercent)}`],
          ["Zirve tarihi", historyRisk.peakDate],
          ["Zirvedeki değer", formatMoney(historyRisk.peakValue, "TRY")],
          ["Dip tarihi", historyRisk.troughDate],
          ["Dipteki değer", formatMoney(historyRisk.troughValue, "TRY")],
          ["Zirveden kayıp", formatMoney(historyRisk.lossAmount, "TRY")],
          ["Telafi için gereken yükseliş", `%${formatNumber(historyRisk.requiredRecoveryPercent)}`],
          ["Düşüş süresi", `${historyRisk.declineDays} gün`],
          ["Toparlanma", historyRisk.maxDrawdownPercent === 0
            ? "Gerileme görülmedi"
            : historyRisk.recoveryDays === null
              ? "Henüz toparlanmadı"
              : `${historyRisk.recoveryDays} gün`],
          ["En derin düşüşün zirve-altı süresi", `${historyRisk.underwaterDays} gün`],
          ["En uzun gözlenen zirve-altı süresi", `${historyRisk.longestUnderwaterDays} gün`],
          ["En uzun beklemenin başlangıcı", historyRisk.longestUnderwaterStartDate ?? "Düşüş gözlenmedi"],
          ["En uzun beklemenin son gözlemi", historyRisk.longestUnderwaterEndDate ?? "Düşüş gözlenmedi"],
          ["En uzun beklemenin durumu", historyRisk.longestUnderwaterRecovered ? "Tamamlandı veya düşüş gözlenmedi" : "Hedef tarihinde sürüyor"],
          ["Açık düşüş dönemi var mı?", historyRisk.hasOpenDrawdown ? "Evet; nihai süre bilinmiyor" : "Hayır"],
          ...(riskLimitAssessment ? [
            ["Kişisel geçici kayıp sınırı", `%${lossLimitPercent}`],
            ["Kişisel bekleme sınırı", `${durationLimitDays} gün`],
            ["Kayıp sınırı sonucu", riskLimitCopy!.loss],
            ["Bekleme sınırı sonucu", riskLimitCopy!.duration],
          ] : []),
          ["En zayıf veri aralığı", formatSignedPercent(historyRisk.worstIntervalPercent)],
          ["Pozitif aralık oranı", `%${formatNumber(historyRisk.positiveIntervalPercent)}`],
        ] : []),
        ...(savingsSimulation ? [
          [],
          ["DÜZENLİ BİRİKİM SİMÜLASYONU", ""],
          ["Planlama modu", savingsSimulation.mode === "goal" ? "Hedeften aylık tutar" : "Aylık tutardan sonuç"],
          ...(savingsSimulation.goalValueMode === null ? [] : [
            ["Hedefin değer türü", savingsSimulation.goalValueMode === "purchasing-power" ? "Başlangıç alım gücü" : "Hedef tarih TL'si"],
            ...(savingsSimulation.goalValueMode === "purchasing-power" ? [
              ["Başlangıç alım gücü hedefi", formatMoney(savingsSimulation.goalInputAmount!, "TRY")],
              ["Hedef tarihte gereken nominal tutar", formatMoney(savingsSimulation.goalAmount!, "TRY")],
            ] : [["Hedef tutar", formatMoney(savingsSimulation.goalAmount!, "TRY")]]),
          ]),
          ["Yıllık katkı artışı", `%${formatNumber(savingsSimulation.annualIncreasePercent)}`],
          ["İlk aylık ekleme", formatMoney(savingsSimulation.monthlyContribution, "TRY")],
          ["Son yıl aylık ekleme", formatMoney(savingsSimulation.finalMonthlyContribution, "TRY")],
          ["Aylık ekleme sayısı", savingsSimulation.contributionCount],
          ["Toplam yatırılan", formatMoney(savingsSimulation.totalPaid, "TRY")],
          ["Alış maliyeti", `%${formatNumber(savingsSimulation.buyCostPercent)}`],
          ["Satış maliyeti", `%${formatNumber(savingsSimulation.sellCostPercent)}`],
          ["Yıllık gider", `%${formatNumber(savingsSimulation.annualCostPercent)}`],
          ["Masrafsız plan değeri", formatMoney(savingsSimulation.grossTargetValue, "TRY")],
          ["Maliyetlerin götürdüğü", formatMoney(savingsSimulation.costImpact, "TRY")],
          ["Hedef tarihte net değer", formatMoney(savingsSimulation.targetValue, "TRY")],
          ["Sabit katkıyla hedef değer", formatMoney(savingsSimulation.flatTargetValue, "TRY")],
          ["Yıllık artışın hedefe katkısı", formatMoney(savingsSimulation.increaseImpact, "TRY")],
          ["Toplam yatırılana göre fark", formatMoney(savingsSimulation.gain, "TRY")],
          ["Aylık eklemeler başta hazır olsaydı", formatMoney(savingsSimulation.upfrontTargetValue, "TRY")],
          ["Zamanlama farkı", formatMoney(Math.abs(savingsSimulation.strategyDifference), "TRY")],
          ["Zamanlama lideri", savingsSimulation.strategyWinner === "recurring" ? "Düzenli ekleme" : savingsSimulation.strategyWinner === "upfront" ? "Toplu ekleme" : "Eşit"],
          [],
          ["PLAN DAYANIKLILIK TESTİ", ""],
          ...savingsSimulation.stressScenarios.flatMap((scenario) => [
            [`${scenario.missedCount} katkı kaçarsa net değer`, formatMoney(scenario.stressedTargetValue, "TRY")],
            [`${scenario.missedCount} katkının hedef kaybı`, formatMoney(scenario.targetLoss, "TRY")],
            [`${scenario.missedCount} katkı için aylık telafi`, scenario.catchUpMonthly === null ? "Dönem içinde telafi edilemez" : formatMoney(scenario.catchUpMonthly, "TRY")],
          ]),
        ] : []),
        [],
        ["Sıra", "Ölçüt", result.calculationMode === "reverse" ? "Başlangıçta gereken TL" : "Hedef TL karşılığı", "Değişim", "Seçim"],
        ...comparisons.map((item, position) => [
          position + 1,
          item.label,
          formatMoney(result.calculationMode === "reverse" ? item.requiredStartingTryValue : item.targetTryValue, "TRY"),
          formatSignedPercent(item.changePercent),
          item.indexCode === indexCode ? "Seçiminiz" : "",
        ]),
        [],
        ["Not", "Hesaplamalar bilgilendirme amaçlıdır, yatırım tavsiyesi değildir."],
      ];
      const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(";")).join("\r\n")}`;
      const objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `para-hesaplayici-${startDate}-${targetDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadStatus("downloaded");
    } catch {
      setDownloadStatus("error");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Lütfen sıfırdan büyük geçerli bir tutar girin.");
      setResult(null);
      return;
    }

    if (startDate >= targetDate) {
      setFormError("Hedef tarih, başlangıç tarihinden sonra olmalıdır.");
      setResult(null);
      return;
    }

    if (!INDICES.some((item) => item.code === indexCode && item.available)) {
      setFormError("Bu endeksin doğrulanmış veri bağlantısı henüz hazır değil.");
      setResult(null);
      return;
    }

    if (indexCode === "BTC" && startDate < BITCOIN_MIN_DATE) {
      setFormError("Bitcoin fiyat verisi 17 Eylül 2014 tarihinden itibaren kullanılabilir.");
      setResult(null);
      return;
    }

    if ((indexCode === "BENZIN" || indexCode === "MOTORIN") && startDate < FUEL_MIN_DATE) {
      setFormError("Akaryakıt fiyat verisi 1 Ocak 2016 tarihinden itibaren kullanılabilir.");
      setResult(null);
      return;
    }

    setFormError("");
    trackAnalyticsEvent("calculation_started", indexCode.toLowerCase(), getAnalyticsSource());
    setIsLoading(true);
    setIsComparisonLoading(false);
    setResult(null);
    setComparisons([]);
    setComparisonNote("");
    setPortfolioWeights({});
    setHistoryPoints([]);
    setScenarioCodes([]);
    setScenarioSeries([]);
    setScenarioCpiPoints([]);
    setScenarioMode("nominal");
    setScenarioNote("");
    setIsHistoryLoading(false);
    setIsScenarioLoading(false);
    setSavingsSimulation(null);
    setSavingsError("");
    setIsSavingsLoading(false);
    setDelayAnalysis(null);
    setDelayError("");
    setIsDelayLoading(SAVINGS_INDEX_CODES.includes(indexCode));
    savingsRequestRef.current += 1;

    try {
      const { result: calculated, query, fxStart, fxTarget } = await calculateHistoricalResult({
        startDate, targetDate, currency, indexCode, calculationMode, reverseGoalValueMode, numericAmount,
      });
      const { startingTryValue, targetTryValue, startRate, multiplier } = calculated;
      setResult(calculated);

      const activeParams = new URLSearchParams(window.location.search);
      const cameFromOpportunity = activeParams.get("tool") === "opportunity";
      if (!cameFromOpportunity) {
        trackAnalyticsEvent("calculation_completed", indexCode.toLowerCase(), getAnalyticsSource());
        trackCampaignEvent("campaign_completed");
        if (activeParams.has("amount")) trackAnalyticsEvent("shared_link_converted", "main", "shared_link");
      }

      setIsLoading(false);
      setIsComparisonLoading(true);
      setIsHistoryLoading(true);

      void fetchHistoryPoints({
        startDate,
        targetDate,
        indexCode,
        startingTryValue,
        startRate,
      })
        .then(setHistoryPoints)
        .catch(() => setHistoryPoints([]))
        .finally(() => setIsHistoryLoading(false));

      const comparableIndices = INDICES.filter((item) => {
        if (!item.available) return false;
        if (item.code === "BTC") return startDate >= BITCOIN_MIN_DATE;
        if (item.code === "BENZIN" || item.code === "MOTORIN") return startDate >= FUEL_MIN_DATE;
        return true;
      });
      const skippedCount = INDICES.filter((item) => item.available).length - comparableIndices.length;

      const settledComparisons = await Promise.allSettled(
        comparableIndices.map(async (item) => {
          const itemMultiplier = item.code === indexCode
            ? multiplier
            : await getComparisonMultiplier(item.code, query, fxStart, fxTarget);

          return {
            indexCode: item.code,
            label: item.label,
            multiplier: itemMultiplier,
            targetTryValue: startingTryValue * itemMultiplier,
            requiredStartingTryValue: targetTryValue / itemMultiplier,
            changePercent: (itemMultiplier - 1) * 100,
          } satisfies ComparisonResult;
        }),
      );

      const successfulComparisons = settledComparisons
        .filter((item): item is PromiseFulfilledResult<ComparisonResult> => item.status === "fulfilled")
        .map((item) => item.value)
        .sort((first, second) => calculationMode === "reverse"
          ? first.requiredStartingTryValue - second.requiredStartingTryValue
          : second.targetTryValue - first.targetTryValue);
      const failedCount = settledComparisons.length - successfulComparisons.length;

      setComparisons(successfulComparisons);
      const investableComparisons = successfulComparisons.filter((item) => SAVINGS_INDEX_CODES.includes(item.indexCode));
      const presetValues = investableComparisons.map((item) => PORTFOLIO_PRESETS.dengeli[item.indexCode] ?? 0);
      const presetTotal = presetValues.reduce((total, value) => total + value, 0);
      let assignedPortfolioWeight = 0;
      const defaultPortfolioWeights: Partial<Record<IndexCode, string>> = {};
      investableComparisons.forEach((item, position) => {
        const weight = position === investableComparisons.length - 1
          ? 100 - assignedPortfolioWeight
          : Math.round((presetTotal > 0 ? presetValues[position] / presetTotal : 1 / investableComparisons.length) * 100);
        assignedPortfolioWeight += weight;
        defaultPortfolioWeights[item.indexCode] = String(weight);
      });
      setPortfolioWeights(defaultPortfolioWeights);
      const defaultScenarioCodes = [indexCode, successfulComparisons[0]?.indexCode, "TUFE" as IndexCode]
        .filter((code, position, codes): code is IndexCode => Boolean(code) && codes.indexOf(code) === position)
        .filter((code) => successfulComparisons.some((item) => item.indexCode === code))
        .slice(0, 3);
      setScenarioSeries([]);
      setScenarioCpiPoints([]);
      setIsScenarioLoading(defaultScenarioCodes.length > 0);
      setScenarioCodes(defaultScenarioCodes);
      if (skippedCount > 0 || failedCount > 0) {
        const notes = [];
        if (skippedCount > 0) notes.push(`${skippedCount} ölçüt seçilen başlangıç tarihinde henüz mevcut değildi`);
        if (failedCount > 0) notes.push(`${failedCount} ölçütün verisi şu anda alınamadı`);
        setComparisonNote(`${notes.join("; ")}.`);
      }
    } catch (error) {
      trackAnalyticsEvent("calculation_failed", indexCode.toLowerCase(), getAnalyticsSource());
      setFormError(error instanceof Error ? error.message : "Kur verisi alınamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
      setIsComparisonLoading(false);
    }
  }

  return (
    <main className={`app-shell${result ? " result-ready" : ""}`} data-analysis-view={analysisView}>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Para Hesaplayıcı ana sayfa">
          <span className="brand-mark" aria-hidden="true">₺</span>
          <span>
            <strong>Para Hesaplayıcı</strong>
            <small>Finansal karar araçları</small>
          </span>
        </a>
        <span className="live-badge"><i aria-hidden="true" /> Kaynaklı tarihsel veri</span>
      </header>

      <section className="intro" id="top">
        <h1>{result ? "O günkü paranız, bugün ne ederdi?" : "Paranızla ilgili kararları karşılaştırın."}</h1>
        <p className="intro-copy">
          {result
            ? "Bir tutarı ileri taşıyın veya hedefinizden geriye hesaplayın."
            : "Borç planlarını karşılaştırın, maaşınızın alım gücünü ölçün ve büyük harcamaların fırsat maliyetini görün."}
        </p>
      </section>

      {!result && <ToolsHub />}

      <section className="workspace" aria-label="Para değeri hesaplama alanı">
        <form className="calculator-card" onSubmit={handleSubmit} noValidate ref={formRef}>
          <div className="section-heading">
            <span className="step-number">01</span>
            <div>
              <h2>Hesaplama bilgileri</h2>
              <p>{calculationMode === "forward"
                ? "Başlangıç tutarını ve karşılaştırma ölçütünü belirleyin."
                : reverseGoalValueMode === "purchasing-power"
                  ? "Başlangıç alım gücü hedefini girin; hedef tarihte gereken sermayeyi bulun."
                  : "Hedef TL tutarını girin; başlangıçta gereken miktarı bulun."}</p>
            </div>
          </div>

          <div className="calculation-mode-switch" aria-label="Hesaplama yönü">
            <button
              aria-pressed={calculationMode === "forward"}
              className={calculationMode === "forward" ? "active" : ""}
              onClick={() => { setCalculationMode("forward"); markDirty(); }}
              type="button"
            >
              <strong>Tutardan sonuca</strong>
              <small>Geçmişteki para hedefte ne olurdu?</small>
            </button>
            <button
              aria-pressed={calculationMode === "reverse"}
              className={calculationMode === "reverse" ? "active" : ""}
              onClick={() => { setCalculationMode("reverse"); markDirty(); }}
              type="button"
            >
              <strong>Hedeften geriye</strong>
              <small>Hedef için geçmişte ne gerekirdi?</small>
            </button>
          </div>

          <div className="amount-row">
            <label className="field amount-field">
              <span>{calculationMode === "forward"
                ? "Başlangıç tutarı"
                : reverseGoalValueMode === "purchasing-power"
                  ? "Başlangıç alım gücü hedefi"
                  : "Hedef TL tutarı"}</span>
              <div className="input-with-symbol">
                <span aria-hidden="true">{calculationMode === "forward" ? selectedCurrency.symbol : "₺"}</span>
                <input inputMode="decimal" min="0.01" name="amount" onChange={(event) => { setAmount(event.target.value); markDirty(); }} placeholder="10.000" step="any" type="number" value={amount} />
              </div>
            </label>

            <label className="field currency-field">
              <span>{calculationMode === "forward" ? "Para birimi" : "Başlangıç para birimi"}</span>
              <select name="currency" onChange={(event) => { setCurrency(event.target.value as CurrencyCode); markDirty(); }} value={currency}>
                {CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.label}</option>)}
              </select>
            </label>
          </div>

          {calculationMode === "reverse" && (
            <div className="reverse-goal-value-control">
              <span>Hedef hangi değerde?</span>
              <div role="group" aria-label="Ters hesaplama hedefinin değer türü">
                <button
                  aria-pressed={reverseGoalValueMode === "nominal"}
                  className={reverseGoalValueMode === "nominal" ? "active" : ""}
                  onClick={() => { setReverseGoalValueMode("nominal"); markDirty(); }}
                  type="button"
                >
                  Hedef tarih TL’si
                </button>
                <button
                  aria-pressed={reverseGoalValueMode === "purchasing-power"}
                  className={reverseGoalValueMode === "purchasing-power" ? "active" : ""}
                  onClick={() => { setReverseGoalValueMode("purchasing-power"); markDirty(); }}
                  type="button"
                >
                  Başlangıç alım gücü
                </button>
              </div>
              <small>{reverseGoalValueMode === "purchasing-power"
                ? "Girilen hedef, dönemin gerçek TÜFE değişimiyle hedef tarih TL’sine çevrilir."
                : "Girilen tutar hedef tarihindeki nominal TL hedefidir."}</small>
            </div>
          )}

          <div className="date-grid">
            <label className="field">
              <span>Başlangıç tarihi</span>
              <input
                max={targetDate || MAX_DATE}
                min={indexCode === "BTC" ? BITCOIN_MIN_DATE : indexCode === "BENZIN" || indexCode === "MOTORIN" ? FUEL_MIN_DATE : MIN_DATE}
                name="startDate"
                onChange={(event) => { setStartDate(event.target.value); markDirty(); }}
                type="date"
                value={startDate}
              />
            </label>
            <div className="date-connector" aria-hidden="true"><span>→</span></div>
            <label className="field">
              <span>Hedef tarih</span>
              <input max={MAX_DATE} min={startDate || MIN_DATE} name="targetDate" onChange={(event) => { setTargetDate(event.target.value); markDirty(); }} type="date" value={targetDate} />
            </label>
          </div>

          <div className="date-presets" aria-label="Hazır tarih aralıkları">
            <span>Hızlı seçim</span>
            <div>
              {DATE_PRESETS.map((preset) => {
                const presetDate = getPresetStartDate(preset.years);
                const isActive = presetDate !== "" && startDate === presetDate;
                const isDisabled = presetDate === "" || presetDate >= targetDate;

                return (
                  <button
                    aria-pressed={isActive}
                    className={isActive ? "active" : ""}
                    disabled={isDisabled}
                    key={preset.years}
                    onClick={() => applyDatePreset(preset.years)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <fieldset className="index-fieldset">
            <legend>Hangi ölçüte göre hesaplansın?</legend>
            <div className="index-groups">
              <section className="index-group" aria-labelledby="finance-group-title">
                <h3 id="finance-group-title">Finansal ölçütler</h3>
                <div className="index-grid">
                  {financeIndices.map((item) => (
                    <label className={`index-option${item.available ? "" : " unavailable"}`} key={item.code}>
                      <input checked={indexCode === item.code} disabled={!item.available} name="index" onChange={() => { setIndexCode(item.code); markDirty(); }} type="radio" value={item.code} />
                      <span className="radio-dot" aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                      {!item.available && <em>Yakında</em>}
                    </label>
                  ))}
                </div>
              </section>

              <section className="index-group daily-group" aria-labelledby="daily-group-title">
                <div className="group-heading">
                  <h3 id="daily-group-title">Günlük hayat</h3>
                  <span>Alım gücü</span>
                </div>
                <div className="index-grid">
                  {dailyIndices.map((item) => (
                    <label className={`index-option${item.available ? "" : " unavailable"}`} key={item.code}>
                      <input checked={indexCode === item.code} disabled={!item.available} name="index" onChange={() => { setIndexCode(item.code); markDirty(); }} type="radio" value={item.code} />
                      <span className="radio-dot" aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                      {!item.available && <em>Yakında</em>}
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </fieldset>

          {formError && <p className="form-error" role="alert">{formError}</p>}

          <button className="calculate-button" disabled={isLoading} type="submit">
            {isLoading ? "Veriler alınıyor…" : calculationMode === "reverse" ? "Gereken tutarı hesapla" : "Değeri hesapla"}
            <span aria-hidden="true">{isLoading ? "•••" : "→"}</span>
          </button>

          <p className="data-note">
            Döviz TCMB referans kurlarını, TÜFE TÜİK aylık değişimlerini, gram altın XAU
            referansını kullanır. BIST 100 temettüleri içermez; Bitcoin BTC/USD kapanışı ve TCMB USD/TL kurunu,
            mevduat sonucu ise brüt ve stopaj hariç değeri gösterir. Akaryakıt EPDK ulusal
            ortalamasını, asgari ücret karşılaştırması resmî aylık net tutarı kullanır.
          </p>
        </form>

        <aside className="result-card" aria-live="polite" aria-busy={isLoading}>
          <div className="section-heading result-heading">
            <span className="step-number">02</span>
            <div>
              <h2>Hesaplama sonucu</h2>
              <p>{selectedIndex.label} değişimine göre karşılık</p>
            </div>
          </div>

          {result ? (
            <div className="result-content">
              <div className="result-period">
                <span>{result.startReference}</span>
                <div><i /><small>{selectedIndex.label}</small><i /></div>
                <span>{result.targetReference}</span>
              </div>

              {resultLenses ? (
                <ResultLensCard
                  lenses={resultLenses}
                  selected={resultLens}
                  onSelect={(lens) => {
                    setResultLens(lens);
                    setShareStatus("idle");
                    setDownloadStatus("idle");
                    setSaveStatus("idle");
                  }}
                  startDateLabel={formatDate(result.startRequestedRaw)}
                  targetDateLabel={formatDate(result.targetRequestedRaw)}
                  startingValue={result.startingTryValue}
                />
              ) : <div className="main-result">
                <span>{result.calculationMode === "reverse" ? "Başlangıç tarihinde gereken tutar" : "Hedef tarihteki TL karşılığı"}</span>
                <strong>{result.calculationMode === "reverse"
                  ? formatMoney(result.numericAmount, currency)
                  : formatMoney(result.targetTryValue, "TRY")}</strong>
                <em className={result.changePercent >= 0 ? "positive" : "negative"}>
                  %{formatNumber(Math.abs(result.changePercent))} {result.changePercent >= 0 ? "artış" : "azalış"}
                </em>
              </div>}

              <details className="result-details" open={resultLenses ? undefined : true}>
                <summary>{resultLenses ? "Brüt hesap ayrıntıları" : "Hesap ayrıntıları"}</summary>
                <dl className="result-breakdown">
                <div><dt>{result.calculationMode === "reverse" ? "Başlangıçta gereken" : "Başlangıç tutarı"}</dt><dd>{formatMoney(result.numericAmount, currency)}</dd></div>
                {result.calculationMode === "reverse" && result.goalValueMode === "purchasing-power" && (
                  <div><dt>Başlangıç alım gücü hedefi</dt><dd>{formatMoney(result.inputAmount, "TRY")}</dd></div>
                )}
                {result.calculationMode === "reverse" && (
                  <div><dt>{result.goalValueMode === "purchasing-power" ? "Hedefte gereken nominal TL" : "Hedef TL tutarı"}</dt><dd>{formatMoney(result.targetTryValue, "TRY")}</dd></div>
                )}
                {currency !== "TRY" && <div><dt>Başlangıç TL karşılığı</dt><dd>{formatMoney(result.startingTryValue, "TRY")}</dd></div>}
                <div><dt>Başlangıç {result.valueLabel}</dt><dd>{result.valueFormat === "money" ? formatMoney(result.startRate, "TRY") : result.valueFormat === "percent" ? `%${formatNumber(result.startRate, 2)}` : formatNumber(result.startRate, 4)}</dd></div>
                <div><dt>Hedef {result.valueLabel}</dt><dd>{result.valueFormat === "money" ? formatMoney(result.targetRate, "TRY") : result.valueFormat === "percent" ? `%${formatNumber(result.targetRate, 2)}` : formatNumber(result.targetRate, 4)}</dd></div>
                {result.comparisonQuantity !== null && (
                  <div><dt>Başlangıçta alınabilen</dt><dd>{formatNumber(result.comparisonQuantity, result.comparisonUnit === "litre" ? 1 : 2)} {result.comparisonUnit}</dd></div>
                )}
                <div><dt>Değer çarpanı</dt><dd>{formatNumber(result.multiplier, 4)}×</dd></div>
                {annualizedChange !== null && (
                  <div><dt>Yıllık bileşik değişim</dt><dd>{formatSignedPercent(annualizedChange)}</dd></div>
                )}
                {currency !== "TRY" && <div><dt>Hedefte {currency} karşılığı</dt><dd>{formatMoney(result.targetSelectedCurrencyValue, currency)}</dd></div>}
                </dl>
              </details>

              {!resultLenses && <p className="result-explanation">
                {result.calculationMode === "reverse"
                  ? result.goalValueMode === "purchasing-power"
                    ? <><strong>{formatMoney(result.inputAmount, "TRY")}</strong> başlangıç alım gücü hedefi, gerçek dönem TÜFE’siyle <strong>{formatMoney(result.targetTryValue, "TRY")}</strong> hedef tarih tutarına çevrildi. Bu karşılığa ulaşmak için başlangıçta {selectedIndex.label} ölçütüne göre yaklaşık <strong>{formatMoney(result.numericAmount, currency)}</strong> gerekiyordu.</>
                    : <>Hedef tarihte <strong>{formatMoney(result.targetTryValue, "TRY")}</strong> karşılığa ulaşmak için başlangıç tarihinde {selectedIndex.label} ölçütüne göre yaklaşık <strong>{formatMoney(result.numericAmount, currency)}</strong> gerekiyordu.</>
                  : result.comparisonQuantity !== null
                  ? <>{formatMoney(result.numericAmount, currency)} ile başlangıç tarihinde yaklaşık <strong>{formatNumber(result.comparisonQuantity, result.comparisonUnit === "litre" ? 1 : 2)} {result.comparisonUnit}</strong> alınabiliyordu. Aynı miktarın hedef tarihteki karşılığı yaklaşık <strong>{formatMoney(result.targetTryValue, "TRY")}</strong>.</>
                  : <>{formatMoney(result.numericAmount, currency)}, başlangıç tarihinde {selectedIndex.label} olarak tutulmuş olsaydı hedef tarihte yaklaşık <strong>{formatMoney(result.targetTryValue, "TRY")}</strong> ederdi.</>}
              </p>}

              {result.methodologyNote && <p className="methodology-note">{result.methodologyNote}</p>}

              <HistoricalReferenceNotice code={indexCode}
                requestedStart={result.startRequestedRaw} requestedTarget={result.targetRequestedRaw}
                actualStart={result.startReferenceRaw} actualTarget={result.targetReferenceRaw}
                fallbackNote={result.fallbackNote}
              />

              <div className="result-actions">
                <button
                  className={`share-button${shareStatus === "error" ? " error" : ""}`}
                  disabled={!resultLensReady}
                  onClick={handleShare}
                  type="button"
                >
                  <span aria-hidden="true">↗</span>
                  <span aria-live="polite">
                    {shareStatus === "copied"
                      ? "Bağlantı kopyalandı"
                      : shareStatus === "shared"
                        ? "Sonuç paylaşıldı"
                        : shareStatus === "error"
                          ? "Bağlantıyı kopyalayın"
                          : "Sonucu paylaş"}
                  </span>
                </button>
                <button
                  className={`download-button${downloadStatus === "error" ? " error" : ""}`}
                  disabled={isComparisonLoading || comparisons.length === 0}
                  onClick={handleCsvDownload}
                  type="button"
                >
                  <span aria-hidden="true">↓</span>
                  <span aria-live="polite">
                    {downloadStatus === "downloaded"
                      ? "CSV indirildi"
                      : downloadStatus === "error"
                        ? "İndirme başarısız"
                        : isComparisonLoading
                          ? "Rapor hazırlanıyor"
                          : "CSV raporu indir"}
                  </span>
                </button>
              </div>

              {!resultLensReady && <p className="result-lens-scope">Paylaşmak veya kaydetmek için seçili görünümün hazır olması gerekir. Brüt TL görünümüne geçebilir ya da yukarıdaki eksik bilgiyi tamamlayabilirsin.</p>}

              <div className="save-scenario-box">
                <label htmlFor="saved-scenario-name">Bu hesabı kaydet</label>
                <div>
                  <input
                    id="saved-scenario-name"
                    maxLength={60}
                    onChange={(event) => {
                      setSavedScenarioName(event.target.value);
                      setSaveStatus("idle");
                    }}
                    placeholder={`Örn. ${selectedIndex.label} senaryom`}
                    type="text"
                    value={savedScenarioName}
                  />
                  <button
                    className={saveStatus === "error" ? "error" : ""}
                    disabled={!resultLensReady || isComparisonLoading || comparisons.length === 0}
                    onClick={handleSaveScenario}
                    type="button"
                  >
                    {saveStatus === "saved"
                      ? "Kaydedildi ✓"
                      : saveStatus === "error"
                        ? "Kaydedilemedi"
                        : isComparisonLoading
                          ? "Özet hazırlanıyor"
                          : "Kaydet"}
                  </button>
                </div>
                <small>İsim isteğe bağlıdır. Kayıt yalnızca bu cihazda saklanır.</small>
              </div>
            </div>
          ) : (
            <div className="empty-result">
              <span aria-hidden="true">↗</span>
              <h3>{isLoading ? "Veriler kontrol ediliyor" : "Sonucunuz burada görünecek"}</h3>
              <p>{isLoading ? "Seçilen tarihlere ait resmî veriler getiriliyor." : "Bilgileri kontrol edip “Değeri hesapla” düğmesine basın."}</p>
            </div>
          )}
        </aside>
      </section>

      {result && (
        <>
          {isSharedVisit && (
            <section className="shared-result-welcome" aria-label="Paylaşılan sonuç bildirimi">
              <div><span>Bir sonuç bağlantısından geldiniz</span><strong>Bu hesabın bütün ayrıntıları canlı verilerle yeniden oluşturuldu.</strong><p>Tutarı veya tarihleri değiştirerek kendi senaryonuzu birkaç saniyede hazırlayabilirsiniz.</p></div>
              <button onClick={startOwnCalculation} type="button">Kendi hesabımı oluştur <span aria-hidden="true">→</span></button>
            </section>
          )}
          <section className="result-glance" aria-label="Hesaplama sonuç özeti">
            <div className="result-glance-heading">
              <span>Sonuç özeti</span>
              <strong>{selectedIndex.label} · {formatDate(startDate)} → {formatDate(targetDate)}</strong>
            </div>
            <dl>
              <div>
                <dt>{result.calculationMode === "reverse" ? "Başlangıçta gereken" : "Nominal sonuç"}</dt>
                <dd>{formatMoney(result.calculationMode === "reverse" ? result.startingTryValue : result.targetTryValue, "TRY")}</dd>
              </div>
              <div>
                <dt>{result.calculationMode === "reverse" ? "Masraf dahil gereken" : "Masraf sonrası"}</dt>
                <dd>{result.calculationMode === "reverse"
                  ? costAdjustedGoal ? formatMoney(costAdjustedGoal.requiredStartingValue, "TRY") : "—"
                  : costAnalysis ? formatMoney(costAnalysis.netTargetValue, "TRY") : "—"}</dd>
              </div>
              <div>
                <dt>Başlangıç alım gücüyle</dt>
                <dd>{resultLenses?.real.status === "ready"
                  ? formatMoney(resultLenses.real.value, "TRY")
                  : cpiMultiplier ? formatMoney(result.targetTryValue / cpiMultiplier, "TRY") : "—"}</dd>
              </div>
              <div>
                <dt>En büyük geçici kayıp</dt>
                <dd>{historyRisk ? `%${formatNumber(historyRisk.maxDrawdownPercent)}` : isHistoryLoading ? "Hesaplanıyor" : "—"}</dd>
              </div>
            </dl>
          </section>

          <nav className="analysis-navigation" aria-label="Finans laboratuvarı bölümleri" ref={analysisNavRef}>
            <div className="analysis-navigation-heading">
              <div><span>Finans laboratuvarı</span><strong>Hangi açıdan incelemek istersiniz?</strong></div>
              <small>{ANALYSIS_VIEWS.find((item) => item.id === analysisView)?.description}</small>
            </div>
            <div className="analysis-navigation-tabs">
              {ANALYSIS_VIEWS.map((item) => {
                const unavailable = !SAVINGS_INDEX_CODES.includes(indexCode) && ["purchasing", "savings", "portfolio"].includes(item.id);
                return <button
                  aria-pressed={analysisView === item.id}
                  className={analysisView === item.id ? "active" : ""}
                  disabled={unavailable}
                  key={item.id}
                  onClick={() => selectAnalysisView(item.id)}
                  title={unavailable ? "Bu bölüm finansal yatırım ölçütlerinde kullanılabilir." : item.description}
                  type="button"
                >
                  <span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong>
                </button>;
              })}
            </div>
          </nav>
        </>
      )}

      {result && SAVINGS_INDEX_CODES.includes(indexCode) && (
        <section className="cost-panel" aria-labelledby="cost-title">
          <div className="cost-header">
            <div className="section-heading">
              <span className="step-number" aria-hidden="true">%</span>
              <div>
                <div className="cost-title-line">
                  <h2 id="cost-title">Maliyet gerçeği</h2>
                  <span>Net sonuç</span>
                </div>
                <p>{result.calculationMode === "reverse"
                  ? "Hedefe masraflar sonrası gerçekten ulaşmak için gereken başlangıç sermayesini görün."
                  : "Komisyon, makas ve yıllık giderlerin brüt sonucu ne kadar düşürdüğünü görün."}</p>
              </div>
            </div>
            <span className="cost-index-badge">{selectedIndex.label}</span>
          </div>

          <div className="cost-workspace">
            <div className="cost-controls">
              <div className="cost-fields">
                {[
                  { id: "buy-cost", label: "Alış maliyeti", value: buyCostPercent, setter: setBuyCostPercent },
                  { id: "sell-cost", label: "Satış maliyeti", value: sellCostPercent, setter: setSellCostPercent },
                  { id: "annual-cost", label: "Yıllık gider", value: annualCostPercent, setter: setAnnualCostPercent },
                ].map((field) => (
                  <label className="field" htmlFor={field.id} key={field.id}>
                    <span>{field.label}</span>
                    <div className="cost-input-with-symbol">
                      <input
                        id={field.id}
                        inputMode="decimal"
                        max="99.99"
                        min="0"
                        onChange={(event) => {
                          field.setter(event.target.value);
                          setSavingsSimulation(null);
                          setSavingsError("");
                          setIsSavingsLoading(false);
                          savingsRequestRef.current += 1;
                        }}
                        step="0.01"
                        type="number"
                        value={field.value}
                      />
                      <span aria-hidden="true">%</span>
                    </div>
                  </label>
                ))}
              </div>
              <button
                disabled={numericCostValues.every((value) => value === 0)}
                onClick={() => {
                  setBuyCostPercent("0");
                  setSellCostPercent("0");
                  setAnnualCostPercent("0");
                  setSavingsSimulation(null);
                  setSavingsError("");
                  setIsSavingsLoading(false);
                  savingsRequestRef.current += 1;
                }}
                type="button"
              >
                Maliyetleri sıfırla
              </button>
              <p>Alış ve satış maliyetine komisyon veya makası; yıllık gidere fon gideri ya da yönetim ücretini yazabilirsiniz.</p>
              {!costsAreValid && <p className="cost-error" role="alert">Yüzdeler 0 ile 100 arasında olmalıdır.</p>}
            </div>

            {costAnalysis && (
              <div className="cost-result" aria-live="polite">
                {result.calculationMode === "reverse" && costAdjustedGoal && costAdjustedStartingCurrencyValue !== null && costAdjustedAdditionalCurrencyValue !== null ? (
                  <>
                    <div className="cost-result-hero">
                      <span>Masraflar dahil gereken başlangıç</span>
                      <strong>{formatMoney(costAdjustedStartingCurrencyValue, currency)}</strong>
                      <em className="negative">+{formatMoney(costAdjustedAdditionalCurrencyValue, currency)} ek sermaye</em>
                    </div>
                    <dl>
                      <div><dt>Masrafsız gereken</dt><dd>{formatMoney(result.numericAmount, currency)}</dd></div>
                      <div><dt>Hedefte net kalan</dt><dd>{formatMoney(costAdjustedGoal.netTargetValue, "TRY")}</dd></div>
                    </dl>
                  </>
                ) : (
                  <>
                    <div className="cost-result-hero">
                      <span>Masraf sonrası tahmini değer</span>
                      <strong>{formatMoney(costAnalysis.netTargetValue, "TRY")}</strong>
                      <em className={costAnalysis.netChangePercent >= 0 ? "positive" : "negative"}>{formatSignedPercent(costAnalysis.netChangePercent)} net değişim</em>
                    </div>
                    <dl>
                      <div><dt>Masrafsız değer</dt><dd>{formatMoney(result.targetTryValue, "TRY")}</dd></div>
                      <div><dt>Maliyetlerin götürdüğü</dt><dd>{formatMoney(costAnalysis.costImpact, "TRY")}</dd></div>
                    </dl>
                  </>
                )}
                <div className="cost-retention">
                  <div><span>Brüt değerin korunan kısmı</span><strong>%{formatNumber(costAnalysis.retainedPercent)}</strong></div>
                  <progress aria-label="Brüt değerin masraflar sonrası korunan yüzdesi" max="100" value={Math.min(100, costAnalysis.retainedPercent)} />
                </div>
                {costAndInflationOutcome && (
                  <div className="cost-reality">
                    <div className="cost-reality-heading">
                      <div>
                        <span>Gerçek sonuç zinciri</span>
                        <strong>Masraf ve TÜFE birlikte</strong>
                      </div>
                      <em className={costAndInflationOutcome.realNetChangePercent >= 0 ? "positive" : "negative"}>
                        {formatSignedPercent(costAndInflationOutcome.realNetChangePercent)} reel
                      </em>
                    </div>
                    <div className="cost-reality-chain">
                      <article>
                        <span>1 · Brüt dönem sonucu</span>
                        <strong>{formatMoney(costAndInflationOutcome.grossTargetValue, "TRY")}</strong>
                        <small>Maliyet uygulanmadan önce</small>
                      </article>
                      <i aria-hidden="true">→</i>
                      <article>
                        <span>2 · Masraf sonrası</span>
                        <strong>{formatMoney(costAndInflationOutcome.netTargetValue, "TRY")}</strong>
                        <small>−{formatMoney(costAndInflationOutcome.costImpact, "TRY")} maliyet etkisi</small>
                      </article>
                      <i aria-hidden="true">→</i>
                      <article className="real-value">
                        <span>3 · Başlangıç alım gücüyle</span>
                        <strong>{formatMoney(costAndInflationOutcome.realTargetValue, "TRY")}</strong>
                        <small>Gerçek dönem TÜFE’si sonrası</small>
                      </article>
                    </div>
                    {purchasingPowerThreshold && (
                      <div className={`purchasing-power-threshold ${purchasingPowerThreshold.outcome}`}>
                        <div className="threshold-verdict">
                          <span>Alım gücünü koruma eşiği</span>
                          <strong>{purchasingPowerThreshold.outcome === "above"
                            ? `${selectedIndex.label} eşiği geçti`
                            : purchasingPowerThreshold.outcome === "below"
                              ? `${selectedIndex.label} eşiğin altında kaldı`
                              : `${selectedIndex.label} eşiği tam karşıladı`}</strong>
                        </div>
                        <dl>
                          <div>
                            <dt>Gerçekleşen yıllık</dt>
                            <dd>{formatSignedPercent(purchasingPowerThreshold.actualAnnualReturnPercent)}</dd>
                          </div>
                          <div>
                            <dt>Gereken minimum yıllık</dt>
                            <dd>{formatSignedPercent(purchasingPowerThreshold.requiredAnnualReturnPercent)}</dd>
                          </div>
                          <div>
                            <dt>Eşiğe göre fark</dt>
                            <dd>{purchasingPowerThreshold.marginPercentagePoints >= 0 ? "+" : "−"}{formatNumber(Math.abs(purchasingPowerThreshold.marginPercentagePoints))} puan</dd>
                          </div>
                        </dl>
                        <p>Gereken oran; gerçek dönem TÜFE’si ile alış, yıllık gider ve satış maliyetlerini karşılayıp başlangıç alım gücünü koruyan yıllık bileşik brüt getiridir.</p>
                      </div>
                    )}
                    <p>Brüt sonuç ile gerçek alım gücü arasındaki toplam fark {formatMoney(costAndInflationOutcome.totalDrag, "TRY")}. Bu geçmiş dönem hesabıdır; vergi dahil değildir.</p>
                  </div>
                )}
                <p>{result.calculationMode === "reverse" && costAdjustedGoal
                  ? `Bu tutar alış, yıllık ve satış maliyetleri uygulandıktan sonra hedefte net ${formatMoney(costAdjustedGoal.netTargetValue, "TRY")} bırakacak şekilde hesaplandı. Vergi ve sabit ücretler dahil değildir.`
                  : "Alış maliyeti ilk yatırımı, yıllık gider elde tutma süresini, satış maliyeti ise hedef tarihteki çıkışı azaltır. Vergi hesaba katılmaz."}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {result?.calculationMode === "forward" && SAVINGS_INDEX_CODES.includes(indexCode) && (
        <LivingCoveragePanel
          startDateLabel={formatDate(result.startRequestedRaw)}
          targetDateLabel={formatDate(result.targetRequestedRaw)}
          startingValue={result.startingTryValue}
          netTargetValue={costAnalysis?.netTargetValue ?? null}
          startExpense={livingExpenses.start}
          targetExpense={livingExpenses.target}
          onExpenseChange={(field, value) => {
            setLivingExpenses((previous) => ({ ...previous, [field]: value }));
            setDownloadStatus("idle");
          }}
          state={livingCoverageState}
          alternatives={livingAlternatives}
          alternativesLoading={isComparisonLoading}
        />
      )}

      {result && SAVINGS_INDEX_CODES.includes(indexCode) && (
        <section className="delay-panel" aria-busy={isDelayLoading} aria-labelledby="delay-title">
          <div className="delay-header">
            <div className="section-heading">
              <span className="step-number" aria-hidden="true">◷</span>
              <div>
                <div className="delay-title-line">
                  <h2 id="delay-title">Beklemenin bedeli</h2>
                  <span>Tarih şansı testi</span>
                </div>
                <p>Aynı TL tutarını biraz erken veya geç yatırsaydınız sonuç ne kadar değişirdi?</p>
              </div>
            </div>
            <div className="delay-options" aria-label="Gecikme süresi" role="group">
              {DELAY_OPTIONS.map((option) => (
                <button
                  aria-pressed={delayDays === option}
                  className={delayDays === option ? "active" : ""}
                  key={option}
                  onClick={() => {
                    if (delayDays === option) return;
                    setDelayDays(option);
                    setDelayAnalysis(null);
                    setDelayError("");
                    setIsDelayLoading(true);
                  }}
                  type="button"
                >
                  {option} gün
                </button>
              ))}
            </div>
          </div>

          {isDelayLoading ? (
            <div className="delay-loading" role="status"><span /><p>Gerçek geçmiş dönem karşılaştırılıyor…</p></div>
          ) : delayAnalysis ? (
            <div className={`delay-result${delayAnalysis.earlierTargetValue !== null ? " has-earlier" : ""}`} aria-live="polite">
              {delayAnalysis.earlierStartDate && delayAnalysis.earlierTargetValue !== null && (
                <article className={delayAnalysis.bestPosition === "earlier" ? "best-timing" : ""}>
                  <span>{delayDays} gün önce</span>
                  <strong>{formatMoney(delayAnalysis.earlierTargetValue, "TRY")}</strong>
                  <small>{formatDate(delayAnalysis.earlierStartDate)} başlangıcı{delayAnalysis.bestPosition === "earlier" ? " · en yüksek" : ""}</small>
                </article>
              )}
              <article className={delayAnalysis.bestPosition === "selected" ? "best-timing" : ""}>
                <span>Seçtiğiniz tarih</span>
                <strong>{formatMoney(result.targetTryValue, "TRY")}</strong>
                <small>{formatDate(startDate)} başlangıcı{delayAnalysis.bestPosition === "selected" ? " · en yüksek" : ""}</small>
              </article>
              <article className={delayAnalysis.bestPosition === "delayed" ? "best-timing" : ""}>
                <span>{delayDays} gün sonra</span>
                <strong>{formatMoney(delayAnalysis.delayedTargetValue, "TRY")}</strong>
                <small>{formatDate(delayAnalysis.delayedStartDate)} başlangıcı{delayAnalysis.bestPosition === "delayed" ? " · en yüksek" : ""}</small>
              </article>
              <article className={`delay-verdict sensitivity-${delayAnalysis.sensitivityLevel}`}>
                <span>Tarih hassasiyeti</span>
                <strong>{delayAnalysis.sensitivityLevel === "low" ? "Düşük" : delayAnalysis.sensitivityLevel === "medium" ? "Orta" : "Yüksek"}</strong>
                <small>{formatMoney(delayAnalysis.spread, "TRY")} aralık · seçilen sonucun %{formatNumber(delayAnalysis.spreadPercent)} kadarı</small>
              </article>
              <p className="delay-impact-summary">
                {delayAnalysis.outcome === "equal"
                  ? `${delayDays} gün geç başlamak bu dönemde sonucu değiştirmedi.`
                  : delayAnalysis.outcome === "cost"
                    ? `${delayDays} gün geç başlamak hedef değerini ${formatMoney(Math.abs(delayAnalysis.difference), "TRY")} düşürdü.`
                    : `${delayDays} gün geç başlamak hedef değerini ${formatMoney(delayAnalysis.difference, "TRY")} artırdı.`}
                {delayAnalysis.earlierTargetValue === null ? " Daha erken tarih, ölçütün veri başlangıcından önce kaldığı için karşılaştırmaya alınmadı." : ""}
              </p>
            </div>
          ) : (
            <div className="delay-error" role="alert">{delayError || "Gecikme etkisi şu anda hesaplanamadı."}</div>
          )}
          <p className="delay-method-note">Karşılaştırma bütün senaryolarda aynı başlangıç TL karşılığını ve aynı hedef tarihini kullanır. Hassasiyet: %5’e kadar düşük, %5–15 orta, %15 üzeri yüksek kabul edilir. Geçmiş sonuç yatırım tavsiyesi değildir.</p>
        </section>
      )}

      {periodProfile && costAndInflationOutcome && purchasingPowerThreshold && historyRisk && delayAnalysis && (
        <section className={`period-profile-panel ${periodProfile.tone}`} aria-labelledby="period-profile-title">
          <div className="period-profile-header">
            <div className="section-heading">
              <span className="step-number" aria-hidden="true">✓</span>
              <div>
                <h2 id="period-profile-title">Dönem karnesi</h2>
                <p>Getiri, alım gücü ve yolculuk riskini tek bakışta okuyun.</p>
              </div>
            </div>
            <span>Puansız özet</span>
          </div>
          <div className="period-profile-content">
            <article className="period-profile-verdict">
              <span>Bu örneklemin özeti</span>
              <h3>{periodProfile.verdict}</h3>
              <p>{periodProfile.purchasingPowerSignal === "lost"
                ? "Nominal sonuç büyümüş görünse bile masraf ve TÜFE sonrasında başlangıç alım gücü korunamadı."
                : periodProfile.tone === "warning"
                  ? "Alım gücü arttı veya korundu; fakat düşüş ya da başlangıç tarihi etkisi belirgindi."
                  : "Alım gücü arttı veya yaklaşık korundu; örneklenen noktalarda düşüş ve seçilen yakın tarihler arasındaki fark sınırlı göründü."}</p>
            </article>
            <div className="period-profile-signals">
              <article className={costAndInflationOutcome.realNetChangePercent >= 0 ? "good" : "bad"}>
                <span>Net alım gücü</span>
                <strong>{formatSignedPercent(costAndInflationOutcome.realNetChangePercent)}</strong>
                <small>Masraf ve TÜFE sonrası</small>
              </article>
              <article className={periodProfile.drawdownLevel === "high" ? "bad" : periodProfile.drawdownLevel === "medium" ? "warn" : "good"}>
                <span>Örneklemde en büyük düşüş</span>
                <strong>−%{formatNumber(historyRisk.maxDrawdownPercent)}</strong>
                <small>{periodProfile.drawdownLevel === "low" ? "Düşük" : periodProfile.drawdownLevel === "medium" ? "Orta" : "Yüksek"} düşüş seviyesi</small>
              </article>
              <article className={delayAnalysis.sensitivityLevel === "high" ? "bad" : delayAnalysis.sensitivityLevel === "medium" ? "warn" : "good"}>
                <span>Tarih hassasiyeti</span>
                <strong>{delayAnalysis.sensitivityLevel === "low" ? "Düşük" : delayAnalysis.sensitivityLevel === "medium" ? "Orta" : "Yüksek"}</strong>
                <small>%{formatNumber(delayAnalysis.spreadPercent)} sonuç aralığı</small>
              </article>
              <article className={purchasingPowerThreshold.outcome === "below" ? "bad" : purchasingPowerThreshold.outcome === "equal" ? "warn" : "good"}>
                <span>Koruma eşiği</span>
                <strong>{purchasingPowerThreshold.outcome === "above" ? "Geçildi" : purchasingPowerThreshold.outcome === "below" ? "Altında" : "Tam eşik"}</strong>
                <small>{formatSignedPercent(purchasingPowerThreshold.requiredAnnualReturnPercent)} yıllık gerekiyordu</small>
              </article>
            </div>
          </div>
          <p className="period-profile-note">Risk özeti yalnızca {historyRisk.sampleCount} grafik noktasına dayanır; aradaki daha derin düşüşler görünmeyebilir. Karne bir yatırım puanı değildir. Örneklemdeki düşüş %10’a kadar düşük, %10–25 orta, %25 üzeri yüksek sınıflandırılır; bu sınıflar genel yatırım riskini göstermez.</p>
        </section>
      )}

      {result && SAVINGS_INDEX_CODES.includes(indexCode) && (
        <section className="savings-panel" aria-busy={isSavingsLoading} aria-labelledby="savings-title">
          <div className="savings-header">
            <div className="section-heading">
              <span className="step-number" aria-hidden="true">＋</span>
              <div>
                <div className="savings-title-line">
                  <h2 id="savings-title">Düzenli birikim simülatörü</h2>
                  <span>Yeni</span>
                </div>
                <p>Aylık katkınızı sabit tutun veya her yıl artırın; geçmiş dönemdeki sonucu görün.</p>
              </div>
            </div>
            <span className="savings-index-badge">{selectedIndex.label}</span>
          </div>

          <div className="savings-workspace">
            <div className="savings-control">
              <div className="savings-mode-switch" role="group" aria-label="Düzenli birikim hesaplama modu">
                <button
                  aria-pressed={savingsMode === "contribution"}
                  className={savingsMode === "contribution" ? "active" : ""}
                  onClick={() => {
                    setSavingsMode("contribution");
                    setSavingsSimulation(null);
                    setSavingsError("");
                    setIsSavingsLoading(false);
                    savingsRequestRef.current += 1;
                  }}
                  type="button"
                >
                  Aylık tutardan sonuç
                </button>
                <button
                  aria-pressed={savingsMode === "goal"}
                  className={savingsMode === "goal" ? "active" : ""}
                  onClick={() => {
                    setSavingsMode("goal");
                    setSavingsSimulation(null);
                    setSavingsError("");
                    setIsSavingsLoading(false);
                    savingsRequestRef.current += 1;
                  }}
                  type="button"
                >
                  Hedeften aylık tutar
                </button>
              </div>

              {savingsMode === "goal" && (
                <div className="savings-goal-value-control">
                  <span>Hedef hangi değerde?</span>
                  <div className="savings-goal-value-switch" role="group" aria-label="Birikim hedefinin değer türü">
                    <button
                      aria-pressed={savingsGoalValueMode === "nominal"}
                      className={savingsGoalValueMode === "nominal" ? "active" : ""}
                      onClick={() => {
                        setSavingsGoalValueMode("nominal");
                        setSavingsSimulation(null);
                        setSavingsError("");
                        setIsSavingsLoading(false);
                        savingsRequestRef.current += 1;
                      }}
                      type="button"
                    >
                      Hedef tarih TL’si
                    </button>
                    <button
                      aria-pressed={savingsGoalValueMode === "purchasing-power"}
                      className={savingsGoalValueMode === "purchasing-power" ? "active" : ""}
                      onClick={() => {
                        setSavingsGoalValueMode("purchasing-power");
                        setSavingsSimulation(null);
                        setSavingsError("");
                        setIsSavingsLoading(false);
                        savingsRequestRef.current += 1;
                      }}
                      type="button"
                    >
                      Başlangıç alım gücü
                    </button>
                  </div>
                  <small>
                    {savingsGoalValueMode === "purchasing-power"
                      ? "Girilen hedef, dönemin gerçek TÜFE değişimiyle hedef tarih TL'sine çevrilir."
                      : "Girilen tutar hedef tarihteki nominal TL hedefidir."}
                  </small>
                </div>
              )}

              <label className="field" htmlFor={savingsMode === "goal" ? "savings-goal" : "monthly-contribution"}>
                <span>{savingsMode === "goal"
                  ? savingsGoalValueMode === "purchasing-power"
                    ? "Başlangıç tarihinin alım gücüyle hedef"
                    : "Hedef tarihte istenen tutar"
                  : "Her ay eklenecek tutar"}</span>
                <div className="input-with-symbol">
                  <span aria-hidden="true">₺</span>
                  <input
                    id={savingsMode === "goal" ? "savings-goal" : "monthly-contribution"}
                    inputMode="decimal"
                    min="0.01"
                    onChange={(event) => {
                      if (savingsMode === "goal") setSavingsGoal(event.target.value);
                      else setMonthlyContribution(event.target.value);
                      setSavingsSimulation(null);
                      setSavingsError("");
                      setIsSavingsLoading(false);
                      savingsRequestRef.current += 1;
                    }}
                    step="any"
                    type="number"
                    value={savingsMode === "goal" ? savingsGoal : monthlyContribution}
                  />
                </div>
              </label>

              <div className="savings-increase-control">
                <label htmlFor="annual-contribution-increase">
                  <span>Yıllık katkı artışı</span>
                  <div className="savings-increase-input">
                    <input
                      id="annual-contribution-increase"
                      inputMode="decimal"
                      max="100"
                      min="0"
                      onChange={(event) => {
                        setAnnualContributionIncrease(event.target.value);
                        setSavingsSimulation(null);
                        setSavingsError("");
                        setIsSavingsLoading(false);
                        savingsRequestRef.current += 1;
                      }}
                      step="any"
                      type="number"
                      value={annualContributionIncrease}
                    />
                    <span aria-hidden="true">%</span>
                  </div>
                </label>
                <div className="savings-increase-presets" role="group" aria-label="Yıllık katkı artışı kısa seçimleri">
                  {[0, 10, 25].map((increase) => (
                    <button
                      aria-pressed={Number(annualContributionIncrease) === increase}
                      className={Number(annualContributionIncrease) === increase ? "active" : ""}
                      key={increase}
                      onClick={() => {
                        setAnnualContributionIncrease(String(increase));
                        setSavingsSimulation(null);
                        setSavingsError("");
                        setIsSavingsLoading(false);
                        savingsRequestRef.current += 1;
                      }}
                      type="button"
                    >
                      %{increase}
                    </button>
                  ))}
                </div>
                <small>İlk 12 katkı aynı kalır; seçilen artış her 12 aylık katkıdan sonra uygulanır.</small>
              </div>

              <div className={`savings-cost-context ${costsAreValid && numericCostValues.some((value) => value > 0) ? "active" : ""}`}>
                <span>
                  {!costsAreValid
                    ? "Maliyet ayarları geçersiz"
                    : numericCostValues.some((value) => value > 0)
                      ? "Maliyetler net plana dahil"
                      : "Maliyetler %0"}
                </span>
                <small>
                  {costsAreValid
                    ? `Alış %${formatNumber(numericCostValues[0])} · Satış %${formatNumber(numericCostValues[1])} · Yıllık %${formatNumber(numericCostValues[2])}`
                    : "Yukarıdaki Maliyet gerçeği alanındaki yüzdeleri düzeltin."}
                </small>
              </div>

              <button
                disabled={isSavingsLoading || (savingsMode === "goal" && savingsGoalValueMode === "purchasing-power" && (isComparisonLoading || cpiMultiplier === null))}
                onClick={handleSavingsSimulation}
                type="button"
              >
                {savingsMode === "goal" && savingsGoalValueMode === "purchasing-power" && (isComparisonLoading || cpiMultiplier === null)
                  ? "TÜFE verisi hazırlanıyor…"
                  : isSavingsLoading
                  ? "Aylık alımlar hesaplanıyor…"
                  : savingsMode === "goal"
                    ? "Gerekli aylık tutarı hesapla"
                    : "Düzenli birikimi hesapla"}
                <span aria-hidden="true">{isSavingsLoading ? "•••" : "→"}</span>
              </button>
              <p>
                {savingsMode === "goal"
                  ? savingsGoalValueMode === "purchasing-power"
                    ? "Alım gücü hedefi önce gerçek dönem TÜFE'siyle gelecekteki nominal hedefe çevrilir; sonra gereken aylık ekleme hesaplanır."
                    : "Hedef tutara ulaşmak için geçmiş dönemde gerekli olacak eşit aylık ekleme hesaplanır."
                  : "İlk aylık ekleme başlangıçtan bir ay sonra, devam eden eklemeler aynı takvim gününde yapılmış kabul edilir."}
                {" "}En fazla 120 aylık dönem hesaplanır.
              </p>
              {savingsError && <p className="savings-error" role="alert">{savingsError}</p>}
            </div>

            {savingsSimulation ? (
              <div className="savings-result" aria-live="polite">
                <div className="savings-result-hero">
                  <span>{savingsSimulation.mode === "goal"
                    ? `${savingsSimulation.costsApplied ? "Maliyetler dahil " : ""}hedef için gereken ${savingsSimulation.annualIncreasePercent > 0 ? "ilk " : ""}aylık tutar`
                    : savingsSimulation.costsApplied
                      ? "Masraf sonrası toplam değer"
                      : "Hedef tarihte toplam değer"}</span>
                  <strong>{formatMoney(savingsSimulation.mode === "goal" ? savingsSimulation.monthlyContribution : savingsSimulation.targetValue, "TRY")}</strong>
                  <em className={savingsSimulation.gain >= 0 ? "positive" : "negative"}>
                    {savingsSimulation.mode === "goal"
                      ? savingsSimulation.monthlyContribution === 0
                        ? "Başlangıç tutarı hedefi karşılıyor"
                        : savingsSimulation.annualIncreasePercent > 0
                          ? `${savingsSimulation.contributionCount} katkı · yılda %${formatNumber(savingsSimulation.annualIncreasePercent)} artış`
                          : `${savingsSimulation.contributionCount} eşit aylık ekleme`
                      : `${formatSignedPercent(savingsSimulation.gainPercent)} yatırılana göre fark`}
                  </em>
                </div>
                <dl>
                  {savingsSimulation.mode === "goal" && savingsSimulation.goalValueMode === "purchasing-power" && (
                    <div><dt>Başlangıç alım gücü hedefi</dt><dd>{formatMoney(savingsSimulation.goalInputAmount!, "TRY")}</dd></div>
                  )}
                  {savingsSimulation.mode === "goal" && (
                    <div>
                      <dt>{savingsSimulation.goalValueMode === "purchasing-power" ? "Hedef tarihte gereken TL" : "Hedef tutar"}</dt>
                      <dd>{formatMoney(savingsSimulation.goalAmount!, "TRY")}</dd>
                    </div>
                  )}
                  <div><dt>Toplam yatırılan</dt><dd>{formatMoney(savingsSimulation.totalPaid, "TRY")}</dd></div>
                  <div><dt>Aylık ekleme sayısı</dt><dd>{savingsSimulation.contributionCount} ay</dd></div>
                  {savingsSimulation.costsApplied && (
                    <div><dt>Masrafsız plan değeri</dt><dd>{formatMoney(savingsSimulation.grossTargetValue, "TRY")}</dd></div>
                  )}
                  {savingsSimulation.costsApplied && (
                    <div><dt>Maliyetlerin götürdüğü</dt><dd>−{formatMoney(savingsSimulation.costImpact, "TRY")}</dd></div>
                  )}
                  {savingsSimulation.annualIncreasePercent > 0 && (
                    <div><dt>Son yıl aylık ekleme</dt><dd>{formatMoney(savingsSimulation.finalMonthlyContribution, "TRY")}</dd></div>
                  )}
                  {savingsSimulation.annualIncreasePercent > 0 && (
                    <div><dt>Yıllık artışın hedefe katkısı</dt><dd>+{formatMoney(savingsSimulation.increaseImpact, "TRY")}</dd></div>
                  )}
                  {savingsSimulation.annualIncreasePercent > 0 && (
                    <div><dt>Sabit katkıyla değer</dt><dd>{formatMoney(savingsSimulation.flatTargetValue, "TRY")}</dd></div>
                  )}
                  <div><dt>{savingsSimulation.costsApplied ? "İlk paranın net hedef değeri" : "İlk paranın hedefteki değeri"}</dt><dd>{formatMoney(savingsSimulation.initialTargetValue, "TRY")}</dd></div>
                  {savingsSimulation.mode === "contribution" && <div><dt>{savingsSimulation.costsApplied ? "Aylık eklemelerin net değeri" : "Aylık eklemelerin değeri"}</dt><dd>{formatMoney(savingsSimulation.contributionsTargetValue, "TRY")}</dd></div>}
                </dl>
                <p>
                  {savingsSimulation.mode === "goal"
                    ? savingsSimulation.goalValueMode === "purchasing-power"
                      ? <>{formatMoney(savingsSimulation.goalInputAmount!, "TRY")} başlangıç alım gücü hedefi, gerçek dönem TÜFE’siyle {formatMoney(savingsSimulation.goalAmount!, "TRY")} hedef tarih tutarına çevrildi; gereken aylık ekleme {selectedIndex.label} ölçütünün aylık hareketleriyle hesaplandı.</>
                      : <>{formatMoney(savingsSimulation.goalAmount!, "TRY")} hedefi için gereken {savingsSimulation.annualIncreasePercent > 0 ? "ilk " : ""}aylık tutar, {selectedIndex.label} ölçütünün seçilen gerçek geçmiş dönemdeki aylık hareketlerine göre hesaplandı.</>
                    : <>{formatMoney(result.startingTryValue, "TRY")} başlangıç tutarı ve {formatMoney(savingsSimulation.monthlyContribution, "TRY")} ilk aylık ekleme, seçilen geçmiş dönemde {selectedIndex.label} ölçütüne göre simüle edildi.</>}
                  {savingsSimulation.annualIncreasePercent > 0 && <> Katkı tutarı her 12 ayda bir %{formatNumber(savingsSimulation.annualIncreasePercent)} artırıldı.</>}
                  {savingsSimulation.costsApplied && <> Alış %{formatNumber(savingsSimulation.buyCostPercent)}, satış %{formatNumber(savingsSimulation.sellCostPercent)} ve yıllık %{formatNumber(savingsSimulation.annualCostPercent)} gider her katkının kendi elde tutulma süresine göre net sonuca uygulandı.</>}
                </p>
                {activeStressScenario && savingsSimulation.monthlyContribution > 0 && (
                  <div className="savings-stress-test">
                    <div className="savings-stress-heading">
                      <div>
                        <span>Plan dayanıklılık testi</span>
                        <strong>{activeStressScenario.missedCount} katkı kaçarsa {formatMoney(activeStressScenario.targetLoss, "TRY")} hedef kaybı</strong>
                      </div>
                      <div className="savings-stress-selector" role="group" aria-label="Kaçırılan aylık katkı sayısı">
                        {savingsSimulation.stressScenarios.map((scenario) => (
                          <button
                            aria-pressed={activeStressScenario.missedCount === scenario.missedCount}
                            className={activeStressScenario.missedCount === scenario.missedCount ? "active" : ""}
                            key={scenario.missedCount}
                            onClick={() => setSelectedStressMisses(scenario.missedCount)}
                            type="button"
                          >
                            {scenario.missedCount} ay
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="savings-stress-values">
                      <div>
                        <span>Aksama sonrası net değer</span>
                        <strong>{formatMoney(activeStressScenario.stressedTargetValue, "TRY")}</strong>
                      </div>
                      <div>
                        <span>Yatırılmayan nakit</span>
                        <strong>{formatMoney(activeStressScenario.missedCash, "TRY")}</strong>
                      </div>
                      <div>
                        <span>Kalan aylarda eşit ek telafi</span>
                        <strong>{activeStressScenario.catchUpMonthly === null
                          ? "Dönem içinde mümkün değil"
                          : formatMoney(activeStressScenario.catchUpMonthly, "TRY")}</strong>
                      </div>
                    </div>
                    <p>Muhafazakâr testte hedef tarihte net etkisi en yüksek katkılar kaçırılmış kabul edilir. Telafi tutarı, kaçırılmayan katkı aylarına eşit ek ödeme olarak dağıtılır.</p>
                  </div>
                )}
                <div className="savings-timing-comparison">
                  <div className="savings-timing-heading">
                    <span>Zamanlama karşılaştırması</span>
                    <strong>
                      {savingsSimulation.strategyWinner === "equal"
                        ? "İki yöntem aynı sonucu verdi"
                        : `${savingsSimulation.strategyWinner === "recurring" ? "Düzenli ekleme" : "Toplu ekleme"} ${formatMoney(Math.abs(savingsSimulation.strategyDifference), "TRY")} önde`}
                    </strong>
                  </div>
                  <div className="savings-timing-values">
                    <div className={savingsSimulation.strategyWinner === "recurring" ? "winner" : ""}>
                      <span>{savingsSimulation.costsApplied ? "Net düzenli ekleme" : "Düzenli ekleme"}</span>
                      <strong>{formatMoney(savingsSimulation.targetValue, "TRY")}</strong>
                    </div>
                    <div className={savingsSimulation.strategyWinner === "upfront" ? "winner" : ""}>
                      <span>{savingsSimulation.costsApplied ? "Net: tüm katkılar başta olsaydı" : "Tüm katkılar başta hazır olsaydı"}</span>
                      <strong>{formatMoney(savingsSimulation.upfrontTargetValue, "TRY")}</strong>
                    </div>
                  </div>
                  <p>Ana başlangıç parası iki yöntemde de ilk gün yatırıldı; yalnız planlanan tüm katkıların yatırılma zamanı değiştirildi.{savingsSimulation.costsApplied ? " Yüzdesel maliyetler iki yönteme de uygulandı." : ""}</p>
                </div>
              </div>
            ) : (
              <div className="savings-empty">
                <span aria-hidden="true">↗</span>
                <div>
                  <h3>Tek seferlik hesap, düzenli plana dönüşsün</h3>
                  <p>{savingsMode === "goal"
                    ? savingsGoalValueMode === "purchasing-power"
                      ? "Başlangıç tarihinin alım gücüyle hedefinizi girin; TÜFE etkisi dahil gereken aylık eklemeyi görün."
                      : "Hedef tutarı girin; yıllık artış planınıza göre gereken ilk aylık eklemeyi görün."
                    : "Gerçek tarihsel verilerle aylık katkıların ve yıllık artış planının hedefe etkisini görün."}</p>
                </div>
              </div>
            )}
          </div>
          <p className="savings-method-note">Yıllık artış her 12 aylık katkıdan sonra nominal tutara uygulanır. Maliyet gerçeği bölümündeki yüzdeler her katkının süresine göre hesaplanır; vergi ve sabit ücretler dahil değildir. Geçmiş performans gelecekteki sonucu garanti etmez.</p>
        </section>
      )}

      <section className="saved-scenarios-panel" aria-labelledby="saved-scenarios-title">
        <div className="saved-scenarios-header">
          <div className="section-heading">
            <span className="step-number" aria-hidden="true">★</span>
            <div>
              <h2 id="saved-scenarios-title">Kaydedilen hesaplamalar</h2>
              <p>Önceki senaryolarınızı güncel kaynaklarla yeniden hesaplayın.</p>
            </div>
          </div>
          {savedScenarios.length > 0 && (
            <button
              className={confirmClearSaved ? "confirm" : ""}
              onClick={clearSavedScenarios}
              type="button"
            >
              {confirmClearSaved ? "Tümünü silmeyi onayla" : "Tümünü sil"}
            </button>
          )}
        </div>

        {savedScenarios.length > 0 ? (
          <div className="saved-scenarios-grid">
            {savedScenarios.map((savedScenario) => {
              const savedIndex = INDICES.find((item) => item.code === savedScenario.indexCode)!;

              return (
                <article className="saved-scenario-card" key={savedScenario.id}>
                  <div className="saved-scenario-card-top">
                    <span>{savedScenario.calculationMode === "reverse" ? `Hedeften geriye · ${savedIndex.label}` : savedIndex.label}</span>
                    <button
                      aria-label={`${savedScenario.name} kaydını sil`}
                      onClick={() => deleteSavedScenario(savedScenario.id)}
                      type="button"
                    >
                      Sil
                    </button>
                  </div>
                  <h3>{savedScenario.name}</h3>
                  <p>{formatDate(savedScenario.startDate)} → {formatDate(savedScenario.targetDate)}</p>
                  <strong>{formatMoney(savedScenario.goalValueMode === "purchasing-power" ? savedScenario.amount : savedScenario.targetTryValue, "TRY")}</strong>
                  {savedScenario.resultLens && savedScenario.calculationMode === "forward" && SAVINGS_INDEX_CODES.includes(savedScenario.indexCode) && (
                    <p>Brüt TL özeti · yeniden açılış: {RESULT_LENS_OPTIONS.find((option) => option.id === savedScenario.resultLens)?.label}</p>
                  )}
                  {savedScenario.goalValueMode === "purchasing-power" && (
                    <p className="saved-goal-note">Başlangıç alım gücü · hedefte {formatMoney(savedScenario.targetTryValue, "TRY")}</p>
                  )}
                  <dl>
                    <div>
                      <dt>Nominal değişim</dt>
                      <dd className={savedScenario.changePercent >= 0 ? "positive" : "negative"}>
                        {formatSignedPercent(savedScenario.changePercent)}
                      </dd>
                    </div>
                    <div>
                      <dt>Reel değişim</dt>
                      <dd className={savedScenario.realChange === null || savedScenario.realChange >= 0 ? "positive" : "negative"}>
                        {savedScenario.realChange === null ? "—" : formatSignedPercent(savedScenario.realChange)}
                      </dd>
                    </div>
                    <div>
                      <dt>{savedScenario.calculationMode === "reverse" ? "Sermaye sırası" : "Performans sırası"}</dt>
                      <dd>{savedScenario.selectedRank === null ? "—" : `${savedScenario.selectedRank} / ${savedScenario.comparisonCount}`}</dd>
                    </div>
                  </dl>
                  <button className="reload-scenario-button" onClick={() => loadSavedScenario(savedScenario)} type="button">
                    Güncel verilerle yeniden hesapla <span aria-hidden="true">→</span>
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="saved-scenarios-empty">
            <span aria-hidden="true">☆</span>
            <div>
              <h3>Henüz kayıtlı hesaplama yok</h3>
              <p>Bir sonuç oluşturduktan sonra isim verip bu cihaza kaydedebilirsiniz.</p>
            </div>
          </div>
        )}
      </section>

      {result && (
        <section className="history-section" aria-label="Tarihsel değişim grafiği" aria-live="polite">
          {isHistoryLoading ? (
            <div className="history-loading">
              <span aria-hidden="true" />
              <p>Grafik için tarihsel veriler hazırlanıyor…</p>
            </div>
          ) : historyPoints.length >= 2 ? (
            <HistoryChart indexLabel={selectedIndex.label} points={historyPoints}>
              {historyRisk && (
                <div className="history-risk-panel">
                  <div className="history-coverage" role="note">
                    <strong>Veri kapsamı: {historyRisk.sampleCount} örnek nokta</strong>
                    <span>İki grafik tarihi arasındaki en uzun aralık {historyRisk.maxSampleGapDays} gün.</span>
                    <p>Bu, tam günlük fiyat serisi değildir. Noktalar arasındaki düşüş ve toparlanmalar görünmeyebilir; tarihler grafik gözlemleridir, kesin olay tarihleri değildir. Hesaplar nominal TL üzerinden, maliyet ve TÜFE hariç yapılır.</p>
                  </div>
                  <div className="history-risk-heading">
                    <div>
                      <span>Yolculuk riski</span>
                      <strong>Sonuç kadar aradaki sarsıntıyı da görün</strong>
                    </div>
                    <small>
                      {historyRisk.maxDrawdownPercent === 0
                        ? "Örneklemde gerileme görülmedi"
                        : `${formatDate(historyRisk.peakDate)} → ${formatDate(historyRisk.troughDate)}`}
                    </small>
                  </div>
                  <div className="history-risk-grid">
                    <article className="primary">
                      <span>Örneklemde en büyük düşüş</span>
                      <strong>−%{formatNumber(historyRisk.maxDrawdownPercent)}</strong>
                      <small>
                        {historyRisk.maxDrawdownPercent === 0
                          ? "Bu noktalarda zirve altı gözlenmedi"
                          : "Örneklenen noktalarda zirveden en derin gerileme"}
                      </small>
                    </article>
                    <article>
                      <span>En derin düşüşün toparlanması</span>
                      <strong>
                        {historyRisk.maxDrawdownPercent === 0
                          ? "Gerekmedi"
                          : historyRisk.recoveryDays === null
                            ? "Sürüyor"
                            : `${historyRisk.recoveryDays} gün`}
                      </strong>
                      <small>
                        {historyRisk.maxDrawdownPercent === 0
                          ? "Seride düşüş dönemi oluşmadı"
                          : historyRisk.recoveryDate
                            ? `${formatDate(historyRisk.recoveryDate)} gözleminde zirveye dönmüştü`
                            : "Hedef tarihine kadar önceki zirveye dönmedi"}
                      </small>
                    </article>
                    <article>
                      <span>En zayıf veri aralığı</span>
                      <strong>{formatSignedPercent(historyRisk.worstIntervalPercent)}</strong>
                      <small>{formatDate(historyRisk.worstIntervalStartDate)} → {formatDate(historyRisk.worstIntervalEndDate)}</small>
                    </article>
                    <article>
                      <span>Pozitif aralık oranı</span>
                      <strong>%{formatNumber(historyRisk.positiveIntervalPercent)}</strong>
                      <small>{historyRisk.positiveIntervalCount} / {historyRisk.intervalCount} aralık yükselişle kapandı</small>
                    </article>
                  </div>
                  <div className="history-longest-wait">
                    <div>
                      <span>En uzun gözlenen zirve-altı dönemi</span>
                      <strong>{historyRisk.longestUnderwaterDays} gün{historyRisk.longestUnderwaterRecovered ? "" : " · hedefte açık"}</strong>
                    </div>
                    <p>{historyRisk.longestUnderwaterStartDate && historyRisk.longestUnderwaterEndDate
                      ? `${formatDate(historyRisk.longestUnderwaterStartDate)} → ${formatDate(historyRisk.longestUnderwaterEndDate)} · ${historyRisk.longestUnderwaterRecovered ? "toparlanma gözlendi" : "hedef tarihinde hâlâ sürüyor"}`
                      : "Örneklenen noktalarda zirve-altı dönemi görülmedi."}
                      <small>En derin düşüş ile en uzun bekleme farklı dönemlerde olabilir. Bekleme sınırı en uzun gözlenen döneme göre kontrol edilir.</small>
                    </p>
                  </div>
                  {historyRisk.maxDrawdownPercent > 0 && (
                    <div className="drawdown-anatomy">
                      <div className="drawdown-anatomy-heading">
                        <div>
                          <span>Kayıp anatomisi</span>
                          <strong>Düşüş yüzdesinin paraya ve zamana tercümesi</strong>
                        </div>
                        <em>{historyRisk.recoveryDate ? "Toparlandı" : "Henüz toparlanmadı"}</em>
                      </div>
                      <div className="drawdown-anatomy-chain">
                        <article>
                          <span>Zirve</span>
                          <strong>{formatMoney(historyRisk.peakValue, "TRY")}</strong>
                          <small>{formatDate(historyRisk.peakDate)}</small>
                        </article>
                        <b aria-hidden="true">→</b>
                        <article className="drawdown-anatomy-trough">
                          <span>Dip</span>
                          <strong>{formatMoney(historyRisk.troughValue, "TRY")}</strong>
                          <small>{formatMoney(historyRisk.lossAmount, "TRY")} kayıp · {historyRisk.declineDays} gün</small>
                        </article>
                        <b aria-hidden="true">→</b>
                        <article className="drawdown-anatomy-recovery">
                          <span>Telafi yükü</span>
                          <strong>+%{formatNumber(historyRisk.requiredRecoveryPercent)}</strong>
                          <small>
                            {historyRisk.recoveryDate
                              ? `${historyRisk.underwaterDays} gün sonraki gözlemde eski zirveye dönmüştü`
                              : `Hedef tarihine kadar ${historyRisk.underwaterDays} günlük gözlem · toparlanma görülmedi`}
                          </small>
                        </article>
                      </div>
                      <p>Bir kaybı telafi etmek için gereken yükseliş, düşüş oranından daha büyüktür. Örneğin %50 düşüş sonrası eski değere dönmek için %100 yükseliş gerekir.</p>
                    </div>
                  )}
                  {riskLimitAssessment && riskLimitCopy && (
                    <div className={`risk-limit-check ${riskLimitAssessment.outcome}`}>
                      <div className="risk-limit-heading">
                        <div>
                          <span>Kişisel sınır testi</span>
                          <strong>Bu geçmiş yolculuk benim sınırlarımı aştı mı?</strong>
                        </div>
                        <em>{riskLimitCopy.headline}</em>
                      </div>
                      <div className="risk-limit-controls">
                        <fieldset>
                          <legend>Dayanabileceğim geçici düşüş</legend>
                          <div role="group" aria-label="Kabul edilebilir geçici düşüş sınırı">
                            {LOSS_LIMIT_OPTIONS.map((option) => (
                              <button
                                aria-pressed={lossLimitPercent === option}
                                className={lossLimitPercent === option ? "active" : ""}
                                key={option}
                                onClick={() => setLossLimitPercent(option)}
                                type="button"
                              >
                                %{option}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                        <fieldset>
                          <legend>Zirve altında bekleyebileceğim süre</legend>
                          <div role="group" aria-label="Kabul edilebilir toparlanma bekleme sınırı">
                            {DURATION_LIMIT_OPTIONS.map((option) => (
                              <button
                                aria-pressed={durationLimitDays === option.days}
                                className={durationLimitDays === option.days ? "active" : ""}
                                key={option.days}
                                onClick={() => setDurationLimitDays(option.days)}
                                type="button"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                      <div className="risk-limit-result" aria-live="polite">
                        <article className={riskLimitAssessment.lossExceeded ? "exceeded" : "within"}>
                          <span>Örneklemde en derin düşüş</span>
                          <strong>−%{formatNumber(historyRisk.maxDrawdownPercent)}</strong>
                          <small>
                            %{lossLimitPercent} sınırı
                            {riskLimitAssessment.lossExceeded
                              ? ` · ${formatNumber(riskLimitAssessment.lossGapPercentagePoints)} puan aşıldı`
                              : " · bu noktalarda aşım görülmedi"}
                          </small>
                        </article>
                        <article className={riskLimitAssessment.durationExceeded ? "exceeded" : riskLimitAssessment.durationPending ? "pending" : "within"}>
                          <span>En uzun gözlenen zirve-altı süresi</span>
                          <strong>{historyRisk.longestUnderwaterDays} gün{historyRisk.longestUnderwaterRecovered ? "" : " · hedefte açık"}</strong>
                          <small>
                            {durationLimitDays} gün sınırı
                            {riskLimitAssessment.durationExceeded
                              ? ` · ${riskLimitAssessment.durationGapDays} gün aşıldı`
                              : riskLimitAssessment.durationPending ? " · toparlanma tamamlanmadı" : " · örneklemde aşım görülmedi"}
                          </small>
                        </article>
                      </div>
                      <p>
                        {riskLimitAssessment.outcome === "both-exceeded"
                          ? "Örneklenen veriler hem kayıp hem bekleme sınırınızın aşıldığını gösteriyor."
                          : riskLimitAssessment.outcome === "loss-exceeded"
                            ? "Örneklemde kayıp sınırınız aşıldı."
                            : riskLimitAssessment.outcome === "duration-exceeded"
                              ? "Örneklemde bekleme sınırınız aşıldı."
                              : "Örneklemde şu ana kadar sınır aşımı görülmedi; bu, ara tarihlerde de sınır içinde kalındığını kanıtlamaz."}
                        {historyRisk.hasOpenDrawdown && " Hedef tarihinde açık bir düşüş dönemi var; nihai bekleme süresi henüz bilinmiyor."}
                        {" "}Süre seçenekleri sırasıyla 180, 365 ve 1.095 gündür. Bu karşılaştırma bir risk profili veya yatırım tavsiyesi değildir.
                      </p>
                    </div>
                  )}
                  <p className="history-risk-note">
                    Değerler grafik örneklemine aittir; kaynak verinin gerçek yayın tarihi tatil veya yayın sıklığı nedeniyle grafik tarihinden önce olabilir. Gözlenen bir toparlanma, dönemin sonunda yeni bir düşüş olmadığı anlamına gelmez.
                  </p>
                </div>
              )}
            </HistoryChart>
          ) : (
            <div className="history-loading history-error">
              <p>Bu hesaplama için grafik verisi şu anda oluşturulamadı.</p>
            </div>
          )}
        </section>
      )}

      {result && (
        <section className="comparison-panel" aria-busy={isComparisonLoading} aria-live="polite">
          <div className="comparison-header">
            <div className="section-heading">
              <span className="step-number">03</span>
              <div>
                <h2>{result.calculationMode === "reverse" ? "Aynı hedef, farklı başlangıçlar" : "Aynı para, farklı ölçütler"}</h2>
                <p>{result.calculationMode === "reverse"
                  ? result.goalValueMode === "purchasing-power"
                    ? `${formatMoney(result.inputAmount, "TRY")} başlangıç alım gücü için hedefte gereken ${formatMoney(result.targetTryValue, "TRY")} üzerinden hesaplandı.`
                    : `${formatMoney(result.targetTryValue, "TRY")} hedefi için başlangıçta gereken TL tutarları.`
                  : `Başlangıçtaki ${formatMoney(result.startingTryValue, "TRY")} için hedef tarihte oluşacak karşılıklar.`}</p>
              </div>
            </div>
            <span className="comparison-sort">{result.calculationMode === "reverse" ? "En düşük başlangıca göre" : "En yüksek karşılığa göre"}</span>
          </div>

          {isComparisonLoading ? (
            <div className="comparison-loading">
              <span aria-hidden="true" />
              Diğer ölçütler hesaplanıyor…
            </div>
          ) : (
            <>
              {realChange !== null && annualizedChange !== null && annualizedInflation !== null && annualizedRealChange !== null && (
                <article className={`real-performance${realChange > 0.05 ? " positive" : realChange < -0.05 ? " negative" : " neutral"}`}>
                  <div className="real-performance-copy">
                    <span>Enflasyon sonrası reel performans{costAnalysis && numericCostValues.some((value) => value > 0) ? " · masrafsız" : ""}</span>
                    <h3>
                      {realChange > 0.05
                        ? `${selectedIndex.label}, TÜFE'yi geçti`
                        : realChange < -0.05
                          ? `${selectedIndex.label}, TÜFE'nin altında kaldı`
                          : `${selectedIndex.label}, TÜFE ile aynı seviyede`}
                    </h3>
                    <p>
                      Seçilen ölçüt, bu dönemde alım gücünü
                      {realChange > 0.05 ? " artırdı." : realChange < -0.05 ? " azalttı." : " yaklaşık korudu."}
                    </p>
                  </div>
                  <strong>{formatSignedPercent(realChange)}</strong>
                  <dl>
                    <div><dt>{selectedIndex.label} yıllık</dt><dd>{formatSignedPercent(annualizedChange)}</dd></div>
                    <div><dt>TÜFE yıllık</dt><dd>{formatSignedPercent(annualizedInflation)}</dd></div>
                    <div><dt>Reel yıllık</dt><dd>{formatSignedPercent(annualizedRealChange)}</dd></div>
                  </dl>
                </article>
              )}

              {bestComparison && selectedRank !== null && opportunityDifference !== null && (
                <article className={`decision-summary${opportunityDifference < 0.5 ? " leader" : ""}`}>
                  <div className="decision-summary-copy">
                    <span>{result.calculationMode === "reverse" ? "Geçmiş hedef özeti" : "Geçmiş performans özeti"}</span>
                    <h3>{selectedIndex.label}, {comparisons.length} ölçüt içinde {selectedRank}. sırada</h3>
                    <p>
                      {opportunityDifference < 0.5
                        ? result.calculationMode === "reverse"
                          ? "Seçtiğiniz ölçüt bu hedefe en düşük başlangıç sermayesiyle ulaştı."
                          : "Seçtiğiniz ölçüt bu dönemde karşılaştırılan seçeneklerin lideri oldu."
                        : result.calculationMode === "reverse"
                          ? `${bestComparison.label}, aynı hedefe daha az başlangıç sermayesiyle ulaştı.`
                          : `${bestComparison.label}, aynı başlangıç tutarında daha yüksek bir geçmiş dönem karşılığı üretti.`}
                    </p>
                  </div>
                  <dl>
                    <div><dt>Dönem lideri</dt><dd>{bestComparison.label}</dd></div>
                    <div>
                      <dt>{result.calculationMode === "reverse" ? "Başlangıçta gereken" : "Liderin karşılığı"}</dt>
                      <dd>{formatMoney(result.calculationMode === "reverse" ? bestComparison.requiredStartingTryValue : bestComparison.targetTryValue, "TRY")}</dd>
                    </div>
                    <div>
                      <dt>{result.calculationMode === "reverse" ? "Sermaye farkı" : "Lidere göre TL farkı"}</dt>
                      <dd>{opportunityDifference < 0.5 ? "Lider seçim" : formatMoney(opportunityDifference, "TRY")}</dd>
                    </div>
                  </dl>
                  <small>Yalnızca geçmiş fiyat hareketlerini karşılaştırır; risk, vergi ve işlem maliyetlerini tam olarak içermez.</small>
                </article>
              )}

              <div className="comparison-grid">
                {comparisons.map((item, position) => (
                  <article className={`comparison-card${item.indexCode === indexCode ? " selected" : ""}`} key={item.indexCode}>
                    <div className="comparison-card-top">
                      <span className="comparison-rank">#{position + 1}</span>
                      {item.indexCode === indexCode && <span className="selected-tag">Seçiminiz</span>}
                    </div>
                    <h3>{item.label}</h3>
                    {result.calculationMode === "reverse" && <span className="comparison-value-label">Başlangıçta gereken</span>}
                    <strong>{formatMoney(result.calculationMode === "reverse" ? item.requiredStartingTryValue : item.targetTryValue, "TRY")}</strong>
                    <small className={item.changePercent >= 0 ? "positive" : "negative"}>
                      %{formatNumber(Math.abs(item.changePercent))} {item.changePercent >= 0 ? "artış" : "azalış"}
                    </small>
                  </article>
                ))}
              </div>
              {comparisonNote && <p className="comparison-note">{comparisonNote}</p>}
            </>
          )}
        </section>
      )}

      {result && comparisons.length > 0 && (
        <section className="portfolio-panel" aria-labelledby="portfolio-title">
          <div className="portfolio-header">
            <div className="section-heading">
              <span className="step-number">04</span>
              <div>
                <h2 id="portfolio-title">Kendi portföyünü oluştur</h2>
                <p>Başlangıç paranızı yatırım araçlarına bölün; karma sonucunuzu tekil seçeneklerle karşılaştırın.</p>
              </div>
            </div>
            <span className={`portfolio-total${Math.abs(portfolioTotal - 100) < 0.000001 ? " ready" : ""}`}>
              Toplam %{formatNumber(portfolioTotal, 0)}
            </span>
          </div>

          <div className="portfolio-presets" aria-label="Hazır portföy dağılımları">
            <span>Hızlı dağılım</span>
            <button onClick={() => applyPortfolioPreset("temkinli")} type="button">Temkinli</button>
            <button onClick={() => applyPortfolioPreset("dengeli")} type="button">Dengeli</button>
            <button onClick={() => applyPortfolioPreset("atak")} type="button">Atak</button>
            <button onClick={() => applyPortfolioPreset("equal")} type="button">Eşit böl</button>
          </div>

          <div className="portfolio-workspace">
            <div className="portfolio-editor">
              <div className="portfolio-allocation-bar" aria-label={`Portföyün yüzde ${formatNumber(Math.min(100, portfolioTotal), 0)} kadarı dağıtıldı`}>
                {portfolioComparisons.map((item, position) => (
                  <span
                    className={`portfolio-color-${position + 1}`}
                    key={item.indexCode}
                    style={{ width: `${Math.max(0, Math.min(100, Number(portfolioWeights[item.indexCode]) || 0))}%` }}
                  />
                ))}
              </div>

              <div className="portfolio-inputs">
                {portfolioComparisons.map((item, position) => (
                  <label key={item.indexCode}>
                    <span><i className={`portfolio-color-${position + 1}`} aria-hidden="true" />{item.label}</span>
                    <span className="portfolio-percent-input">
                      <input
                        aria-label={`${item.label} portföy yüzdesi`}
                        inputMode="decimal"
                        max="100"
                        min="0"
                        onChange={(event) => setPortfolioWeights({
                          ...portfolioWeights,
                          [item.indexCode]: event.target.value,
                        })}
                        step="1"
                        type="number"
                        value={portfolioWeights[item.indexCode] ?? "0"}
                      />
                      <b>%</b>
                    </span>
                  </label>
                ))}
              </div>

              {portfolioResult ? (
                <p className="portfolio-validation success" role="status">Dağılım hazır. Hesaplama, başlangıçta bir kez alım yapılıp dönem sonuna kadar tutulduğunu varsayar.</p>
              ) : (
                <p className="portfolio-validation" role="status">
                  {portfolioTotal < 100
                    ? `Dağıtılmamış %${formatNumber(100 - portfolioTotal, 0)} kaldı.`
                    : `Toplamı %${formatNumber(portfolioTotal - 100, 0)} azaltmalısınız.`}
                </p>
              )}
            </div>

            <div className={`portfolio-outcome${portfolioResult ? " ready" : ""}`}>
              {portfolioResult ? (
                <>
                  <span>{result.calculationMode === "reverse" ? "Hedef için gereken portföy" : "Portföyün dönem sonu karşılığı"}</span>
                  <strong>{formatMoney(result.calculationMode === "reverse"
                    ? portfolioResult.requiredStartingValue
                    : portfolioResult.targetValue, "TRY")}</strong>
                  <small className={portfolioResult.changePercent >= 0 ? "positive" : "negative"}>
                    {formatSignedPercent(portfolioResult.changePercent)} dönemsel değişim
                  </small>
                  <dl>
                    <div>
                      <dt>Portföy sırası</dt>
                      <dd>{portfolioRank}. / {portfolioRanking.length}</dd>
                    </div>
                    <div>
                      <dt>Yıllıklandırılmış</dt>
                      <dd>{formatSignedPercent(annualizeMultiplier(portfolioResult.multiplier, periodYears))}</dd>
                    </div>
                    <div>
                      <dt>Aktif araç</dt>
                      <dd>{portfolioResult.holdings.length}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <>
                  <span>Portföy sonucu</span>
                  <strong>%100’ü tamamlayın</strong>
                  <p>Dağılım tamamlandığında karma getiri, hedef karşılığı ve ölçütler arasındaki sırası burada görünecek.</p>
                </>
              )}
            </div>
          </div>

          {portfolioResult && (
            <div className="portfolio-breakdown">
              <div className="portfolio-breakdown-heading">
                <div>
                  <span>Dönem sonundaki gerçek ağırlıklar</span>
                  <strong>Performans, başlangıç dağılımını nasıl değiştirdi?</strong>
                </div>
                <small>Yeniden dengeleme yapılmadı</small>
              </div>
              <div className="portfolio-holdings">
                {portfolioResult.holdings.map((holding) => {
                  const originalPosition = portfolioComparisons.findIndex((item) => item.indexCode === holding.code);
                  const drift = holding.targetSharePercent - holding.weightPercent;
                  return (
                    <article key={holding.code}>
                      <div>
                        <span><i className={`portfolio-color-${originalPosition + 1}`} aria-hidden="true" />{holding.label}</span>
                        <strong>{formatMoney(holding.targetValue, "TRY")}</strong>
                      </div>
                      <div className="portfolio-holding-track"><span style={{ width: `${Math.min(100, holding.targetSharePercent)}%` }} /></div>
                      <p>
                        Başlangıç %{formatNumber(holding.weightPercent, 0)} → sonuç %{formatNumber(holding.targetSharePercent, 1)}
                        <b className={drift >= 0 ? "positive" : "negative"}>{formatSignedPercent(drift)}</b>
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <p className="portfolio-method-note">Bu bir al-tut simülasyonudur. Ara dönemde yeniden dengeleme, vergi ve araca özel masraflar uygulanmaz; geçmiş sonuç gelecek için tahmin değildir.</p>
        </section>
      )}

      {result && !isComparisonLoading && (
        <ShareResultCard data={{
          startDate,
          targetDate,
          indexLabel: selectedIndex.label,
          startingValue: result.startingTryValue,
          targetValue: result.targetTryValue,
          realValue: resultLenses?.real.status === "ready"
            ? resultLenses.real.value
            : cpiMultiplier
              ? result.targetTryValue / cpiMultiplier
              : null,
          maxDrawdownPercent: historyRisk?.maxDrawdownPercent ?? null,
          portfolioHoldings: portfolioResult?.holdings.map((holding) => ({
            label: holding.label,
            weightPercent: holding.weightPercent,
          })) ?? [],
          url: createShareUrl().toString(),
        }} />
      )}

      {(
        <OpportunityCostPanel
          defaultAmount={result?.startingTryValue ?? 15000}
          defaultDate={startDate}
          key={result ? `${result.startRequestedRaw}-${result.startingTryValue}` : "standalone-opportunity"}
          maxDate={DEFAULT_TARGET_DATE}
          onCalculate={calculateOpportunityCost}
        />
      )}

      {(
        <RecurringOpportunityPanel maxDate={DEFAULT_TARGET_DATE} onCalculate={calculateRecurringOpportunityCost} />
      )}

      {result && comparisons.length > 0 && (
        <section className="scenario-panel" aria-busy={isScenarioLoading} aria-labelledby="scenario-title">
          <div className="scenario-header">
            <div className="section-heading">
              <span className="step-number">08</span>
              <div>
                <h2 id="scenario-title">Senaryo karşılaştırma modu</h2>
                <p>Aynı başlangıç parasının en fazla üç ölçütte zaman içindeki yolculuğunu karşılaştırın.</p>
              </div>
            </div>
            <span className="scenario-limit">{scenarioCodes.length} / 3 seçili</span>
          </div>

          <div className="scenario-selector" aria-label="Grafikte karşılaştırılacak ölçütler">
            {comparisons.map((item) => {
              const isSelected = scenarioCodes.includes(item.indexCode);

              return (
                <button
                  aria-pressed={isSelected}
                  className={isSelected ? "selected" : ""}
                  key={item.indexCode}
                  onClick={() => toggleScenario(item.indexCode)}
                  type="button"
                >
                  <span aria-hidden="true">{isSelected ? "✓" : "+"}</span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="scenario-mode-toolbar">
            <div>
              <span>Grafik değeri</span>
              <div className="scenario-mode-switch" role="group" aria-label="Grafik değer türü">
                <button
                  aria-pressed={scenarioMode === "nominal"}
                  className={scenarioMode === "nominal" ? "active" : ""}
                  onClick={() => setScenarioMode("nominal")}
                  type="button"
                >
                  Nominal TL
                </button>
                <button
                  aria-pressed={scenarioMode === "real"}
                  className={scenarioMode === "real" ? "active" : ""}
                  disabled={!hasScenarioInflationData || isScenarioLoading}
                  onClick={() => setScenarioMode("real")}
                  type="button"
                >
                  Reel değer
                </button>
              </div>
            </div>
            <p>
              {scenarioMode === "real"
                ? "TÜFE etkisi çıkarıldı; değerler başlangıç tarihinin satın alma gücüyle gösteriliyor."
                : "Dönem değerleri o tarihteki nominal Türk lirası karşılığıyla gösteriliyor."}
            </p>
          </div>

          {scenarioNote && <p className="scenario-note" role="status">{scenarioNote}</p>}

          {isScenarioLoading ? (
            <div className="scenario-loading">
              <span aria-hidden="true" />
              <p>Seçilen ölçütlerin tarihsel senaryoları hesaplanıyor…</p>
            </div>
          ) : scenarioSeries.length > 0 ? (
            <ScenarioHistoryChart
              key={`${scenarioMode}-${displayedScenarioSeries.map((item) => item.indexCode).join("-")}`}
              series={displayedScenarioSeries}
              valueMode={scenarioMode}
            />
          ) : (
            <div className="scenario-loading scenario-error">
              <p>Bu senaryo için grafik verisi şu anda oluşturulamadı.</p>
            </div>
          )}
        </section>
      )}

      {result && <FeedbackPanel tool={indexCode.toLowerCase()} />}

      {result && (
        <nav className="mobile-lab-navigation" aria-label="Mobil finans laboratuvarı menüsü">
          <button onClick={() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" })} type="button"><span aria-hidden="true">⌂</span><strong>Hesapla</strong></button>
          <button aria-pressed={analysisView === "overview"} className={analysisView === "overview" ? "active" : ""} onClick={() => selectAnalysisView("overview")} type="button"><span aria-hidden="true">◎</span><strong>Özet</strong></button>
          <button aria-pressed={analysisView === "savings"} className={analysisView === "savings" ? "active" : ""} disabled={!SAVINGS_INDEX_CODES.includes(indexCode)} onClick={() => selectAnalysisView("savings")} type="button"><span aria-hidden="true">+</span><strong>Birikim</strong></button>
          <button aria-pressed={analysisView === "portfolio"} className={analysisView === "portfolio" ? "active" : ""} disabled={!SAVINGS_INDEX_CODES.includes(indexCode)} onClick={() => selectAnalysisView("portfolio")} type="button"><span aria-hidden="true">◫</span><strong>Portföy</strong></button>
          <button aria-pressed={analysisView === "tools"} className={analysisView === "tools" ? "active" : ""} onClick={() => selectAnalysisView("tools")} type="button"><span aria-hidden="true">↗</span><strong>Araçlar</strong></button>
        </nav>
      )}

      <footer>
        <div>
          <strong>Para Hesaplayıcı</strong>
          <p>Hesaplamalar bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.</p>
        </div>
        <TrustCenter />
      </footer>
    </main>
  );
}
