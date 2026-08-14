import { useEffect, useState } from 'react';
import { Activity, Droplet, Thermometer, Package, TrendingUp, MessageCircle, Bot, CloudSun, AlertTriangle, Users } from 'lucide-react';

interface DashboardStats {
  totalBirds: number;
  totalCost: number;
  avgWeight: number;
  costPerBird: number;
  unacknowledgedAlerts: number;
  activeBatches: number;
}

interface WeatherData {
  location: string;
  provider: string;
  current: {
    temp: number;
    realFeel: number;
    humidity: number;
    condition: string;
    uvIndex: string;
    windKmh: number;
  };
  forecast: { day: string; high: number; low: number; recommendation: string }[];
}

export default function HomeScreen({ activeFarm }: { activeFarm: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [liveTemp, setLiveTemp] = useState(29.5);
  const [liveHumidity, setLiveHumidity] = useState(62);
  const [tickerIdx, setTickerIdx] = useState(0);

  const TICKERS = [
    '🔴 CRITICAL: Coccidiosis detected in Shed A — treatment initiated',
    '⚠️ Shed B temperature at 36.1°C — auto-fan override active',
    '📋 Batch 02 vaccination due — Newcastle Disease (Lasota) on Day 18',
    '💧 Feed wastage 18% in Shed A feeder line 2 — AI correction suggested',
    '🌧️ Storm forecast tonight — curtain pre-adjustment recommended',
  ];

  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setLiveTemp(prev => Number((prev + (Math.random() * 0.4) - 0.2).toFixed(1)));
      setLiveHumidity(prev => Math.max(40, Math.min(90, Math.round(prev + (Math.random() - 0.5) * 2))));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard')
      .then(r => r.json()).then(setStats).catch(console.error);
    fetch('http://localhost:5000/api/weather')
      .then(r => r.json())
      .then(data => {
        // Fallback for when the backend hasn't been restarted yet
        if (!data.current && data.temp) {
          setWeather({
            location: data.location || 'Nashik, MH',
            provider: 'AccuWeather',
            current: {
              temp: data.temp,
              realFeel: data.temp + 2,
              humidity: data.humidity,
              condition: data.condition,
              uvIndex: 'High',
              windKmh: data.windKmh || 14
            },
            forecast: data.forecast
          });
        } else {
          setWeather(data);
        }
      }).catch(console.error);
  }, [activeFarm]);

  if (!stats) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Connecting to MongoDB backend...
    </div>
  );

  const estimatedProfit = Math.round(stats.totalBirds * 2.0 * 102 - stats.totalCost);

  return (
    <div className="animate-fade-in">
      {/* Alert Ticker */}
      {stats.unacknowledgedAlerts > 0 && (
        <div className="alert-ticker" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
            {stats.unacknowledgedAlerts} ACTIVE ALERTS:
          </span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <span className="alert-ticker-inner">{TICKERS[tickerIdx]}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="screen-title" style={{ marginBottom: '0.25rem' }}>Precision Farm Overview</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>📍 {activeFarm}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {stats.unacknowledgedAlerts > 0 && (
            <div className="badge badge-critical"><AlertTriangle size={10} /> {stats.unacknowledgedAlerts} unresolved alerts</div>
          )}
          <div className="badge badge-success">
            <span className="live-dot" style={{ width: 6, height: 6 }} /> Live Monitoring
          </div>
        </div>
      </div>

      {/* KPI Grid: 6 cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div className="card-title"><Package size={14} /> Total Birds</div>
          <div className="card-value text-success">{stats.totalBirds.toLocaleString()}</div>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>{stats.activeBatches} active batches</div>
          <div className="progress-track">
            <div className="progress-fill progress-fill-success" style={{ width: '97%' }} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div className="card-title"><TrendingUp size={14} /> Avg. Weight</div>
          <div className="card-value text-primary">{stats.avgWeight.toFixed(2)} <span style={{ fontSize: '1rem', fontWeight: 400 }}>kg</span></div>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>Target: 2.2 kg</div>
          <div className="progress-track">
            <div className="progress-fill progress-fill-primary" style={{ width: `${(stats.avgWeight / 2.2) * 100}%` }} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div className="card-title text-warning"><Thermometer size={14} /> Live Temperature</div>
          <div className={`card-value ${liveTemp > 35 ? 'text-danger' : liveTemp > 32 ? 'text-warning' : 'text-success'}`}>{liveTemp.toFixed(1)}°C</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', fontSize: '0.72rem' }}>
            <span className="live-dot" />
            <span className="text-muted">IoT sensor • 25ms latency</span>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div className="card-title"><Droplet size={14} /> Total Expenses</div>
          <div className="card-value text-danger">₹{stats.totalCost.toLocaleString()}</div>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>₹{stats.costPerBird}/bird avg</div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div className="card-title"><Activity size={14} /> Live Humidity</div>
          <div className={`card-value ${liveHumidity > 80 ? 'text-danger' : liveHumidity < 50 ? 'text-warning' : 'text-primary'}`}>{liveHumidity}%</div>
          <div className="progress-track">
            <div className={`progress-fill ${liveHumidity > 80 ? 'progress-fill-danger' : liveHumidity < 50 ? 'progress-fill-warning' : 'progress-fill-primary'}`} style={{ width: `${liveHumidity}%`, transition: 'width 1.5s ease' }} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div className="card-title"><Users size={14} /> Est. Profit</div>
          <div className={`card-value ${estimatedProfit > 0 ? 'text-success' : 'text-danger'}`}>
            ₹{estimatedProfit.toLocaleString()}
          </div>
          <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>At current market ₹102/kg</div>
        </div>
      </div>

      <div className="grid-2">
        {/* AI Smart Insights */}
        <div>
          <div className="card ai-card" style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title text-secondary"><Activity size={18} /> AI Profit Predictor</h3>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>
              Best sell day: <span className="text-secondary">Day 37</span>
            </p>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Expected Profit: <strong className="text-success">₹{estimatedProfit.toLocaleString()}</strong> ({stats.totalBirds.toLocaleString()} birds · FCR 1.62)
            </p>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Growth Rate', val: '94%', pct: 94, cls: 'primary' },
                { label: 'Feed Efficiency', val: '87%', pct: 87, cls: 'secondary' },
                { label: 'Survival Rate', val: '98.4%', pct: 98, cls: 'success' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '0.2rem' }}>
                    <span className="text-muted">{r.label}</span>
                    <span style={{ fontWeight: 600 }}>{r.val}</span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill progress-fill-${r.cls}`} style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp ERP */}
          <div className="card success-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <h3 className="card-title text-success" style={{ margin: 0 }}>
                <MessageCircle size={18} /> WhatsApp ERP Sync
              </h3>
              <span className="badge badge-success">● Connected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              <Bot size={24} className="text-muted" />
              <div>
                <strong>Farmer Assistant Bot</strong>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Multilingual (EN / HI / मर)</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.825rem', border: '1px solid var(--border-card)' }}>
              <span className="text-muted">Last Msg:</span>{' '}
              "Batch A needs feed restock in 2 days."
              <div className="text-success" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                ✓ Read by Farm Manager (10m ago)
              </div>
            </div>
          </div>
        </div>

        {/* Right: Weather + System */}
        <div>
          {weather && (
            <div className="card primary-card" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}><CloudSun size={16} /> Current Weather</h3>
                <span style={{ fontSize: '0.7rem', background: '#e06500', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>ACCUWEATHER</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1 }}>{weather.current.temp}°<span style={{ fontSize: '1.5rem', verticalAlign: 'top' }}>C</span></div>
                  <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>RealFeel® {weather.current.realFeel}°C · {weather.current.condition}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>UV Index: {weather.current.uvIndex} · Wind: {weather.current.windKmh} km/h</div>
                </div>
                <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 10px rgba(255,165,0,0.3))' }}>⛅</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {weather.forecast.map(f => (
                  <div key={f.day} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <div style={{ width: 70, fontWeight: 600, flexShrink: 0 }}>{f.day}</div>
                    <div style={{ width: 80, color: 'var(--text-muted)', flexShrink: 0 }}>H:{f.high}° L:{f.low}°</div>
                    <div className="text-muted" style={{ flex: 1, fontSize: '0.72rem' }}>{f.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 className="card-title">System Status</h3>
            {[
              { label: 'MongoDB Backend', ok: true },
              { label: 'IoT Sensor Stream', ok: true },
              { label: 'YOLOv8 CV Engine', ok: true },
              { label: 'AI Model Server', ok: true },
              { label: 'WhatsApp API', ok: true },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border-card)', fontSize: '0.825rem' }}>
                <span>{s.label}</span>
                <span className={s.ok ? 'text-success' : 'text-danger'} style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                  {s.ok ? '● Online' : '○ Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
