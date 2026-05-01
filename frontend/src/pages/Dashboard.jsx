import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line 
} from 'recharts';

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [genreData, setGenreData] = useState([]);
  const [marketingData, setMarketingData] = useState([]);
  const [regionalData, setRegionalData] = useState([]);
  const [topTitles, setTopTitles] = useState([]);
  const [signals, setSignals] = useState([]);
  
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, genreRes, mktRes, regRes, topRes] = await Promise.all([
          apiClient.get('/api/kpis'),
          apiClient.get('/api/genre-breakdown'),
          apiClient.get('/api/marketing-efficiency'),
          apiClient.get('/api/regional-performance?top=10'),
          apiClient.get('/api/top-titles?n=10'),
          apiClient.get('/api/signals')
        ]);
        setKpis(kpiRes.data);
        setGenreData(genreRes.data);
        setMarketingData(mktRes.data);
        setRegionalData(regRes.data);
        setTopTitles(topRes.data);
        setSignals(sigRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    };
    fetchData();
  }, []);

  const openTitleModal = async (titleId) => {
    try {
      const res = await apiClient.get(`/api/title/${titleId}`);
      setSelectedTitle(res.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch title profile", err);
      alert("Mock Error: In a real environment, ensure the title name maps correctly to a movie_id, or the endpoint handles string titles.");
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('en-US').format(val || 0);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return '#10b981';
      case 'B': return '#3b82f6';
      case 'C': return '#f59e0b';
      case 'D': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors pb-10">
      
      {/* Top Nav */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center border-b dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-2xl tracking-tight text-blue-600 dark:text-blue-400">Futures First</div>
          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded">Q1 2025</span>
        </div>
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow"
        >
          Generate Executive Summary
        </button>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title="Total Views" value={formatNumber(kpis?.total_watch_events)} delta="+12.4%" deltaType="positive" />
          <KpiCard title="Avg Completion Rate" value={`${(kpis?.avg_completion_rate || 0).toFixed(1)}%`} delta="-2.1%" deltaType="negative" />
          <KpiCard title="Total Revenue" value={formatCurrency(kpis?.total_revenue)} delta="+8.7%" deltaType="positive" />
          <KpiCard title="Avg Rating" value={(kpis?.avg_rating || 0).toFixed(2)} delta="+0.1" deltaType="positive" />
        </div>

        {/* Signals Strip */}
        {signals && signals.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {signals.map(signal => (
              <div key={signal.id} className={`flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 p-4 snap-start transition-colors ${
                signal.severity === 'positive' ? 'border-l-green-500' :
                signal.severity === 'critical' ? 'border-l-red-500' :
                'border-l-blue-500'
              }`}>
                <h4 className="font-bold text-sm mb-1.5 flex items-center">
                  {signal.severity === 'critical' && <span className="mr-2">⚠</span>}
                  {signal.severity === 'positive' && <span className="mr-2">📈</span>}
                  {signal.severity === 'info' && <span className="mr-2">💡</span>}
                  {signal.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{signal.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* 2-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Charts Left Column */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Genre Breakdown (Views)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={genreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="genre" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#f3f4f6', border: 'none', borderRadius: '8px' }} cursor={{fill: '#f3f4f6', opacity: 0.1}}/>
                    <Bar dataKey="total_views" radius={[4, 4, 0, 0]}>
                      {genreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.health_flag === 'audit_required' ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Marketing Efficiency (ROAS)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={marketingData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.2} />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis dataKey="channel" type="category" tick={{ fill: '#6b7280', fontSize: 12 }} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#f3f4f6', border: 'none', borderRadius: '8px' }} cursor={{fill: '#f3f4f6', opacity: 0.1}}/>
                    <Bar dataKey="ROAS" radius={[0, 4, 4, 0]}>
                      {marketingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getGradeColor(entry.efficiency_grade)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Regional Table Right Column */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Regional Performance</h3>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">City</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Eng. Score</th>
                    <th className="px-4 py-3 rounded-tr-lg">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalData.map((row, i) => (
                    <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium">
                        {row.city} <span className="text-gray-400 text-xs ml-1">{row.country}</span>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(row.total_revenue)}</td>
                      <td className="px-4 py-3">{(row.engagement_score || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="w-20 h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={row.monthly_trend.map((v, i) => ({ val: v, i }))}>
                              <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Top 10 Titles Table */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Top 10 Titles</h3>
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Rank</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Genre</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comp %</th>
                <th className="px-4 py-3">ROI</th>
                <th className="px-4 py-3 rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody>
              {topTitles.map((title, i) => (
                <tr 
                  key={i} 
                  onClick={() => openTitleModal(title.title)}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4">{i + 1}</td>
                  <td className="px-4 py-4 font-semibold text-blue-600 dark:text-blue-400">{title.title}</td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{title.genre}</span>
                  </td>
                  <td className="px-4 py-4">{formatNumber(title.views)}</td>
                  <td className="px-4 py-4 text-yellow-500 tracking-widest">
                    {'★'.repeat(Math.round(title.avg_rating || 0))}
                    <span className="text-gray-300 dark:text-gray-600">{'★'.repeat(5 - Math.round(title.avg_rating || 0))}</span>
                  </td>
                  <td className="px-4 py-4">{(title.completion_rate || 0).toFixed(1)}%</td>
                  <td className={`px-4 py-4 font-medium ${(title.roi || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(title.roi || 0).toFixed(1)}%
                  </td>
                  <td className="px-4 py-4">
                    {title.is_trending && <span className="text-xl" title="Trending">🔥</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal - Title Profile */}
      {isModalOpen && selectedTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selectedTitle.title}</h2>
                <p className="text-gray-500 text-sm mt-1">ID: {selectedTitle.movie_id}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Review Summary</h4>
                <p className="text-sm bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg italic">"{selectedTitle.review_summary}"</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">6-Month Watch Trend</h4>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedTitle.watch_trend.map((val, i) => ({ val, i }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                      <XAxis dataKey="i" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#f3f4f6', border: 'none', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Raw Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(selectedTitle.details).slice(0, 8).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b dark:border-gray-700 pb-1">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-right break-all ml-4">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer - Executive Summary */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          {/* Drawer Panel */}
          <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-800 shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Executive Summary</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            
            <div className="space-y-4">
              <textarea 
                className="w-full h-96 p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                readOnly
                value={`FUTURES FIRST - Q1 2025 EXECUTIVE SUMMARY
Generated: ${new Date().toLocaleDateString()}

OVERVIEW:
- Total Titles: ${formatNumber(kpis?.total_titles)}
- Active Viewers: ${formatNumber(kpis?.total_viewers)}
- Total Watch Events: ${formatNumber(kpis?.total_watch_events)}
- Total Revenue: ${formatCurrency(kpis?.total_revenue)}

PERFORMANCE METRICS:
- Platform Avg Rating: ${(kpis?.avg_rating || 0).toFixed(2)}/5.0
- Avg Completion Rate: ${(kpis?.avg_completion_rate || 0).toFixed(1)}%
- Top Performing Genre: ${kpis?.top_genre}
- Top Region: ${kpis?.top_city}

KEY INSIGHTS:
The platform has seen robust engagement driven largely by ${kpis?.top_genre || 'popular'} titles in ${kpis?.top_city || 'key regions'}. Completion rates are tracking at ${(kpis?.avg_completion_rate || 0).toFixed(1)}%. Revenue realization stands strong at ${formatCurrency(kpis?.total_revenue)}.

ACTION ITEMS:
Please refer to the Marketing Efficiency and Regional tables to reallocate Q2 spend toward channels exhibiting high ROAS.`}
              />
              <button 
                onClick={() => navigator.clipboard.writeText(document.querySelector('textarea').value)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable KPI Card Component
function KpiCard({ title, value, delta, deltaType }) {
  const isPos = deltaType === 'positive';
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isPos ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {delta}
        </span>
      </div>
    </div>
  );
}
