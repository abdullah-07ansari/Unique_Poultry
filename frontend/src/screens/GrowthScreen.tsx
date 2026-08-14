import { useEffect, useState } from 'react';
import { TrendingUp, Weight, Skull, Calendar, DollarSign, BarChart2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

interface GrowthData {
  batchName: string;
  currentWeight: number;
  dayAge: number;
  predictedDaysToHarvest: number;
  mortalityRate: number;
  fcr: number;
  projectedRevenue: number;
  growthCurve: { day: string; weight: number; target: number }[];
}

export default function GrowthScreen() {
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/growth')
      .then(r => r.json())
      .then(setGrowth)
      .catch(() => {});
  }, []);

  // Mortality trend mock data
  const mortalityTrend = [
    { week: 'Wk 1', actual: 0.2, predicted: 0.3 },
    { week: 'Wk 2', actual: 0.4, predicted: 0.35 },
    { week: 'Wk 3', actual: 0.8, predicted: 0.6 },
    { week: 'Wk 4', actual: 1.1, predicted: 0.9 },
    { week: 'Wk 5', actual: 1.2, predicted: 1.1, predicted2: 1.5 },
    { week: 'Wk 6', predicted2: 1.4 },
    { week: 'Wk 7 (forecast)', predicted2: 1.2 },
  ];

  const current = growth[selected];

  return (
    <div className="animate-fade-in">
      <h2 className="screen-title" style={{ marginBottom: '0.5rem' }}>AI Growth Predictor</h2>
      <p className="text-muted" style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>
        Deep learning weight forecasts, FCR optimization, mortality risk modeling & harvest timing engine
      </p>

      {/* Batch Selector Pills */}
      {growth.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {growth.map((g, i) => (
            <button
              key={i}
              className={`lang-pill ${selected === i ? 'active' : ''}`}
              onClick={() => setSelected(i)}
              id={`growth-batch-${i}`}
            >
              {g.batchName}
            </button>
          ))}
        </div>
      )}

      {!current ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading growth data from ML model...
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            {[
              { label: 'Current Weight', value: `${current.currentWeight.toFixed(2)} kg`, sub: `Day ${current.dayAge}`, icon: Weight, color: 'text-primary' },
              { label: 'Days to Harvest', value: current.predictedDaysToHarvest, sub: 'AI forecast @ 2.2kg', icon: Calendar, color: current.predictedDaysToHarvest <= 5 ? 'text-warning' : 'text-success' },
              { label: 'Mortality Rate', value: `${current.mortalityRate}%`, sub: 'Threshold: 0.5%', icon: Skull, color: current.mortalityRate > 1 ? 'text-danger' : 'text-success' },
              { label: 'Est. Revenue', value: `₹${current.projectedRevenue.toLocaleString()}`, sub: `FCR: ${current.fcr}`, icon: DollarSign, color: 'text-success' },
            ].map(k => {
              const Icon = k.icon;
              return (
                <div className="card" key={k.label} style={{ padding: '1.25rem', marginBottom: 0 }}>
                  <div className="card-title"><Icon size={14} />{k.label}</div>
                  <div className={`card-value ${k.color}`} style={{ fontSize: '1.5rem' }}>{k.value}</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>{k.sub}</div>
                </div>
              );
            })}
          </div>

          {/* Harvest Countdown */}
          <div className="card" style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.05))',
            borderColor: current.predictedDaysToHarvest <= 5 ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.3)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="card-title text-success"><Calendar size={16} /> Optimal Harvest Window</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                  {current.predictedDaysToHarvest <= 0
                    ? <span className="text-success">🎯 READY TO HARVEST</span>
                    : <span>{current.predictedDaysToHarvest} <span style={{ fontSize: '1rem', fontWeight: 400 }}>days remaining</span></span>
                  }
                </div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  RL model recommends selling at +2.2kg (market rate ₹102/kg). Expected profit margin: <strong className="text-success">+14.3%</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progress to Target</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {Math.min(100, Math.round((current.currentWeight / 2.2) * 100))}%
                </div>
                <div className="progress-track" style={{ width: '120px', marginLeft: 'auto', marginTop: '0.5rem', height: '8px' }}>
                  <div
                    className="progress-fill progress-fill-success"
                    style={{ width: `${Math.min(100, (current.currentWeight / 2.2) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Weight Growth Curve */}
            <div className="card">
              <h3 className="card-title text-primary"><TrendingUp size={16} /> Weight Growth Curve (7-Day)</h3>
              <div style={{ width: '100%', height: 220, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={current.growthCurve} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit="kg" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '10px' }}
                      formatter={(v) => [`${Number(v).toFixed(2)} kg`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                    <Area type="monotone" dataKey="target" name="AI Target" stroke="#10b981" strokeDasharray="5 5" fill="url(#targetGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="weight" name="Actual Weight" stroke="#3b82f6" fill="url(#weightGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mortality Trend */}
            <div className="card">
              <h3 className="card-title text-danger"><Skull size={16} /> Mortality Risk Trend</h3>
              <div style={{ width: '100%', height: 220, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mortalityTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="week" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '10px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                    <Bar dataKey="actual" name="Actual %" fill="#ef4444" fillOpacity={0.8} radius={[4,4,0,0]} />
                    <Bar dataKey="predicted" name="ML Predicted %" fill="#f59e0b" fillOpacity={0.6} radius={[4,4,0,0]} />
                    <Bar dataKey="predicted2" name="Forecast %" fill="#8b5cf6" fillOpacity={0.5} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* All Batches Summary */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 className="card-title"><BarChart2 size={16} /> All Batch Growth Summary</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {['Batch', 'Day', 'Wt (kg)', 'FCR', 'Mortality', 'Days to Harvest', 'Revenue'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {growth.map((g, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-card)', cursor: 'pointer', background: selected === i ? 'rgba(59,130,246,0.07)' : 'transparent' }} onClick={() => setSelected(i)}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{g.batchName}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>Day {g.dayAge}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--accent-primary)' }}>{g.currentWeight.toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{g.fcr}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: g.mortalityRate > 1 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{g.mortalityRate}%</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: g.predictedDaysToHarvest <= 5 ? 'var(--accent-warning)' : 'var(--text-main)' }}>
                        {g.predictedDaysToHarvest <= 0 ? '✅ Ready!' : `${g.predictedDaysToHarvest} days`}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--accent-success)', fontWeight: 700 }}>₹{g.projectedRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
