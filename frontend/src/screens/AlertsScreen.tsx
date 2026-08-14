import { useEffect, useState } from 'react';
import {
  Bell, AlertTriangle, Thermometer, Eye, Beef, Syringe,
  CloudRain, Wheat, CheckCircle, MessageSquare, Mail
} from 'lucide-react';

interface AlertData {
  _id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  farmName: string;
  shedId: string;
  acknowledged: boolean;
  notifiedSMS: boolean;
  notifiedEmail: boolean;
  timestamp: string;
}

const CATEGORY_ICONS: Record<string, React.FC<any>> = {
  disease: Eye,
  environment: Thermometer,
  crowding: Beef,
  mortality: AlertTriangle,
  vaccine: Syringe,
  feed: Wheat,
  weather: CloudRain,
};

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [loading, setLoading] = useState(true);

  const loadAlerts = () => {
    fetch('http://localhost:5000/api/alerts')
      .then(r => r.json())
      .then(data => { setAlerts(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadAlerts(); }, []);

  const acknowledge = async (id: string) => {
    await fetch(`http://localhost:5000/api/alerts/${id}/acknowledge`, { method: 'PATCH' });
    loadAlerts();
  };

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length;

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h2 className="screen-title" style={{ marginBottom: '0.25rem' }}>Live Alert Center</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Real-time disease, environment & operational alerts with SMS/Email notifications
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          {criticalCount > 0 && (
            <div className="badge badge-critical"><AlertTriangle size={10} /> {criticalCount} Critical</div>
          )}
          {warningCount > 0 && (
            <div className="badge badge-warning"><Bell size={10} /> {warningCount} Warnings</div>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Alerts', value: alerts.length, color: 'text-main' },
          { label: 'Critical', value: alerts.filter(a => a.severity === 'critical').length, color: 'text-danger' },
          { label: 'Unacknowledged', value: alerts.filter(a => !a.acknowledged).length, color: 'text-warning' },
          { label: 'Resolved Today', value: alerts.filter(a => a.acknowledged).length, color: 'text-success' },
        ].map(k => (
          <div className="card" key={k.label} style={{ padding: '1rem', marginBottom: 0 }}>
            <div className="card-title">{k.label}</div>
            <div className={`card-value ${k.color}`} style={{ fontSize: '1.75rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {(['all', 'critical', 'warning', 'info'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="lang-pill"
            style={{ textTransform: 'capitalize' }}
            id={`filter-${f}`}
          >
            {f === 'all' ? '🔍 All' : f === 'critical' ? '🔴 Critical' : f === 'warning' ? '🟡 Warning' : 'ℹ️ Info'}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading alerts from AI engine...
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle size={32} className="text-success" style={{ margin: '0 auto 0.75rem' }} />
            <p className="text-muted">No alerts in this category.</p>
          </div>
        ) : filtered.map(alert => {
          const Icon = CATEGORY_ICONS[alert.category] || Bell;
          const borderColor = alert.severity === 'critical' ? 'var(--accent-danger)' : alert.severity === 'warning' ? 'var(--accent-warning)' : 'var(--accent-cyan)';
          return (
            <div
              key={alert._id}
              className="card"
              style={{
                borderLeft: `4px solid ${borderColor}`,
                opacity: alert.acknowledged ? 0.55 : 1,
                padding: '1.25rem',
                marginBottom: 0
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.875rem', flex: 1 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                    background: alert.severity === 'critical' ? 'rgba(239,68,68,0.15)' : alert.severity === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(6,182,212,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon size={18} style={{ color: borderColor }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{alert.title}</strong>
                      <span className={`badge badge-${alert.severity === 'info' ? 'info' : alert.severity}`}>
                        {alert.severity}
                      </span>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{alert.category}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                      {alert.message}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                      <span>📍 {alert.farmName} — {alert.shedId}</span>
                      <span>🕐 {timeAgo(alert.timestamp)}</span>
                      {alert.notifiedSMS && <span className="text-success" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><MessageSquare size={11} /> SMS Sent</span>}
                      {alert.notifiedEmail && <span className="text-cyan" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Mail size={11} /> Email Sent</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => acknowledge(alert._id)}
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      id={`ack-${alert._id}`}
                    >
                      <CheckCircle size={13} /> Resolve
                    </button>
                  ) : (
                    <span className="badge badge-success"><CheckCircle size={10} /> Resolved</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notification Settings */}
      <div className="card ai-card" style={{ marginTop: '2rem' }}>
        <h3 className="card-title text-secondary"><Bell size={16} /> Notification Channels</h3>
        <div className="grid-3" style={{ marginTop: '0.75rem' }}>
          {[
            { label: 'SMS Alerts', value: true, desc: '+91-9876543210', color: 'text-success' },
            { label: 'Email Alerts', value: true, desc: 'ramesh@poultry.ai', color: 'text-primary' },
            { label: 'WhatsApp Bot', value: true, desc: 'Farmer Assistant Bot', color: 'text-success' },
          ].map(n => (
            <div key={n.label} style={{ background: 'rgba(255,255,255,0.04)', padding: '0.875rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.label}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>{n.desc}</div>
              </div>
              <div className={n.value ? 'text-success' : 'text-muted'} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {n.value ? '● ON' : '○ OFF'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
