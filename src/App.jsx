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
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ARCHIVE_RATES = {
  "2021": { USD: 8.8, EUR: 10.4, TRY: 1, TUFE: 600 },
  "2022": { USD: 16.5, EUR: 17.3, TRY: 1, TUFE: 950 },
  "2023": { USD: 23.8, EUR: 25.7, TRY: 1, TUFE: 1550 },
  "2024": { USD: 32.5, EUR: 35.1, TRY: 1, TUFE: 2300 },
  "2025": { USD: 36.2, EUR: 39.0, TRY: 1, TUFE: 3100 },
  "2026": { USD: 43.0, EUR: 46.5, TRY: 1, TUFE: 3900 }
};

export default function App() {
  const [amount, setAmount] = useState(1000);
  const [currency, setCurrency] = useState('TL');
  const [indexType, setIndexType] = useState('USD');
  const [startYear, setStartYear] = useState('2022');
  const [targetYear, setTargetYear] = useState('2026');
  const [result, setResult] = useState(null);

  const years = Object.keys(ARCHIVE_RATES);

  const handleCalculate = () => {
    const startVal = ARCHIVE_RATES[startYear][indexType];
    const targetVal = ARCHIVE_RATES[targetYear][indexType];
    const calculated = amount * (targetVal / startVal);
    setResult(calculated);
  };

  const chartData = {
    labels: years,
    datasets: [
      {
        label: `${indexType} Endeks Değişimi`,
        data: years.map(y => ARCHIVE_RATES[y][indexType]),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4f46e5',
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 14 },
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f1f5f9' } }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8 transition-all">
        
        {/* Başlık */}
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold tracking-wide uppercase mb-2">
            Finansal Değer Analizi
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Endeks Hesaplayıcı</h1>
          <p className="text-slate-500 text-sm mt-1">Paranızın geçmişten günümüze reel değişimini görün</p>
        </div>

        {/* Form Alanı */}
        <div className="space-y-5">
          {/* Miktar ve Birim */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Miktar</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Birim</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                <option value="TL">₺ TL</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
          </div>

          {/* Hesaplama Endeksi */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Endeks / Karşılaştırma Kriteri</label>
            <select 
              value={indexType} 
              onChange={(e) => setIndexType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition font-medium"
            >
              <option value="USD">USD - Dolar Kuru Değişimi</option>
              <option value="EUR">EUR - Euro Kuru Değişimi</option>
              <option value="TUFE">TÜFE - Enflasyon Oranı</option>
            </select>
          </div>

          {/* Tarih / Yıl Seçimi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Başlangıç Yılı</label>
              <select 
                value={startYear} 
                onChange={(e) => setStartYear(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Hedef Yıl</label>
              <select 
                value={targetYear} 
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Buton */}
          <button 
            onClick={handleCalculate}
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-200 cursor-pointer mt-2"
          >
            Hesapla
          </button>
        </div>

        {/* Sonuç Kartı */}
        {result !== null && (
          <div className="mt-6 p-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md text-center">
            <span className="text-xs uppercase tracking-wider text-indigo-100 font-medium">Hedef Yıldaki Karşılığı</span>
            <div className="text-3xl font-extrabold mt-1">
              {result.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {currency}
            </div>
          </div>
        )}

        {/* Grafik */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="h-56">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>
    </div>
  );
}