import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileImage,
  Info,
  ShieldAlert,
  Upload
} from 'lucide-react';

import { fetchBatches, friendlyError } from '../api/flockApi';
import {
  analyzeHealthInspection,
  createHealthInspection,
  fetchHealthInspections
} from '../api/healthApi';
import type { Batch, HealthInspection } from '../types/api';

const todayIso = () => new Date().toISOString().split('T')[0];

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  needs_review: 'Needs review',
  error: 'Error'
};

export default function HealthScreen() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [inspections, setInspections] = useState<HealthInspection[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    inspectionDate: todayIso(),
    flockDay: '1',
    imageReference: '',
    notes: ''
  });

  useEffect(() => {
    async function loadBatches() {
      setLoading(true);
      try {
        const data = await fetchBatches();
        setBatches(data);
        if (data.length > 0 && !selectedBatchId) {
          setSelectedBatchId(data[0]._id);
        }
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
      }
    }

    void loadBatches();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setInspections([]);
      setSelectedInspectionId('');
      return;
    }

    async function loadInspections() {
      try {
        const data = await fetchHealthInspections(selectedBatchId);
        setInspections(data);
        setSelectedInspectionId(current => {
          if (current && data.some(item => item._id === current)) {
            return current;
          }
          return data[0]?._id ?? '';
        });
      } catch (err) {
        setError(friendlyError(err));
      }
    }

    void loadInspections();
  }, [selectedBatchId]);

  const selectedInspection = inspections.find(item => item._id === selectedInspectionId) ?? null;

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, PNG, and WEBP images are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be 10MB or less.');
      return;
    }

    setError('');
    setForm(current => ({ ...current, imageReference: file.name }));
  };

  const handleCreateInspection = async () => {
    if (!selectedBatchId) {
      setError('Select a batch before creating an inspection.');
      return;
    }

    if (!form.imageReference) {
      setError('Select an image reference before saving.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await createHealthInspection(selectedBatchId, {
        inspectionDate: form.inspectionDate,
        flockDay: Number(form.flockDay),
        imageReference: form.imageReference,
        notes: form.notes || undefined
      });

      setInspections(current => [created, ...current]);
      setSelectedInspectionId(created._id);
      setForm({
        inspectionDate: todayIso(),
        flockDay: String(Number(form.flockDay) + 1),
        imageReference: '',
        notes: ''
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async (inspectionId: string) => {
    setAnalyzing(true);
    setError('');

    try {
      const updated = await analyzeHealthInspection(inspectionId);
      setInspections(current => current.map(item => item._id === inspectionId ? updated : item));
      setSelectedInspectionId(inspectionId);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedBatch = batches.find(batch => batch._id === selectedBatchId) ?? null;
  const analysisResult = selectedInspection?.result ?? null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="screen-title" style={{ marginBottom: '0.25rem' }}>Poultry Health Inspection</h2>
          <p className="text-muted" style={{ margin: 0 }}>AI inspection placeholder — future YOLO integration will plug into this contract.</p>
        </div>
        <div className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {loading ? 'Loading...' : (selectedBatch ? selectedBatch.batchName : 'No batch selected')}
        </div>
      </div>

      <div className="grid-2">
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={16} />
            <h3 className="card-title" style={{ margin: 0 }}>New Health Inspection</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label className="field-label">Batch</label>
              <select
                className="field-input"
                value={selectedBatchId}
                onChange={event => setSelectedBatchId(event.target.value)}
              >
                <option value="">Select batch</option>
                {batches.map(batch => (
                  <option key={batch._id} value={batch._id}>{batch.batchName}</option>
                ))}
              </select>
            </div>

            <div className="form-row-2">
              <div>
                <label className="field-label">Inspection date</label>
                <input
                  className="field-input"
                  type="date"
                  value={form.inspectionDate}
                  onChange={event => setForm(current => ({ ...current, inspectionDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">Flock day</label>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  value={form.flockDay}
                  onChange={event => setForm(current => ({ ...current, flockDay: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Image reference</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="field-input"
                  type="text"
                  value={form.imageReference}
                  onChange={event => setForm(current => ({ ...current, imageReference: event.target.value }))}
                  placeholder="uploads/inspection-001.jpg"
                />
                <label className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                  <Upload size={14} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
                  Select image
                </label>
              </div>
            </div>

            <div>
              <label className="field-label">Notes</label>
              <textarea
                className="field-input"
                rows={4}
                value={form.notes}
                onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
                placeholder="Optional notes for the inspection record"
              />
            </div>

            {error && (
              <div className="danger-card" style={{ padding: '0.75rem 0.9rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <button className="btn btn-success" onClick={handleCreateInspection} disabled={saving || !selectedBatchId}>
              {saving ? 'Saving...' : 'Save inspection'}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ClipboardList size={16} />
            <h3 className="card-title" style={{ margin: 0 }}>Inspection history</h3>
          </div>

          {inspections.length === 0 ? (
            <div className="empty-state">
              <FileImage size={26} />
              <p>No inspections yet for this batch.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {inspections.map(item => (
                <button
                  key={item._id}
                  onClick={() => setSelectedInspectionId(item._id)}
                  className={`card ${selectedInspectionId === item._id ? 'selected' : ''}`}
                  style={{
                    padding: '0.8rem 0.9rem',
                    background: selectedInspectionId === item._id ? 'rgba(59,130,246,0.08)' : 'transparent',
                    border: selectedInspectionId === item._id ? '1px solid rgba(59,130,246,0.5)' : '1px solid var(--border-card)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                    <strong>Day {item.flockDay}</strong>
                    <span className="badge badge-info">{statusLabel[item.inspectionStatus] ?? item.inspectionStatus}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                    {new Date(item.inspectionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{item.imageReference}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedInspection && (
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera size={16} />
              <h3 className="card-title" style={{ margin: 0 }}>AI Analysis Result</h3>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleAnalyze(selectedInspection._id)}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Run analysis'}
            </button>
          </div>

          {!analysisResult || selectedInspection.aiModelStatus === 'NOT_RUN' ? (
            <div className="warning-card" style={{ padding: '0.9rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <ShieldAlert size={16} />
                <strong>AI model is not yet available</strong>
              </div>
              <div className="text-muted">No fake disease predictions are shown. The model can be plugged in later without changing this UI contract.</div>
            </div>
          ) : (
            <>
              {analysisResult.status === 'LOW_CONFIDENCE' && (
                <div className="warning-card" style={{ padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <AlertTriangle size={16} />
                    <strong>Low confidence</strong>
                  </div>
                  <div>{analysisResult.message ?? 'Image confidence is low. Please capture a clearer image.'}</div>
                </div>
              )}

              {analysisResult.status === 'MODEL_NOT_TRAINED' && (
                <div className="warning-card" style={{ padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Info size={16} />
                    <strong>AI model is not yet available</strong>
                  </div>
                  <div>{analysisResult.message ?? 'AI model is not yet available'}</div>
                </div>
              )}

              {analysisResult.status === 'SUCCESS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span>Model status: {analysisResult.status}</span>
                  </div>
                  <div className="text-muted">
                    Confidence: {analysisResult.confidence !== null ? `${analysisResult.confidence.toFixed(2)}%` : 'Not available'}
                  </div>
                  {analysisResult.detections.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {analysisResult.detections.map((detection, index) => (
                        <div key={`${detection.className}-${index}`} className="card" style={{ padding: '0.7rem 0.8rem' }}>
                          <strong>{detection.className}</strong>
                          <div className="text-muted">Confidence: {detection.confidence.toFixed(2)}</div>
                          <div className="text-muted">Box: {Math.round(detection.bbox.x)}, {Math.round(detection.bbox.y)}, {Math.round(detection.bbox.width)} × {Math.round(detection.bbox.height)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted">No detections reported yet.</div>
                  )}
                </div>
              )}

              {analysisResult.status === 'ERROR' && (
                <div className="danger-card" style={{ padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <AlertTriangle size={16} />
                    <strong>Analysis error</strong>
                  </div>
                  <div>{analysisResult.message ?? 'The model returned an error.'}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
