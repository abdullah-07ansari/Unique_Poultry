import { useState } from 'react';
import { Settings, Users, Building2, Shield, Wifi, WifiOff, UserCheck, Plus } from 'lucide-react';

const ROLES = ['Admin', 'Farm Manager', 'Vet', 'Viewer'];
const USERS = [
  { name: 'Ramesh Patil', role: 'Admin', farm: 'Nashik Unit', status: 'online' },
  { name: 'Sunita Kadam', role: 'Farm Manager', farm: 'Pune Unit', status: 'online' },
  { name: 'Dr. Priya Rao', role: 'Vet', farm: 'All Farms', status: 'offline' },
  { name: 'Vijay Shinde', role: 'Farm Manager', farm: 'Aurangabad', status: 'offline' },
  { name: 'Arjun Mehta', role: 'Viewer', farm: 'Nashik Unit', status: 'online' },
];

export default function SettingsScreen() {
  const [offlineMode, setOfflineMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [autoAlerts, setAutoAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoLight, setAutoLight] = useState(true);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <div
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 99, cursor: 'pointer',
        background: value ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.3s', position: 'relative', flexShrink: 0
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: value ? 23 : 3,
        transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
      }} />
    </div>
  );

  const Row = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 0', borderBottom: '1px solid var(--border-card)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>{desc}</div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div className="animate-fade-in">
      <h2 className="screen-title" style={{ marginBottom: '0.5rem' }}>Settings & Administration</h2>
      <p className="text-muted" style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>
        Role-based access control, multi-farm configuration, system preferences and integrations
      </p>

      <div className="grid-2">
        {/* Left Column */}
        <div>
          {/* Role-Based Access */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title"><Shield size={16} /> Your Role & Permissions</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem', marginBottom: '1rem' }}>
              {ROLES.map(r => (
                <button
                  key={r}
                  className={`lang-pill ${selectedRole === r ? 'active' : ''}`}
                  onClick={() => setSelectedRole(r)}
                  id={`role-${r.toLowerCase()}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.875rem', borderRadius: '10px', fontSize: '0.825rem' }}>
              {selectedRole === 'Admin' && '🔓 Full access: View, edit, create farms/batches, manage users, all API controls'}
              {selectedRole === 'Farm Manager' && '🔑 Can view dashboards, log expenses, manage batches, view alerts. Cannot manage users.'}
              {selectedRole === 'Vet' && '⚕️ Read-only access to Health & Disease screens. Can log vaccination records.'}
              {selectedRole === 'Viewer' && '👁️ Read-only access to dashboard KPIs and analytics. No edit permissions.'}
            </div>
          </div>

          {/* User Management */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}><Users size={16} /> Team Members</h3>
              <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                <Plus size={13} /> Invite User
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {USERS.map(u => (
                <div key={u.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                    {u.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{u.farm}</div>
                  </div>
                  <span className={`badge ${u.role === 'Admin' ? 'badge-warning' : u.role === 'Vet' ? 'badge-info' : 'badge-success'}`}>{u.role}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.status === 'online' ? 'var(--accent-success)' : 'var(--text-dim)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* System Preferences */}
          <div className="card">
            <h3 className="card-title"><Settings size={16} /> System Preferences</h3>
            <Row label="Automated Alerts" desc="Auto-send SMS/Email on critical events" value={autoAlerts} onChange={() => setAutoAlerts(v => !v)} />
            <Row label="Dark Mode" desc="Toggle dark/light interface theme" value={darkMode} onChange={() => setDarkMode(v => !v)} />
            <Row label="Auto Lighting Control" desc="IoT-driven lux optimization in all sheds" value={autoLight} onChange={() => setAutoLight(v => !v)} />
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Multi-Farm Management */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}><Building2 size={16} /> Farm Registry</h3>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                <Plus size={13} /> Add Farm
              </button>
            </div>
            {[
              { name: 'Unique Poultry Farm — Nashik Unit', loc: 'Nashik, MH', sheds: 4, cap: 20000, status: 'active', manager: 'Ramesh Patil', gps: '19.99°N, 73.78°E' },
              { name: 'Green Valley Farm — Pune Unit', loc: 'Pune, MH', sheds: 3, cap: 15000, status: 'active', manager: 'Sunita Kadam', gps: '18.52°N, 73.85°E' },
              { name: 'Agro Star Farm — Aurangabad', loc: 'Aurangabad, MH', sheds: 2, cap: 8000, status: 'maintenance', manager: 'Vijay Shinde', gps: '19.87°N, 75.34°E' },
            ].map(f => (
              <div key={f.name} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '0.625rem', borderLeft: `3px solid ${f.status === 'active' ? 'var(--accent-success)' : 'var(--accent-warning)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.875rem' }}>{f.name}</strong>
                  <span className={`badge ${f.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{f.status}</span>
                </div>
                <div className="grid-2" style={{ gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>📍 {f.loc}</span>
                  <span>🛖 {f.sheds} sheds · {f.cap.toLocaleString()} capacity</span>
                  <span>👤 {f.manager}</span>
                  <span>🛰️ GPS: {f.gps}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Offline Sync */}
          <div className="card success-card" style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title"><UserCheck size={16} /> Offline Mode & Sync</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{offlineMode ? 'Offline Mode Active' : 'Online — Cloud Sync'}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {offlineMode ? 'Data cached locally. Will sync on reconnect.' : 'All data synced to cloud MongoDB in real-time'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {offlineMode ? <WifiOff size={20} className="text-warning" /> : <Wifi size={20} className="text-success" />}
                <div
                  onClick={() => setOfflineMode(v => !v)}
                  id="offline-toggle"
                  style={{
                    width: 44, height: 24, borderRadius: 99, cursor: 'pointer',
                    background: offlineMode ? 'var(--accent-warning)' : 'var(--accent-success)',
                    transition: 'background 0.3s', position: 'relative', flexShrink: 0
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, left: offlineMode ? 23 : 3, transition: 'left 0.3s'
                  }} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span className="text-muted">Last sync</span>
                <span>2 min ago</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span className="text-muted">Pending records</span>
                <span className={offlineMode ? 'text-warning' : 'text-success'}>
                  {offlineMode ? '14 queued' : '0 — All synced ✓'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Local cache size</span>
                <span>4.2 MB</span>
              </div>
            </div>
          </div>

          {/* API Integrations */}
          <div className="card">
            <h3 className="card-title">🔗 API Integrations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {[
                { name: 'WhatsApp Business API', status: 'connected', desc: 'Farmer bot active' },
                { name: 'IMD Weather API', status: 'connected', desc: 'Real-time forecast' },
                { name: 'Nashik Mandi Rates', status: 'connected', desc: 'Live price data' },
                { name: 'SMS Gateway (Twilio)', status: 'connected', desc: 'Alert notifications' },
                { name: 'Firebase Cloud Messaging', status: 'pending', desc: 'Push notifications' },
                { name: 'GPS Node API (Farm Track)', status: 'pending', desc: 'Real-time GPS map' },
              ].map(api => (
                <div key={api.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.625rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{api.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{api.desc}</div>
                  </div>
                  <span className={`badge ${api.status === 'connected' ? 'badge-success' : 'badge-warning'}`}>
                    {api.status === 'connected' ? '● Connected' : '○ Pending'}
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
