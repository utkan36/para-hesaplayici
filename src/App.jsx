import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ARCHIVE_RATES = {
  "2021": { USD: 8.8, EUR: 10.4, ALTIN: 450, BIST: 1400, TUFE: 600 },
  "2022": { USD: 16.5, EUR: 17.3, ALTIN: 1000, BIST: 2400, TUFE: 950 },
  "2023": { USD: 23.8, EUR: 25.7, ALTIN: 1650, BIST: 5500, TUFE: 1550 },
  "2024": { USD: 32.5, EUR: 35.1, ALTIN: 2400, BIST: 9000, TUFE: 2300 },
  "2025": { USD: 36.2, EUR: 39.0, ALTIN: 3100, BIST: 10500, TUFE: 3100 },
  "2026": { USD: 43.0, EUR: 46.5, ALTIN: 3800, BIST: 12500, TUFE: 3900 }
};

export default function App() {
  const [calcMode, setCalcMode] = useState('dca'); // 'single' (Tek Seferlik) veya 'dca' (Düzenli)
  const [amount, setAmount] = useState(1000);
  const [startYear, setStartYear] = useState('2021');
  const [targetYear, setTargetYear] = useState('2026');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);

  const years = Object.keys(ARCHIVE_RATES);

  const handleCalculate = () => {
    const selectedYears = years.filter(y => y >= startYear && y <= targetYear);
    const target = ARCHIVE_RATES[targetYear];

    if (calcMode === 'single') {
      // Tek seferlik toplu para hesabı
      const start = ARCHIVE_RATES[startYear];
      setComparisonResults({
        totalInvested: amount,
        USD: amount * (target.USD / start.USD),
        EUR: amount * (target.EUR / start.EUR),
        ALTIN: amount * (target.ALTIN / start.ALTIN),
        BIST: amount * (target.BIST / start.BIST),
        TUFE: amount * (target.TUFE / start.TUFE),
      });
    } else {
      // Her ay düzenli yatırım (DCA) hesabı (Yılda 12 ay üzerinden hesaplanır)
      let totalInvested = 0;
      let totals = { USD: 0, EUR: 0, ALTIN: 0, BIST: 0, TUFE: 0 };

      selectedYears.forEach(year => {
        const rates = ARCHIVE_RATES[year];
        const yearlyContribution = amount * 12; // Yıllık biriken tutar
        totalInvested += yearlyContribution;

        // O yılın birikiminin hedef yıla göre değerlenmesi
        totals.USD += yearlyContribution * (target.USD / rates.USD);
        totals.EUR += yearlyContribution * (target.EUR / rates.EUR);
        totals.ALTIN += yearlyContribution * (target.ALTIN / rates.ALTIN);
        totals.BIST += yearlyContribution * (target.BIST / rates.BIST);
        totals.TUFE += yearlyContribution * (target.TUFE / rates.TUFE);
      });

      setComparisonResults({
        totalInvested,
        ...totals
      });
    }
  };

  const chartData = {
    labels: years,
    datasets: [
      { label: 'USD (Dolar)', data: years.map(y => ARCHIVE_RATES[y].USD), borderColor: '#10b981', tension: 0.3 },
      { label: 'EUR (Euro)', data: years.map(y => ARCHIVE_RATES[y].EUR), borderColor: '#3b82f6', tension: 0.3 },
      { label: 'Gram Altın (₺/100)', data: years.map(y => ARCHIVE_RATES[y].ALTIN / 100), borderColor: '#eab308', tension: 0.3 },
      { label: 'BIST 100 (/100)', data: years.map(y => ARCHIVE_RATES[y].BIST / 100), borderColor: '#a855f7', tension: 0.3 },
      { label: 'TÜFE (/100)', data: years.map(y => ARCHIVE_RATES[y].TUFE / 100), borderColor: '#ef4444', tension: 0.3 },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: isDarkMode ? '#cbd5e1' : '#334155' } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: isDarkMode ? '#cbd5e1' : '#334155' } },
      y: { grid: { color: isDarkMode ? '#334155' : '#f1f5f9' }, ticks: { color: isDarkMode ? '#cbd5e1' : '#334155' } }
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className={`w-full max-w-3xl rounded-2xl shadow-xl border p-6 md:p-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        
        {/* Üst Bar */}
        <div className="flex justify-between items-center mb-6">
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-xs font-semibold uppercase tracking-wide">
            Finansal Portföy Simülatörü
          </span>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${isDarkMode ? 'bg-slate-700 border-slate-600 text-amber-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
          >
            {isDarkMode ? '☀️ Aydınlık' : '🌙 Koyu'}
          </button>
        </div>

        {/* Sekmeler (Tabs) */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl mb-6">
          <button 
            onClick={() => { setCalcMode('dca'); setComparisonResults(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${calcMode === 'dca' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
          >
            📅 Her Ay Düzenli Yatırım
          </button>
          <button 
            onClick={() => { setCalcMode('single'); setComparisonResults(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${calcMode === 'single' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
          >
            💰 Tek Seferlik Toplu Para
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">
            {calcMode === 'dca' ? 'Aylık Birikim Simülasyonu' : 'Toplu Para Değerleme'}
          </h1>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {calcMode === 'dca' ? 'Seçilen tarihler arasında her ay kenara koyduğunuz tutarın büyüme analizi' : 'Tek seferde yatırılan paranın yıllar içindeki reel değişimi'}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              {calcMode === 'dca' ? 'Aylık Yatırılan Tutar (₺)' : 'Başlangıç Miktarı (₺)'}
            </label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))}
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Başlangıç Yılı</label>
              <select 
                value={startYear} 
                onChange={(e) => setStartYear(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Hedef Yıl</label>
              <select 
                value={targetYear} 
                onChange={(e) => setTargetYear(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={handleCalculate}
            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg transition cursor-pointer"
          >
            Simülasyonu Çalıştır
          </button>
        </div>

        {/* Sonuç Kartları */}
        {comparisonResults && (
          <div className="mt-6 space-y-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
              <span className="text-[11px] font-bold text-indigo-500 uppercase">Cebinizden Çıkan Toplam Para</span>
              <div className="text-xl font-extrabold text-indigo-600 mt-0.5">
                {comparisonResults.totalInvested.toLocaleString('tr-TR')} ₺
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Dolar</span>
                <div className="text-sm font-extrabold text-emerald-600 mt-1">
                  {comparisonResults.USD.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </div>
              </div>
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-blue-500 uppercase">Euro</span>
                <div className="text-sm font-extrabold text-blue-600 mt-1">
                  {comparisonResults.EUR.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </div>
              </div>
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-amber-500 uppercase">Altın</span>
                <div className="text-sm font-extrabold text-amber-600 mt-1">
                  {comparisonResults.ALTIN.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </div>
              </div>
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-purple-500 uppercase">BIST 100</span>
                <div className="text-sm font-extrabold text-purple-600 mt-1">
                  {comparisonResults.BIST.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </div>
              </div>
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl col-span-2 md:col-span-1">
                <span className="text-[10px] font-bold text-rose-500 uppercase">TÜFE</span>
                <div className="text-sm font-extrabold text-rose-600 mt-1">
                  {comparisonResults.TUFE.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grafik */}
        <div className="mt-6 pt-4 border-t border-slate-500/20">
          <div className="h-56">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>
    </div>
  );
}