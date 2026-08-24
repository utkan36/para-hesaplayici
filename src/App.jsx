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

// Güncellenmiş Finansal Veri Seti (Veriler yaklaşık ortalamaları temsil eder)
const ARCHIVE_RATES = {
  "2021": { USD: 8.8, EUR: 10.4, ALTIN: 450, BIST: 1400, TUFE: 600 },
  "2022": { USD: 16.5, EUR: 17.3, ALTIN: 1000, BIST: 2400, TUFE: 950 },
  "2023": { USD: 23.8, EUR: 25.7, ALTIN: 1650, BIST: 5500, TUFE: 1550 },
  "2024": { USD: 32.5, EUR: 35.1, ALTIN: 2400, BIST: 9000, TUFE: 2300 },
  "2025": { USD: 36.2, EUR: 39.0, ALTIN: 3100, BIST: 10500, TUFE: 3100 },
  "2026": { USD: 43.0, EUR: 46.5, ALTIN: 3800, BIST: 12500, TUFE: 3900 }
};

export default function App() {
  const [amount, setAmount] = useState(10000);
  const [startYear, setStartYear] = useState('2021');
  const [targetYear, setTargetYear] = useState('2026');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);

  const years = Object.keys(ARCHIVE_RATES);

  const handleCalculate = () => {
    const start = ARCHIVE_RATES[startYear];
    const target = ARCHIVE_RATES[targetYear];

    setComparisonResults({
      USD: amount * (target.USD / start.USD),
      EUR: amount * (target.EUR / start.EUR),
      ALTIN: amount * (target.ALTIN / start.ALTIN),
      BIST: amount * (target.BIST / start.BIST),
      TUFE: amount * (target.TUFE / start.TUFE),
    });
  };

  const chartData = {
    labels: years,
    datasets: [
      {
        label: 'USD (Dolar)',
        data: years.map(y => ARCHIVE_RATES[y].USD),
        borderColor: '#10b981',
        tension: 0.3,
      },
      {
        label: 'EUR (Euro)',
        data: years.map(y => ARCHIVE_RATES[y].EUR),
        borderColor: '#3b82f6',
        tension: 0.3,
      },
      {
        label: 'Gram Altın (₺/100)',
        data: years.map(y => ARCHIVE_RATES[y].ALTIN / 100),
        borderColor: '#eab308',
        tension: 0.3,
      },
      {
        label: 'BIST 100 (/100)',
        data: years.map(y => ARCHIVE_RATES[y].BIST / 100),
        borderColor: '#a855f7',
        tension: 0.3,
      },
      {
        label: 'TÜFE (/100)',
        data: years.map(y => ARCHIVE_RATES[y].TUFE / 100),
        borderColor: '#ef4444',
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top',
        labels: { color: isDarkMode ? '#cbd5e1' : '#334155' }
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: isDarkMode ? '#cbd5e1' : '#334155' } },
      y: { grid: { color: isDarkMode ? '#334155' : '#f1f5f9' }, ticks: { color: isDarkMode ? '#cbd5e1' : '#334155' } }
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className={`w-full max-w-3xl rounded-2xl shadow-xl border p-6 md:p-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        
        {/* Dark Mode Toggle & Başlık */}
        <div className="flex justify-between items-center mb-6">
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-xs font-semibold uppercase tracking-wide">
            Gelişmiş Varlık Analizi
          </span>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${isDarkMode ? 'bg-slate-700 border-slate-600 text-amber-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
          >
            {isDarkMode ? '☀️ Aydınlık Mod' : '🌙 Koyu Mod'}
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Yatırım & Enflasyon Kıyaslayıcı</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Paranızın Dolar, Euro, Altın, Borsa ve Enflasyon karşısındaki performansını görün
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Başlangıç Miktarı (₺)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))}
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Başlangıç Yılı</label>
              <select 
                value={startYear} 
                onChange={(e) => setStartYear(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Hedef Yıl</label>
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
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg transition cursor-pointer"
          >
            Tüm Yatırım Araçlarını Karşılaştır
          </button>
        </div>

        {/* Sonuç Kartları Grid */}
        {comparisonResults && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mt-6 text-center">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Dolar</span>
              <div className="text-base font-extrabold text-emerald-600 mt-1">
                {comparisonResults.USD.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <span className="text-[10px] font-bold text-blue-500 uppercase">Euro</span>
              <div className="text-base font-extrabold text-blue-600 mt-1">
                {comparisonResults.EUR.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-[10px] font-bold text-amber-500 uppercase">Altın</span>
              <div className="text-base font-extrabold text-amber-600 mt-1">
                {comparisonResults.ALTIN.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <span className="text-[10px] font-bold text-purple-500 uppercase">BIST 100</span>
              <div className="text-base font-extrabold text-purple-600 mt-1">
                {comparisonResults.BIST.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-rose-500 uppercase">TÜFE</span>
              <div className="text-base font-extrabold text-rose-600 mt-1">
                {comparisonResults.TUFE.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
          </div>
        )}

        {/* Grafik */}
        <div className="mt-8 pt-6 border-t border-slate-500/20">
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>
    </div>
  );
}