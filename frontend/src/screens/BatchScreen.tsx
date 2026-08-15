import { useEffect, useState, useCallback } from 'react';
import {
  Plus, ChevronLeft, ClipboardList, Pencil, Trash2,
  CheckCircle, AlertCircle, Info, Calendar, Bird, Leaf,
  Droplets, Thermometer, Scale
} from 'lucide-react';

import type { Batch, Farm, Shed, DailyFlockRecord, BatchPerformance, DailyRecordFormData, NewBatchFormData } from '../types/api';
import {
  fetchBatches, fetchFarms, fetchSheds, fetchDailyRecords,
  createDailyRecord, updateDailyRecord, deleteDailyRecord,
  createBatch, friendlyError, refetchBatch, fetchBatchPerformance
} from '../api/flockApi';

// =====================================================================
// Helpers
// =====================================================================

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function calcFlockDay(placementDate: string, selectedDate: string): number {
  const p = new Date(placementDate).getTime();
  const s = new Date(selectedDate).getTime();
  return Math.floor((s - p) / 86_400_000) + 1;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '0.0%';
  return ((part / whole) * 100).toFixed(1) + '%';
}

// =====================================================================
// Toast System
// =====================================================================

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastSeq = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          role="alert"
          onClick={() => onDismiss(t.id)}
          style={{ cursor: 'pointer' }}
        >
          {t.type === 'success' && <CheckCircle size={16} />}
          {t.type === 'error'   && <AlertCircle size={16} />}
          {t.type === 'info'    && <Info size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// =====================================================================
// Confirm Dialog
// =====================================================================

function ConfirmDialog({
  message, onConfirm, onCancel
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-box">
        <h3>Confirm</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Form validation
// =====================================================================

interface FormErrors {
  date?: string;
  feedConsumedKg?: string;
  waterConsumedLiters?: string;
  mortality?: string;
  culls?: string;
  mortalityCullsTotal?: string;
  averageWeightKg?: string;
  sampleSize?: string;
  temperatureC?: string;
  humidityPct?: string;
  ammoniaPpm?: string;
}

function validateRecord(
  data: DailyRecordFormData,
  placementDate: string,
  aliveBirds: number
): FormErrors {
  const errs: FormErrors = {};

  // Date range: placement <= date <= today
  if (!data.date) {
    errs.date = 'Date is required.';
  } else {
    const sel = new Date(data.date).getTime();
    const plc = new Date(placementDate).getTime();
    const now = new Date(today()).getTime();
    if (sel < plc) errs.date = 'Date cannot be before placement date.';
    else if (sel > now) errs.date = 'Date cannot be in the future.';
  }

  const feed = parseFloat(data.feedConsumedKg);
  if (isNaN(feed) || feed < 0) errs.feedConsumedKg = 'Must be ≥ 0';

  const water = parseFloat(data.waterConsumedLiters);
  if (isNaN(water) || water < 0) errs.waterConsumedLiters = 'Must be ≥ 0';

  const mort = parseInt(data.mortality, 10);
  if (isNaN(mort) || mort < 0) errs.mortality = 'Must be ≥ 0';

  const culls = parseInt(data.culls, 10);
  if (isNaN(culls) || culls < 0) errs.culls = 'Must be ≥ 0';

  if (!isNaN(mort) && !isNaN(culls) && (mort + culls) > aliveBirds) {
    errs.mortalityCullsTotal = `Mortality (${mort}) + Culls (${culls}) = ${mort + culls} exceeds alive birds (${aliveBirds}).`;
  }

  const wt = parseFloat(data.averageWeightKg);
  if (isNaN(wt) || wt <= 0) errs.averageWeightKg = 'Must be > 0';
  else if (wt > 8) errs.averageWeightKg = 'Unrealistic weight (> 8 kg).';

  const ss = parseInt(data.sampleSize, 10);
  if (isNaN(ss) || ss < 1) errs.sampleSize = 'Must be ≥ 1';

  const temp = parseFloat(data.temperatureC);
  if (isNaN(temp)) errs.temperatureC = 'Required';
  else if (temp < 10 || temp > 50) errs.temperatureC = 'Should be 10–50 °C';

  const hum = parseFloat(data.humidityPct);
  if (isNaN(hum) || hum < 0 || hum > 100) errs.humidityPct = 'Must be 0–100%';

  const nh3 = parseFloat(data.ammoniaPpm);
  if (isNaN(nh3) || nh3 < 0) errs.ammoniaPpm = 'Must be ≥ 0';

  return errs;
}

const EMPTY_FORM: DailyRecordFormData = {
  date: today(),
  feedConsumedKg: '',
  waterConsumedLiters: '',
  mortality: '0',
  culls: '0',
  averageWeightKg: '',
  sampleSize: '100',
  temperatureC: '',
  humidityPct: '',
  ammoniaPpm: '',
  notes: '',
};

// =====================================================================
// Daily Record Form
// =====================================================================

function RecordForm({
  batch,
  editRecord,
  onSaved,
  onCancel,
  onToast,
}: {
  batch: Batch;
  editRecord: DailyFlockRecord | null;
  onSaved: () => void;
  onCancel: () => void;
  onToast: (type: ToastType, message: string) => void;
}) {
  const initForm = (): DailyRecordFormData => {
    if (editRecord) {
      return {
        date: editRecord.date.split('T')[0],
        feedConsumedKg: String(editRecord.feedConsumedKg),
        waterConsumedLiters: String(editRecord.waterConsumedLiters),
        mortality: String(editRecord.mortality),
        culls: String(editRecord.culls),
        averageWeightKg: String(editRecord.averageWeightKg),
        sampleSize: String(editRecord.sampleSize),
        temperatureC: String(editRecord.temperatureC),
        humidityPct: String(editRecord.humidityPct),
        ammoniaPpm: String(editRecord.ammoniaPpm),
        notes: editRecord.notes ?? '',
      };
    }
    return { ...EMPTY_FORM, date: today() };
  };

  const [form, setForm] = useState<DailyRecordFormData>(initForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const flockDay = form.date
    ? calcFlockDay(batch.placementDate, form.date)
    : null;

  const minDate = batch.placementDate.split('T')[0];

  function setField(field: keyof DailyRecordFormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined, mortalityCullsTotal: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateRecord(form, batch.placementDate, batch.aliveBirds);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      date: form.date,
      flockDay: flockDay!,
      feedConsumedKg: parseFloat(form.feedConsumedKg),
      waterConsumedLiters: parseFloat(form.waterConsumedLiters),
      mortality: parseInt(form.mortality, 10),
      culls: parseInt(form.culls, 10),
      averageWeightKg: parseFloat(form.averageWeightKg),
      sampleSize: parseInt(form.sampleSize, 10),
      temperatureC: parseFloat(form.temperatureC),
      humidityPct: parseFloat(form.humidityPct),
      ammoniaPpm: parseFloat(form.ammoniaPpm),
      notes: form.notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editRecord) {
        await updateDailyRecord(batch._id, editRecord._id, payload);
        onToast('success', 'Daily record updated.');
      } else {
        await createDailyRecord(batch._id, payload);
        onToast('success', 'Daily record saved.');
      }
      onSaved();
    } catch (err) {
      onToast('error', friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  function FieldGroup({
    label, unit, field, type = 'number', min, max, step, textarea
  }: {
    label: string; unit?: string; field: keyof DailyRecordFormData;
    type?: string; min?: string; max?: string; step?: string; textarea?: boolean;
  }) {
    return (
      <div className="field-group">
        <label className="field-label" htmlFor={`rf-${field}`}>
          {label}{unit && <span className="field-unit"> ({unit})</span>}
        </label>
        {textarea ? (
          <textarea
            id={`rf-${field}`}
            className={`field-input${errors[field as keyof FormErrors] ? ' error' : ''}`}
            value={form[field]}
            onChange={e => setField(field, e.target.value)}
            rows={2}
            style={{ resize: 'vertical' }}
          />
        ) : (
          <input
            id={`rf-${field}`}
            type={type}
            className={`field-input${errors[field as keyof FormErrors] ? ' error' : ''}`}
            value={form[field]}
            min={min}
            max={max}
            step={step}
            onChange={e => setField(field, e.target.value)}
          />
        )}
        {errors[field as keyof FormErrors] && (
          <span className="error-inline">{errors[field as keyof FormErrors]}</span>
        )}
      </div>
    );
  }

  return (
    <div className="record-form-card" role="region" aria-label="Daily record form">
      <form onSubmit={handleSubmit} noValidate>
        {/* Date + Flock Day */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="form-section-label">📅 Date</p>
          <div className="form-row-2" style={{ alignItems: 'flex-end' }}>
            <div className="field-group">
              <label className="field-label" htmlFor="rf-date">Record Date</label>
              <input
                id="rf-date"
                type="date"
                className={`field-input${errors.date ? ' error' : ''}`}
                value={form.date}
                min={minDate}
                max={today()}
                onChange={e => setField('date', e.target.value)}
              />
              {errors.date && <span className="error-inline">{errors.date}</span>}
            </div>
            <div>
              {flockDay !== null && flockDay >= 1 && (
                <span className="flock-day-pill">
                  <Calendar size={13} /> Flock Day {flockDay}
                </span>
              )}
              {flockDay !== null && flockDay < 1 && (
                <span className="error-inline" style={{ display: 'block', marginTop: '0.5rem' }}>
                  Date is before placement date
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Feed & Water */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="form-section-label"><Droplets size={12} style={{ display:'inline', verticalAlign:'middle' }} /> Feed &amp; Water</p>
          <div className="form-row-2">
            <FieldGroup label="Feed Consumed" unit="kg" field="feedConsumedKg" min="0" step="0.1" />
            <FieldGroup label="Water Consumed" unit="liters" field="waterConsumedLiters" min="0" step="1" />
          </div>
        </div>

        {/* Birds */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="form-section-label"><Bird size={12} style={{ display:'inline', verticalAlign:'middle' }} /> Birds</p>
          <div className="form-row-2">
            <FieldGroup label="Mortality" unit="birds died today" field="mortality" min="0" step="1" />
            <FieldGroup label="Culls" unit="birds removed today" field="culls" min="0" step="1" />
          </div>
          {errors.mortalityCullsTotal && (
            <p className="error-inline" style={{ marginTop: '0.4rem' }}>
              ⚠️ {errors.mortalityCullsTotal}
            </p>
          )}
        </div>

        {/* Weight */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="form-section-label"><Scale size={12} style={{ display:'inline', verticalAlign:'middle' }} /> Weight</p>
          <div className="form-row-2">
            <FieldGroup label="Avg Body Weight" unit="kg" field="averageWeightKg" min="0.01" step="0.01" />
            <FieldGroup label="Sample Size" unit="birds weighed" field="sampleSize" min="1" step="1" />
          </div>
        </div>

        {/* Environment */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="form-section-label"><Thermometer size={12} style={{ display:'inline', verticalAlign:'middle' }} /> Environment</p>
          <div className="form-row-3">
            <FieldGroup label="Temperature" unit="°C" field="temperatureC" min="10" max="50" step="0.1" />
            <FieldGroup label="Humidity" unit="%" field="humidityPct" min="0" max="100" step="1" />
            <FieldGroup label="Ammonia" unit="ppm" field="ammoniaPpm" min="0" step="0.1" />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '1rem' }}>
          <p className="form-section-label">📝 Notes (optional)</p>
          <FieldGroup label="Notes" field="notes" textarea />
        </div>

        <div className="form-actions">
          <button
            id="btn-save-record"
            type="submit"
            className="btn btn-success"
            disabled={saving}
            style={{ minWidth: 140 }}
          >
            {saving ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
            ) : (
              <><CheckCircle size={15} /> {editRecord ? 'Update Record' : 'Save Record'}</>
            )}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// =====================================================================
// Flock Detail View (Level 2)
// =====================================================================

function FlockDetail({
  initialBatch,
  farms,
  sheds,
  onBack,
  onToast,
}: {
  initialBatch: Batch;
  farms: Farm[];
  sheds: Shed[];
  onBack: () => void;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [batch, setBatch] = useState<Batch>(initialBatch);
  const [records, setRecords] = useState<DailyFlockRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [recordsError, setRecordsError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<DailyFlockRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DailyFlockRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [performance, setPerformance] = useState<BatchPerformance | null>(null);

  const farm = farms.find(f => f._id === batch.farmId);
  const shed = sheds.find(s => s._id === batch.shedId);

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    setRecordsError('');
    try {
      const data = await fetchDailyRecords(batch._id);
      // Sort newest first for display
      setRecords([...data].sort((a, b) => b.flockDay - a.flockDay));
    } catch (err) {
      setRecordsError('Unable to load flock records. ' + friendlyError(err));
    } finally {
      setLoadingRecords(false);
    }
  }, [batch._id]);

  const loadPerformance = useCallback(async () => {
    try {
      const data = await fetchBatchPerformance(batch._id);
      setPerformance(data);
    } catch {
      setPerformance(null);
    }
  }, [batch._id]);

  const refreshBatch = useCallback(async () => {
    // Always re-fetch from backend — never calculate aliveBirds in React
    const fresh = await refetchBatch(batch._id);
    if (fresh) setBatch(fresh);
  }, [batch._id]);

  const refreshPerformance = useCallback(async () => {
    await loadPerformance();
  }, [loadPerformance]);

  useEffect(() => {
    loadRecords();
    loadPerformance();
  }, [loadRecords, loadPerformance]);

  // Display-only summary computed from records (not authoritative aliveBirds)
  const totalMortality = records.reduce((s, r) => s + r.mortality, 0);
  const totalCulls = records.reduce((s, r) => s + r.culls, 0);
  const totalLosses = totalMortality + totalCulls;
  const latestRecord = records.length > 0 ? [...records].sort((a, b) => b.flockDay - a.flockDay)[0] : null;

  const currentFlockDay = calcFlockDay(batch.placementDate, today());

  // Determine if today already has a record
  const todayStr = today();
  const hasTodayRecord = records.some(r => r.date.split('T')[0] === todayStr);

  async function handleSaved() {
    setShowForm(false);
    setEditRecord(null);
    await Promise.all([refreshBatch(), loadRecords(), refreshPerformance()]);
  }

  async function handleDelete(record: DailyFlockRecord) {
    setPendingDelete(null);
    setDeletingId(record._id);
    try {
      await deleteDailyRecord(batch._id, record._id);
      onToast('success', `Day ${record.flockDay} record deleted.`);
      await Promise.all([refreshBatch(), loadRecords(), refreshPerformance()]);
    } catch (err) {
      onToast('error', friendlyError(err));
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(r: DailyFlockRecord) {
    setEditRecord(r);
    setShowForm(true);
    // Scroll to form
    setTimeout(() => {
      document.getElementById('record-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function openAdd() {
    setEditRecord(null);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById('record-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <button className="flock-detail-back" onClick={onBack} id="btn-back-to-list">
        <ChevronLeft size={16} /> All Batches
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 className="flock-detail-title">{batch.batchName}</h2>
            <span className={`badge badge-${batch.status === 'Active' ? 'success' : 'info'}`}>{batch.status}</span>
          </div>
          <p className="flock-detail-subtitle">
            {batch.breed}
            {farm ? ` · ${farm.farmName}` : ''}
            {shed ? ` › ${shed.shedName}` : ''}
            {' · '}Placed {fmtDate(batch.placementDate)}
            {' · '}<span style={{ color: 'var(--accent-cyan)' }}>Day {currentFlockDay}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            id="btn-add-record"
            className="btn btn-success"
            onClick={openAdd}
            disabled={showForm}
            title={hasTodayRecord ? "Today's record already exists — you can still add a historical entry" : "Add today's flock record"}
          >
            <Plus size={15} />
            {hasTodayRecord ? 'Add Historical Record' : "Add Today's Record"}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metric-row">
        <div className="metric-card">
          <div className="metric-card-label">🐣 Birds Placed</div>
          <div className="metric-card-value">{batch.initialBirds.toLocaleString()}</div>
          <div className="metric-card-sub">Initial flock size</div>
        </div>
        <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-success)' }}>
          <div className="metric-card-label">🟢 Alive Birds</div>
          <div className="metric-card-value" style={{ color: 'var(--accent-success)' }}>
            {batch.aliveBirds.toLocaleString()}
          </div>
          <div className="metric-card-sub">{pct(batch.aliveBirds, batch.initialBirds)} surviving</div>
        </div>
        <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-warning)' }}>
          <div className="metric-card-label">📉 Total Losses</div>
          <div className="metric-card-value" style={{ color: 'var(--accent-warning)' }}>
            {totalLosses.toLocaleString()}
          </div>
          <div className="metric-card-sub">
            {totalMortality} died · {totalCulls} culled
            &nbsp;({pct(totalLosses, batch.initialBirds)})
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card-label">⚖️ Avg Weight</div>
          <div className="metric-card-value">
            {latestRecord ? `${latestRecord.averageWeightKg.toFixed(2)} kg` : '—'}
          </div>
          <div className="metric-card-sub">
            Target: {batch.targetSaleWeightKg} kg · Target FCR: {batch.targetFcr}
          </div>
        </div>
      </div>

      {/* Targets summary */}
      <div className="card" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Sale Weight</span>
          <span style={{ fontWeight: 700, marginLeft: '0.5rem' }}>{batch.targetSaleWeightKg} kg</span>
        </div>
        <div>
          <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target FCR</span>
          <span style={{ fontWeight: 700, marginLeft: '0.5rem' }}>{batch.targetFcr}</span>
          <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '0.35rem' }}>(configured target)</span>
        </div>
        <div>
          <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Sale Age</span>
          <span style={{ fontWeight: 700, marginLeft: '0.5rem' }}>{batch.targetSaleAgeDays} days</span>
        </div>
        <div>
          <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actual FCR</span>
          {performance && performance.operationalFcr !== null ? (
            <span style={{ fontWeight: 700, marginLeft: '0.5rem' }}>{performance.operationalFcr.toFixed(2)}</span>
          ) : (
            <span className="text-muted" style={{ marginLeft: '0.5rem', fontStyle: 'italic', fontSize: '0.85rem' }}>Not yet calculable</span>
          )}
          {performance && performance.operationalFcr === null && (
            <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '0.35rem' }}>Starting flock biomass is not recorded.</span>
          )}
        </div>
        {latestRecord && (
          <div>
            <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last Record</span>
            <span style={{ fontWeight: 700, marginLeft: '0.5rem' }}>
              Day {latestRecord.flockDay} ({fmtDate(latestRecord.date)})
            </span>
          </div>
        )}
      </div>

      {performance && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div className="section-header" style={{ marginBottom: '0.75rem' }}>
            <span className="section-title">Performance</span>
            <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>{performance.performanceStatus.replace('_', ' ')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Age</div>
              <div style={{ fontWeight: 700 }}>{performance.ageDays} days</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Birds Alive</div>
              <div style={{ fontWeight: 700 }}>{performance.birdsAlive.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Loss Rate</div>
              <div style={{ fontWeight: 700 }}>{performance.lossRatePct !== null ? `${performance.lossRatePct.toFixed(2)}%` : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Latest Avg Wt</div>
              <div style={{ fontWeight: 700 }}>{performance.latestAverageWeightKg !== null ? `${performance.latestAverageWeightKg.toFixed(2)} kg` : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Live Biomass</div>
              <div style={{ fontWeight: 700 }}>{performance.liveBiomassKg !== null ? `${performance.liveBiomassKg.toFixed(2)} kg` : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cumulative Feed</div>
              <div style={{ fontWeight: 700 }}>{performance.cumulativeFeedKg !== null ? `${performance.cumulativeFeedKg.toFixed(2)} kg` : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Feed / Bird</div>
              <div style={{ fontWeight: 700 }}>{performance.feedPerPlacedBirdKg !== null ? `${performance.feedPerPlacedBirdKg.toFixed(2)} kg` : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent ADG</div>
              <div style={{ fontWeight: 700 }}>{performance.recentAdgKgPerDay !== null ? `${performance.recentAdgKgPerDay.toFixed(3)} kg/day` : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target FCR</div>
              <div style={{ fontWeight: 700 }}>{performance.targetFcr !== null ? performance.targetFcr.toFixed(2) : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Weight</div>
              <div style={{ fontWeight: 700 }}>{performance.targetSaleWeightKg !== null ? `${performance.targetSaleWeightKg.toFixed(2)} kg` : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Projected Target Age</div>
              <div style={{ fontWeight: 700 }}>{performance.projectedTargetAgeDays !== null ? `${performance.projectedTargetAgeDays.toFixed(1)} days` : '—'}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</div>
              <div style={{ fontWeight: 700 }}>{performance.performanceStatus.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Record Form */}
      <div id="record-form-anchor" />
      {showForm && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p className="section-title" style={{ marginBottom: '0.5rem' }}>
            {editRecord ? `✏️ Editing Day ${editRecord.flockDay} Record` : '➕ New Daily Record'}
          </p>
          <RecordForm
            batch={batch}
            editRecord={editRecord}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditRecord(null); }}
            onToast={onToast}
          />
        </div>
      )}

      {/* Daily Record History */}
      <div className="section-header">
        <span className="section-title">
          <ClipboardList size={15} /> Daily Record History
        </span>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
          {records.length} record{records.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loadingRecords && (
        <div className="loading-state">
          <span className="spinner" /> Loading flock records…
        </div>
      )}

      {!loadingRecords && recordsError && (
        <div className="card danger-card">
          <p style={{ color: 'var(--accent-danger)' }}>{recordsError}</p>
          <button className="btn btn-outline" style={{ marginTop: '0.75rem' }} onClick={loadRecords}>
            Retry
          </button>
        </div>
      )}

      {!loadingRecords && !recordsError && records.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            <p className="empty-state-title">No daily records yet.</p>
            <p className="empty-state-sub">Start by adding today's flock observations.</p>
            <button className="btn btn-success" onClick={openAdd} style={{ marginTop: '0.5rem' }}>
              <Plus size={14} /> Add Today's Record
            </button>
          </div>
        </div>
      )}

      {!loadingRecords && !recordsError && records.length > 0 && (
        <div className="records-table-wrap">
          <table className="records-table" aria-label="Daily flock records">
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Feed (kg)</th>
                <th>Water (L)</th>
                <th>Mort.</th>
                <th>Culls</th>
                <th>Avg Wt (kg)</th>
                <th>Temp °C</th>
                <th>Hum %</th>
                <th>NH₃ ppm</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const isAnomaly = r.temperatureC > 33 || r.mortality > 5;
                return (
                  <tr key={r._id} className={isAnomaly ? 'anomaly-row' : ''} title={r.notes || ''}>
                    <td className="col-day">Day {r.flockDay}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.feedConsumedKg}</td>
                    <td>{r.waterConsumedLiters}</td>
                    <td className="col-mort">{r.mortality}</td>
                    <td className="col-culls">{r.culls}</td>
                    <td>{r.averageWeightKg.toFixed(2)}</td>
                    <td style={{ color: r.temperatureC > 33 ? 'var(--accent-warning)' : 'inherit' }}>
                      {r.temperatureC}
                    </td>
                    <td>{r.humidityPct}</td>
                    <td>{r.ammoniaPpm}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          id={`btn-edit-day-${r.flockDay}`}
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => openEdit(r)}
                          title={`Edit Day ${r.flockDay}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          id={`btn-delete-day-${r.flockDay}`}
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                          onClick={() => setPendingDelete(r)}
                          disabled={deletingId === r._id}
                          title={`Delete Day ${r.flockDay}`}
                        >
                          {deletingId === r._id ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm */}
      {pendingDelete && (
        <ConfirmDialog
          message={`Delete the Day ${pendingDelete.flockDay} record (${fmtDate(pendingDelete.date)})? This will update the alive bird count.`}
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

// =====================================================================
// New Batch Form
// =====================================================================

function NewBatchForm({
  farms,
  allSheds,
  onCreated,
  onCancel,
  onToast,
}: {
  farms: Farm[];
  allSheds: Shed[];
  onCreated: () => void;
  onCancel: () => void;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [form, setForm] = useState<NewBatchFormData>({
    batchName: '',
    farmId: '',
    shedId: '',
    breed: 'Cobb 500',
    placementDate: today(),
    initialBirds: '',
    targetSaleWeightKg: '2.0',
    targetFcr: '1.60',
    targetSaleAgeDays: '35',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NewBatchFormData, string>>>({});

  // Filter sheds by selected farm
  const filteredSheds = form.farmId ? allSheds.filter(s => s.farmId === form.farmId) : allSheds;

  function setField(f: keyof NewBatchFormData, v: string) {
    setForm(prev => {
      const next = { ...prev, [f]: v };
      // Reset shed when farm changes
      if (f === 'farmId') next.shedId = '';
      return next;
    });
    setErrors(e => ({ ...e, [f]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof NewBatchFormData, string>> = {};
    if (!form.batchName.trim()) errs.batchName = 'Required';
    const birds = parseInt(form.initialBirds, 10);
    if (isNaN(birds) || birds < 1) errs.initialBirds = 'Must be ≥ 1';
    const wt = parseFloat(form.targetSaleWeightKg);
    if (isNaN(wt) || wt <= 0) errs.targetSaleWeightKg = 'Must be > 0';
    const fcr = parseFloat(form.targetFcr);
    if (isNaN(fcr) || fcr <= 0) errs.targetFcr = 'Must be > 0';
    const days = parseInt(form.targetSaleAgeDays, 10);
    if (isNaN(days) || days < 1) errs.targetSaleAgeDays = 'Must be ≥ 1';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await createBatch({
        batchName: form.batchName.trim(),
        initialBirds: parseInt(form.initialBirds, 10),
        farmId: form.farmId || undefined,
        shedId: form.shedId || undefined,
        breed: form.breed.trim() || 'Cobb 500',
        placementDate: form.placementDate,
        targetSaleWeightKg: parseFloat(form.targetSaleWeightKg),
        targetFcr: parseFloat(form.targetFcr),
        targetSaleAgeDays: parseInt(form.targetSaleAgeDays, 10),
      });
      onToast('success', `Batch "${form.batchName}" created.`);
      onCreated();
    } catch (err) {
      onToast('error', friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  function FG({ label, field, type = 'text', children }: {
    label: string; field: keyof NewBatchFormData; type?: string; children?: React.ReactNode;
  }) {
    return (
      <div className="field-group">
        <label className="field-label" htmlFor={`nb-${field}`}>{label}</label>
        {children ?? (
          <input
            id={`nb-${field}`}
            type={type}
            className={`field-input${errors[field] ? ' error' : ''}`}
            value={form[field]}
            onChange={e => setField(field, e.target.value)}
          />
        )}
        {errors[field] && <span className="error-inline">{errors[field]}</span>}
      </div>
    );
  }

  return (
    <div className="new-batch-form">
      <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--text-main)' }}>
        🐥 Create New Batch
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row-2" style={{ marginBottom: '0.875rem' }}>
          <FG label="Batch Name" field="batchName" />
          <FG label="Breed" field="breed" />
        </div>

        <div className="form-row-2" style={{ marginBottom: '0.875rem' }}>
          <FG label="Farm (optional)" field="farmId">
            <select
              id="nb-farmId"
              className="field-input"
              value={form.farmId}
              onChange={e => setField('farmId', e.target.value)}
            >
              <option value="">— No farm —</option>
              {farms.map(f => <option key={f._id} value={f._id}>{f.farmName}</option>)}
            </select>
          </FG>
          <FG label="Shed (optional)" field="shedId">
            <select
              id="nb-shedId"
              className="field-input"
              value={form.shedId}
              onChange={e => setField('shedId', e.target.value)}
              disabled={!form.farmId}
            >
              <option value="">— No shed —</option>
              {filteredSheds.map(s => <option key={s._id} value={s._id}>{s.shedName}</option>)}
            </select>
          </FG>
        </div>

        <div className="form-row-2" style={{ marginBottom: '0.875rem' }}>
          <FG label="Placement Date" field="placementDate" type="date" />
          <FG label="Initial Birds" field="initialBirds" type="number" />
        </div>

        <div className="form-row-3" style={{ marginBottom: '1.25rem' }}>
          <FG label="Target Weight (kg)" field="targetSaleWeightKg" type="number" />
          <FG label="Target FCR" field="targetFcr" type="number" />
          <FG label="Target Sale Age (days)" field="targetSaleAgeDays" type="number" />
        </div>

        <div className="form-actions">
          <button id="btn-create-batch" type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</> : <><Plus size={15} /> Create Batch</>}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// =====================================================================
// Batch List (Level 1)
// =====================================================================

function BatchList({
  batches,
  farms,
  sheds,
  loading,
  error,
  onSelect,
  onReload,
  onToast,
}: {
  batches: Batch[];
  farms: Farm[];
  sheds: Shed[];
  loading: boolean;
  error: string;
  onSelect: (b: Batch) => void;
  onReload: () => void;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [showNewBatch, setShowNewBatch] = useState(false);

  function farmName(farmId?: string) {
    if (!farmId) return null;
    return farms.find(f => f._id === farmId)?.farmName ?? null;
  }
  function shedName(shedId?: string) {
    if (!shedId) return null;
    return sheds.find(s => s._id === shedId)?.shedName ?? null;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="screen-title" style={{ marginBottom: 0 }}>
          <Leaf size={22} style={{ display:'inline', verticalAlign:'middle', color:'var(--accent-success)', marginRight: '0.4rem' }} />
          Flock Management
        </h2>
        <button
          id="btn-new-batch"
          className="btn btn-primary"
          onClick={() => setShowNewBatch(v => !v)}
        >
          <Plus size={15} /> New Batch
        </button>
      </div>

      {showNewBatch && (
        <NewBatchForm
          farms={farms}
          allSheds={sheds}
          onCreated={() => { setShowNewBatch(false); onReload(); }}
          onCancel={() => setShowNewBatch(false)}
          onToast={onToast}
        />
      )}

      {loading && (
        <div className="loading-state">
          <span className="spinner" /> Loading batches…
        </div>
      )}

      {!loading && error && (
        <div className="card danger-card">
          <p style={{ color: 'var(--accent-danger)' }}>{error}</p>
          <button className="btn btn-outline" style={{ marginTop: '0.75rem' }} onClick={onReload}>Retry</button>
        </div>
      )}

      {!loading && !error && batches.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">🐥</span>
            <p className="empty-state-title">No batches yet.</p>
            <p className="empty-state-sub">Create your first batch to start tracking.</p>
          </div>
        </div>
      )}

      {!loading && !error && batches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {batches.map(b => {
            const farm = farmName(b.farmId);
            const shed = shedName(b.shedId);
            const age = calcFlockDay(b.placementDate, today());
            const lossCount = b.initialBirds - b.aliveBirds;
            const lossPct = b.initialBirds > 0 ? ((lossCount / b.initialBirds) * 100).toFixed(1) : '0.0';

            return (
              <div
                key={b._id}
                id={`batch-card-${b.batchName.replace(/\s+/g, '-')}`}
                className={`batch-card status-${b.status.toLowerCase()}`}
                onClick={() => onSelect(b)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onSelect(b)}
                aria-label={`Open flock detail for ${b.batchName}`}
              >
                <div className="batch-card-header">
                  <div>
                    <div className="batch-card-name">{b.batchName}</div>
                    <div className="batch-card-meta">
                      {b.breed}
                      {farm ? ` · ${farm}` : ''}
                      {shed ? ` › ${shed}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    <span className={`badge badge-${b.status === 'Active' ? 'success' : 'info'}`}>{b.status}</span>
                    <span className="flock-day-pill">
                      <Calendar size={11} /> Day {age}
                    </span>
                  </div>
                </div>

                <div className="batch-card-grid">
                  <div>
                    <div className="batch-card-stat-label">Birds Placed</div>
                    <div className="batch-card-stat-value">{b.initialBirds.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="batch-card-stat-label">Birds Alive</div>
                    <div className="batch-card-stat-value alive">{b.aliveBirds.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="batch-card-stat-label">Total Losses</div>
                    <div className="batch-card-stat-value loss">{lossCount.toLocaleString()} ({lossPct}%)</div>
                  </div>
                  <div>
                    <div className="batch-card-stat-label">Avg Weight</div>
                    <div className="batch-card-stat-value">{b.avgWeight.toFixed(2)} kg</div>
                  </div>
                  <div>
                    <div className="batch-card-stat-label">Target Weight</div>
                    <div className="batch-card-stat-value">{b.targetSaleWeightKg} kg</div>
                  </div>
                  <div>
                    <div className="batch-card-stat-label">Placement Date</div>
                    <div className="batch-card-stat-value" style={{ fontSize: '0.82rem' }}>{fmtDate(b.placementDate)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Root: BatchScreen
// =====================================================================

export default function BatchScreen() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [sheds, setSheds] = useState<Shed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(type: ToastType, message: string) {
    const id = ++toastSeq;
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }

  function dismissToast(id: number) {
    setToasts(t => t.filter(x => x.id !== id));
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [batchData, farmData, shedData] = await Promise.all([
        fetchBatches(),
        fetchFarms(),
        fetchSheds(),
      ]);
      setBatches(batchData);
      setFarms(farmData);
      setSheds(shedData);
    } catch (err) {
      setError('Unable to load batches. ' + friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // When navigating back from detail, also refresh list in case aliveBirds changed
  function handleBack() {
    setSelectedBatch(null);
    loadAll();
  }

  if (selectedBatch) {
    return (
      <>
        <FlockDetail
          initialBatch={selectedBatch}
          farms={farms}
          sheds={sheds}
          onBack={handleBack}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <>
      <BatchList
        batches={batches}
        farms={farms}
        sheds={sheds}
        loading={loading}
        error={error}
        onSelect={setSelectedBatch}
        onReload={loadAll}
        onToast={addToast}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
