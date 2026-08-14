import { useState, useEffect } from 'react';
import { HeartPulse, Stethoscope, Search, Mic, Camera, AlertTriangle, Syringe, ChevronRight } from 'lucide-react';

const TODAY = new Date();
const MONTH_DAYS = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
const VACCINE_DAYS: Record<number, string> = { 7: 'Marek\'s', 14: 'Newcastle', 18: 'IBD', 21: 'Newcastle boost', 35: 'Fowl Pox' };
const DONE_DAYS = [7, 14];

export default function HealthScreen() {
  const [symptomInput, setSymptomInput] = useState('');
  const [diagnosis, setDiagnosis] = useState<{ disease: string; action: string; confidence: number } | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1800);
    return () => clearInterval(t);
  }, []);

  const handleDiagnose = () => {
    const text = symptomInput.toLowerCase();
    if (text.includes('diarrhea') || text.includes('blood') || text.includes('coccid')) {
      setDiagnosis({ disease: 'Coccidiosis (Mild–Moderate)', action: 'Administer Amprolium 20% (1g/2L) for 3 days. Isolate affected birds. Monitor mortality.', confidence: 91 });
    } else if (text.includes('respiratory') || text.includes('cough') || text.includes('sneezing')) {
      setDiagnosis({ disease: 'Infectious Bronchitis (IB)', action: 'Supportive treatment: electrolytes + Vitamin C. Antibiotic cover for 5 days. Check ventilation.', confidence: 84 });
    } else if (text.includes('swollen') || text.includes('head') || text.includes('newcastle')) {
      setDiagnosis({ disease: 'Newcastle Disease (ND)', action: 'No treatment. Emergency vaccination of unvaccinated flock. Notify state veterinary authorities.', confidence: 88 });
    } else if (text.includes('tumble') || text.includes('leg') || text.includes('weak')) {
      setDiagnosis({ disease: 'Marek\'s Disease / Nutritional Deficiency', action: 'Check vitamin D3 & phosphorus levels. Increase feed protein to 24%. Isolate lame birds.', confidence: 76 });
    } else if (text.trim().length > 0) {
      setDiagnosis({ disease: 'Unclassified Symptom Pattern', action: 'AI confidence too low for diagnosis. Schedule TeleVet consultation for physical examination.', confidence: 42 });
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="screen-title" style={{ marginBottom: '1.75rem' }}>Precision Health Analytics</h2>
      <div className="grid-2">
        {/* Left: Diagnostics */}
        <div>
          <div className="card ai-card" style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title text-secondary"><Search size={16} /> Disease Diagnostic NLP</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-app)', padding: '0.625rem 0.875rem', borderRadius: '10px', border: '1px solid var(--border-card)', marginTop: '0.5rem' }}>
              <input
                type="text"
                id="symptom-input"
                placeholder="Describe symptoms e.g. 'blood in stool', 'respiratory distress'..."
                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '0.875rem' }}
                value={symptomInput}
                onChange={e => setSymptomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDiagnose()}
              />
              <button style={{ background: 'var(--accent-secondary)', border: 'none', borderRadius: '8px', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={handleDiagnose} id="diagnose-btn">
                <Mic size={16} color="#fff" />
              </button>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem', width: '100%' }} onClick={handleDiagnose} id="diagnose-submit">
              <Search size={14} /> Analyze Symptoms with AI
            </button>
          </div>

          {diagnosis && (
            <div className="card danger-card" style={{ marginBottom: '1.25rem' }}>
              <h3 className="card-title text-danger"><HeartPulse size={16} /> AI Diagnosis Result</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{diagnosis.disease}</p>
                <span className="badge badge-warning">Confidence: {diagnosis.confidence}%</span>
              </div>
              <div className="progress-track" style={{ marginBottom: '1rem' }}>
                <div className={`progress-fill ${diagnosis.confidence > 80 ? 'progress-fill-danger' : 'progress-fill-warning'}`} style={{ width: `${diagnosis.confidence}%` }} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <strong>Recommended Action:</strong><br />{diagnosis.action}
              </div>
              <button className="btn btn-outline" style={{ marginTop: '0.875rem', width: '100%' }}>
                <Stethoscope size={14} /> Consult TeleVet via Video
              </button>
            </div>
          )}

          {/* Vaccination Calendar */}
          <div className="card">
            <h3 className="card-title text-secondary"><Syringe size={16} /> Vaccination Calendar — {TODAY.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '3px', background: 'rgba(139,92,246,0.4)', border: '1px solid rgba(139,92,246,0.4)' }} /> Due
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '3px', background: 'rgba(16,185,129,0.3)', border: '1px solid rgba(16,185,129,0.3)' }} /> Done
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '3px', background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(59,130,246,0.4)' }} /> Today
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '0.25rem 0', fontWeight: 600 }}>{d}</div>)}
            </div>
            <div className="cal-grid">
              {Array.from({ length: MONTH_DAYS }, (_, i) => i + 1).map(d => {
                const isToday = d === TODAY.getDate();
                const isDue = d > TODAY.getDate() && VACCINE_DAYS[d];
                const isDone = DONE_DAYS.includes(d) || (d < TODAY.getDate() && VACCINE_DAYS[d]);
                const vaccName = VACCINE_DAYS[d];
                return (
                  <div
                    key={d}
                    className={`cal-day ${isToday ? 'today' : isDue ? 'vaccine-due' : isDone ? 'vaccine-done' : ''}`}
                    title={vaccName ? vaccName : ''}
                  >
                    {d}
                    {vaccName && <div className="cal-dot" style={{ background: isDone ? 'var(--accent-success)' : isDue ? 'var(--accent-secondary)' : 'var(--text-dim)' }} />}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {Object.entries(VACCINE_DAYS).map(([day, name]) => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border-card)' }}>
                  <span>Day {day} — {name}</span>
                  <span className={`badge ${DONE_DAYS.includes(parseInt(day)) ? 'badge-success' : parseInt(day) > TODAY.getDate() ? 'badge-warning' : 'badge-success'}`}>
                    {DONE_DAYS.includes(parseInt(day)) ? '✓ Done' : parseInt(day) > TODAY.getDate() ? 'Upcoming' : '✓ Done'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: YOLOv8 CV */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title text-success" style={{ margin: 0 }}><Camera size={18} /> YOLOv8 Computer Vision</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="live-dot" style={{ background: pulse ? 'var(--accent-success)' : 'rgba(16,185,129,0.3)', transition: 'background 0.3s' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', fontWeight: 600 }}>LIVE</span>
              </div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '260px', background: 'linear-gradient(135deg, #0a1628, #111827)' }}>
              <img src="/yolo_feed.png" alt="CCTV Poultry Feed" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
              {/* Bounding Boxes */}
              {[
                { top: '28%', left: '18%', w: 42, h: 42, color: '#10b981', label: 'Broiler', conf: 0.95 },
                { top: '52%', left: '42%', w: 38, h: 38, color: '#10b981', label: 'Broiler', conf: 0.91 },
                { top: '40%', left: '60%', w: 40, h: 40, color: '#10b981', label: 'Broiler', conf: 0.89 },
                { top: '68%', left: '78%', w: 48, h: 48, color: '#ef4444', label: '⚠ Anomaly', conf: 0.88 },
              ].map((box, i) => (
                <div key={i} style={{ position: 'absolute', top: box.top, left: box.left, width: box.w, height: box.h, border: `2px solid ${box.color}`, background: `${box.color}1a` }}>
                  <span style={{ position: 'absolute', top: -18, left: 0, background: box.color, color: '#fff', fontSize: '9px', padding: '0 3px', whiteSpace: 'nowrap', borderRadius: '2px' }}>
                    {box.label} {box.conf}
                  </span>
                </div>
              ))}
              <div style={{ position: 'absolute', top: 8, right: 10, color: '#fff', fontSize: '9px', textAlign: 'right', textShadow: '0 1px 2px #000', lineHeight: 1.8 }}>
                CAM-A3 · Shed 2<br />Inference: {pulse ? '22' : '24'}ms<br />Detected: 1,420
              </div>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)', fontWeight: 600, fontSize: '0.875rem' }}>
                <AlertTriangle size={16} /> Crowding Alert — Sector C
              </div>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                Bird density 18/m² (threshold: 15). AI suggests auto-fan override & sector redistribution.
              </p>
            </div>
          </div>

          {/* Bird Health Status Breakdown */}
          <div className="card">
            <h3 className="card-title"><HeartPulse size={16} /> Flock Health Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              {[
                { label: 'Healthy Birds', pct: 93, count: 18196, cls: 'success' },
                { label: 'Under Observation', pct: 4, count: 782, cls: 'warning' },
                { label: 'Sick / Isolated', pct: 2, count: 391, cls: 'danger' },
                { label: 'Deceased (24h)', pct: 1, count: 148, cls: 'secondary' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span>{s.label}</span>
                    <span style={{ fontWeight: 600 }}>{s.count.toLocaleString()} <span className="text-muted">({s.pct}%)</span></span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill progress-fill-${s.cls}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-outline" style={{ marginTop: '1.25rem', width: '100%' }}>
              <ChevronRight size={14} /> View Full Health Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
