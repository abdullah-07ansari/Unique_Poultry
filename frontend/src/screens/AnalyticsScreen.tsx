import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { Brain, TrendingUp, Scale, BarChart2 } from 'lucide-react';

const weeklyData = [
  { week: 'Wk 1', cost: 8200, revenue: 0, weight: 0.2, fcr: 0 },
  { week: 'Wk 2', cost: 14500, revenue: 0, weight: 0.55, fcr: 1.4 },
  { week: 'Wk 3', cost: 21000, revenue: 0, weight: 0.98, fcr: 1.5 },
  { week: 'Wk 4', cost: 28400, revenue: 0, weight: 1.42, fcr: 1.57 },
  { week: 'Wk 5', cost: 36400, revenue: 61200, weight: 1.82, fcr: 1.62 },
  { week: 'Wk 6', cost: 43200, revenue: 92100, weight: 2.18, fcr: 1.65 },
];

const mortalityData = [
  { week: 'Wk 1', rate: 0.15 }, { week: 'Wk 2', rate: 0.28 },
  { week: 'Wk 3', rate: 0.45 }, { week: 'Wk 4', rate: 0.52 },
  { week: 'Wk 5', rate: 0.60 }, { week: 'Wk 6', rate: 0.80 },
];

export default function AnalyticsScreen() {
  return (
    <div className="animate-fade-in">
      <h2 className="screen-title" style={{ marginBottom: '0.5rem' }}>AI Profit & Performance Analytics</h2>
      <p className="text-muted" style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>
        Deep-dive P&amp;L, FCR curves, mortality trends and predictive growth projections powered by ML
      </p>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Current FCR', value: '1.62', sub: 'Target: 1.55', icon: Scale, color: 'text-warning', good: false },
          { label: 'Prod. Cost/kg', value: '₹84', sub: 'Market: ₹102/kg', icon: BarChart2, color: 'text-primary', good: true },
          { label: 'Est. Batch Return', value: '₹92,100', sub: '+12% Margin', icon: TrendingUp, color: 'text-success', good: true },
          { label: 'AI Confidence', value: '94.7%', sub: 'Model accuracy', icon: Brain, color: 'text-secondary', good: true },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div className="card" key={k.label} style={{ padding: '1.25rem', marginBottom: 0 }}>
              <div className="card-title"><Icon size={14} />{k.label}</div>
              <div className={`card-value ${k.color}`} style={{ fontSize: '1.5rem' }}>{k.value}</div>
              <div className={k.good ? 'text-success' : 'text-warning'} style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Cost vs Revenue Area Chart */}
      <div className="card primary-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title text-primary"><TrendingUp size={16} /> Cost vs Revenue Curve (6-Week Cycle)</h3>
        <div style={{ width: '100%', height: 260, marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '10px' }}
                formatter={(v: any) => [`₹${Number(v).toLocaleString()}`]}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Area type="monotone" dataKey="cost" name="Total Cost" stroke="#ef4444" fill="url(#costGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        {/* FCR + Weight Line Chart */}
        <div className="card">
          <h3 className="card-title"><Scale size={16} /> FCR vs Weight Growth</h3>
          <div style={{ width: '100%', height: 220, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="w" stroke="var(--text-muted)" tick={{ fontSize: 10 }} unit="kg" />
                <YAxis yAxisId="f" orientation="right" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '10px' }} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Line yAxisId="w" type="monotone" dataKey="weight" name="Avg Weight (kg)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="f" type="monotone" dataKey="fcr" name="FCR" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mortality Bar Chart */}
        <div className="card">
          <h3 className="card-title text-danger"><BarChart2 size={16} /> Weekly Mortality Rate (%)</h3>
          <div style={{ width: '100%', height: 220, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mortalityData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '10px' }} formatter={(v: any) => [`${v}%`]} />
                <Bar dataKey="rate" name="Mortality %" fill="#ef4444" fillOpacity={0.75} radius={[5,5,0,0]}>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Recommendation Summary */}
      <div className="card ai-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title text-secondary"><Brain size={16} /> Reinforcement Learning Recommendations</h3>
        <div className="grid-3" style={{ marginTop: '0.75rem' }}>
          {[
            { title: 'Sell Timing', insight: 'Optimal sell window: Days 36–38 for maximum FCR-adjusted profit. Current market rate ₹102/kg favourable.', impact: '+₹8,400 potential' },
            { title: 'Feed Adjustment', insight: 'Increase protein to 21% from week 6 onwards. Projected FCR improvement from 1.62 → 1.55.', impact: 'Save ₹3,200/cycle' },
            { title: 'Disease Prevention', insight: 'Coccidiosis risk high based on humidity patterns. Pre-emptive Vitamin E + Selenium supplementation recommended.', impact: 'Reduce mortality 0.3%' },
          ].map(r => (
            <div key={r.title} style={{ background: 'rgba(255,255,255,0.04)', padding: '0.875rem', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>{r.title}</div>
              <p className="text-muted" style={{ fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>{r.insight}</p>
              <span className="badge badge-success">{r.impact}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
