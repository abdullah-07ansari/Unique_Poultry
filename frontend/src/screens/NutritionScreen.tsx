import { useEffect, useState } from 'react';
import { Wheat, Droplets, AlertTriangle, Brain, Clock, Zap } from 'lucide-react';

interface NutritionData {
  _id: string;
  batchName: string;
  feedType: string;
  proteinPct: number;
  fatPct: number;
  fiberPct: number;
  dailyFeedKg: number;
  waterLitersPer100: number;
  scheduleAM: string;
  schedulePM: string;
  wastageFlag: boolean;
  wastagePct: number;
  aiRecommendation: string;
  weekNumber: number;
}



export default function NutritionScreen() {
  const [plans, setPlans] = useState<NutritionData[]>([]);
  const [liveWater, setLiveWater] = useState([68, 82, 55, 44]);

  useEffect(() => {
    fetch('http://localhost:5000/api/nutrition')
      .then(r => r.json())
      .then(setPlans)
      .catch(() => {});
  }, []);

  // Simulate live water consumption
  useEffect(() => {
    const t = setInterval(() => {
      setLiveWater(prev => {
        return prev.map(v => Math.max(10, Math.min(98, v + (Math.random() - 0.52) * 3)));
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const globalWastageAvg = plans.reduce((s, p) => s + p.wastagePct, 0) / (plans.length || 1);

  return (
    <div className="animate-fade-in">
      <h2 className="screen-title" style={{ marginBottom: '0.5rem' }}>AI Nutrition Optimizer</h2>
      <p className="text-muted" style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>
        Reinforcement-learning feed schedules, wastage detection via load-cell sensors, and precision water management.
      </p>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Feed Plans Active', value: plans.length, unit: 'batches', color: 'text-success', icon: Wheat },
          { label: 'Avg Daily Feed', value: plans.reduce((s, p) => s + p.dailyFeedKg, 0), unit: 'kg/day', color: 'text-primary', icon: Zap },
          { label: 'Avg Feed Wastage', value: globalWastageAvg.toFixed(1), unit: '%', color: globalWastageAvg > 10 ? 'text-danger' : 'text-success', icon: AlertTriangle },
          { label: 'AI Interventions', value: plans.filter(p => p.wastageFlag).length, unit: 'active', color: 'text-secondary', icon: Brain },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div className="card" key={k.label} style={{ padding: '1.25rem', marginBottom: 0 }}>
              <div className="card-title"><Icon size={14} />{k.label}</div>
              <div className={`card-value ${k.color}`} style={{ fontSize: '1.6rem' }}>
                {k.value} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>{k.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        {/* Nutrition Plans */}
        <div>
          {plans.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading nutrition data...
            </div>
          ) : plans.map(plan => (
            <div className="card" key={plan._id} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{plan.batchName}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-info">Week {plan.weekNumber}</span>
                  {plan.wastageFlag && <span className="badge badge-warning"><AlertTriangle size={10} /> Wastage</span>}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {plan.feedType}
                </div>
                <div className="grid-3" style={{ gap: '0.5rem' }}>
                  {[
                    { label: 'Protein', value: plan.proteinPct, color: '#3b82f6' },
                    { label: 'Fat', value: plan.fatPct, color: '#f59e0b' },
                    { label: 'Fiber', value: plan.fiberPct, color: '#10b981' },
                  ].map(n => (
                    <div key={n.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: n.color }}>{n.value}%</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.825rem', marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={14} className="text-muted" />
                  <span>AM Feed: <strong>{plan.scheduleAM}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={14} className="text-muted" />
                  <span>PM Feed: <strong>{plan.schedulePM}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wheat size={14} className="text-muted" />
                  <span>Daily: <strong>{plan.dailyFeedKg} kg</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Droplets size={14} className="text-cyan" />
                  <span>Water: <strong>{plan.waterLitersPer100}L/100 birds</strong></span>
                </div>
              </div>

              {/* Wastage Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  <span className="text-muted">Feed Wastage</span>
                  <span className={plan.wastagePct > 10 ? 'text-danger' : 'text-success'} style={{ fontWeight: 600 }}>{plan.wastagePct}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${plan.wastagePct > 10 ? 'progress-fill-danger' : 'progress-fill-success'}`}
                    style={{ width: `${plan.wastagePct}%` }}
                  />
                </div>
              </div>

              {/* AI Recommendation */}
              <div className="ai-card" style={{ marginTop: '0.875rem', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <Brain size={16} className="text-secondary" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    <strong className="text-secondary">AI Insight: </strong>{plan.aiRecommendation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Water + Weather Feed */}
        <div>
          {/* Live Water Consumption */}
          <div className="card" style={{ borderTop: '3px solid var(--accent-cyan)', marginBottom: '1.25rem' }}>
            <h3 className="card-title text-cyan"><Droplets size={16} /> Live Water Consumption</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              Nipple drinker flow meters — live IoT telemetry per shed
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {['Shed A', 'Shed B', 'Shed C', 'Shed D'].map((shed, i) => (
                <div key={shed}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.825rem' }}>
                    <span style={{ fontWeight: 500 }}>{shed}</span>
                    <span style={{ color: liveWater[i] < 30 ? 'var(--accent-danger)' : liveWater[i] < 50 ? 'var(--accent-warning)' : 'var(--accent-success)', fontWeight: 700 }}>
                      {liveWater[i].toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: '8px' }}>
                    <div
                      className={`progress-fill ${liveWater[i] < 30 ? 'progress-fill-danger' : liveWater[i] < 50 ? 'progress-fill-warning' : 'progress-fill-primary'}`}
                      style={{ width: `${liveWater[i]}%`, transition: 'width 1.5s ease' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(6,182,212,0.08)', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.2)', fontSize: '0.8rem' }}>
              <span className="text-cyan">💧 Total consumption today: <strong>3,840 L</strong></span>
              <br/>
              <span className="text-muted">Optimal: 18L per 100 birds = 3,600L expected. +6.7% above normal.</span>
            </div>
          </div>

          {/* Feed Wastage Savings Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.05))', borderColor: 'rgba(16,185,129,0.3)', marginBottom: '1.25rem' }}>
            <h3 className="card-title text-success"><Zap size={16} /> Wastage Savings Projection</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>
              ₹<span className="text-success">1,200</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Projected daily savings if feeder heights corrected to AI optimal
            </p>
            <div style={{ marginTop: '1rem' }}>
              {[
                { label: 'Feeder Height Correction (Shed A)', saving: '₹800/day' },
                { label: 'Nipple drinker pressure adjustment', saving: '₹250/day' },
                { label: 'Feed timing optimization (AM 30min earlier)', saving: '₹150/day' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-card)', fontSize: '0.8rem' }}>
                  <span className="text-muted">{r.label}</span>
                  <span className="text-success" style={{ fontWeight: 700 }}>{r.saving}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Feed Schedule */}
          <div className="card">
            <h3 className="card-title"><Clock size={16} /> Today's Feed Schedule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              {[
                { time: '05:30 AM', batch: 'Batch 01', feed: 'Finisher Pro 420kg', status: 'done' },
                { time: '02:30 PM', batch: 'Batch 01', feed: 'Finisher Pro 420kg', status: 'upcoming' },
                { time: '06:00 AM', batch: 'Batch 02', feed: 'Starter Boost 180kg', status: 'done' },
                { time: '03:00 PM', batch: 'Batch 02', feed: 'Starter Boost 180kg', status: 'upcoming' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'done' ? 'var(--accent-success)' : 'var(--accent-warning)', flexShrink: 0 }} />
                  <div style={{ width: '70px', fontSize: '0.8rem', fontWeight: 700 }}>{s.time}</div>
                  <div style={{ flex: 1, fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600 }}>{s.batch}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.feed}</div>
                  </div>
                  <span className={`badge ${s.status === 'done' ? 'badge-success' : 'badge-warning'}`}>
                    {s.status === 'done' ? '✓ Done' : '⏳ Due'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
