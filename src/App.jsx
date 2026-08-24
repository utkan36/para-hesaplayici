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
  "2021": { USD: 8.8, EUR: 10.4, TUFE: 600 },
  "2022": { USD: 16.5, EUR: 17.3, TUFE: 950 },
  "2023": { USD: 23.8, EUR: 25.7, TUFE: 1550 },
  "2024": { USD: 32.5, EUR: 35.1, TUFE: 2300 },
  "2025": { USD: 36.2, EUR: 39.0, TUFE: 3100 },
  "2026": { USD: 43.0, EUR: 46.5, TUFE: 3900 }
};

export default function App() {
  const [amount, setAmount] = useState(1000);
  const [startYear, setStartYear] = useState('2022');
  const [targetYear, setTargetYear] = useState('2026');
  const [comparisonResults, setComparisonResults] = useState(null);

  const years = Object.keys(ARCHIVE_RATES);

  const handleCalculate = () => {
    const usdStart = ARCHIVE_RATES[startYear].USD;
    const usdTarget = ARCHIVE_RATES[targetYear].USD;

    const eurStart = ARCHIVE_RATES[startYear].EUR;
    const eurTarget = ARCHIVE_RATES[targetYear].EUR;

    const tufeStart = ARCHIVE_RATES[startYear].TUFE;
    const tufeTarget = ARCHIVE_RATES[targetYear].TUFE;

    setComparisonResults({
      USD: amount * (usdTarget / usdStart),
      EUR: amount * (eurTarget / eurStart),
      TUFE: amount * (tufeTarget / tufeStart),
    });
  };

  // Çoklu Çizgi Grafiği Verileri
  const chartData = {
    labels: years,
    datasets: [
      {
        label: 'USD (Dolar Kuru)',
        data: years.map(y => ARCHIVE_RATES[y].USD),
        borderColor: '#10b981', // Yeşil
        backgroundColor: '#10b981',
        tension: 0.3,
      },
      {
        label: 'EUR (Euro Kuru)',
        data: years.map(y => ARCHIVE_RATES[y].EUR),
        borderColor: '#3b82f6', // Mavi
        backgroundColor: '#3b82f6',
        tension: 0.3,
      },
      {
        label: 'TÜFE (Enflasyon Endeksi / 100)',
        data: years.map(y => ARCHIVE_RATES[y].TUFE / 100), // Ölçekleme için 100'e bölündü
        borderColor: '#ef4444', // Kırmızı
        backgroundColor: '#ef4444',
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f1f5f9' } }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8">
        
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold tracking-wide uppercase mb-2">
            Karşılaştırmalı Finans Analizi
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Çoklu Varlık Karşılaştırıcı</h1>
          <p className="text-slate-500 text-sm mt-1">Paranızın farklı yatırım araçlarındaki değişimini kıyaslayın</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Başlangıç Miktarı (TL)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Başlangıç Yılı</label>
              <select 
                value={startYear} 
                onChange={(e) => setStartYear(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Hedef Yıl</label>
              <select 
                value={targetYear} 
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={handleCalculate}
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition cursor-pointer"
          >
            Tüm Varlıkları Karşılaştır
          </button>
        </div>

        {/* Çoklu Sonuç Kartları */}
        {comparisonResults && (
          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-xs font-bold text-emerald-600 uppercase">USD Bazlı</span>
              <div className="text-lg font-extrabold text-emerald-800 mt-1">
                {comparisonResults.USD.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="text-xs font-bold text-blue-600 uppercase">EUR Bazlı</span>
              <div className="text-lg font-extrabold text-blue-800 mt-1">
                {comparisonResults.EUR.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
              <span className="text-xs font-bold text-rose-600 uppercase">TÜFE Bazlı</span>
              <div className="text-lg font-extrabold text-rose-800 mt-1">
                {comparisonResults.TUFE.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
          </div>
        )}

        {/* Çoklu Grafik */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>
    </div>
  );
}