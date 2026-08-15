import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  ShieldAlert,
  TrendingUp,
  Weight
} from 'lucide-react';
import type { TabId } from '../App';
import { fetchBatches, fetchBatchPerformance, fetchDailyRecords, friendlyError } from '../api/flockApi';
import { fetchBatchHealthSummary } from '../api/healthApi';
import type { Batch, BatchHealthSummary, BatchPerformance, DailyFlockRecord } from '../types/api';

function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function buildLinePath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return '';
  const maxX = Math.max(...points.map(p => p.x), 1);
  const maxY = Math.max(...points.map(p => p.y), 1);
  const minY = Math.min(...points.map(p => p.y), 0);
  return points
    .map((point, index) => {
      const scaledX = maxX === 0 ? 0 : (point.x / maxX) * 100;
      const scaledY = maxY === minY ? 50 : 100 - ((point.y - minY) / (maxY - minY || 1)) * 100;
      return `${index === 0 ? 'M' : 'L'} ${scaledX} ${scaledY}`;
    })
    .join(' ');
}

function getFlockAgeDays(batch: Batch | null): number | null {
  if (!batch?.placementDate) return null;
  const date = new Date(batch.placementDate);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

export default function HomeScreen({
  activeFarm,
  onNavigate,
}: {
  activeFarm: string;
  onNavigate?: (tab: TabId) => void;
}) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [performance, setPerformance] = useState<BatchPerformance | null>(null);
  const [healthSummary, setHealthSummary] = useState<BatchHealthSummary | null>(null);
  const [records, setRecords] = useState<DailyFlockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchBatches();
        if (cancelled) return;
        setBatches(data);
        if (data.length > 0) {
          setSelectedBatchId(current => current && data.some(batch => batch._id === current) ? current : data[0]._id);
        } else {
          setSelectedBatchId('');
        }
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [activeFarm]);

  useEffect(() => {
    if (!selectedBatchId) {
      setPerformance(null);
      setHealthSummary(null);
      setRecords([]);
      return;
    }

    let cancelled = false;
    async function loadBatchData() {
      try {
        const [performanceData, summaryData, dailyRecords] = await Promise.all([
          fetchBatchPerformance(selectedBatchId),
          fetchBatchHealthSummary(selectedBatchId),
          fetchDailyRecords(selectedBatchId),
        ]);
        if (cancelled) return;
        setPerformance(performanceData);
        setHealthSummary(summaryData);
        setRecords(dailyRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      }
    }

    void loadBatchData();
    return () => { cancelled = true; };
  }, [selectedBatchId]);

  const selectedBatch = useMemo(
    () => batches.find(batch => batch._id === selectedBatchId) ?? batches[0] ?? null,
    [batches, selectedBatchId]
  );

  const flockAgeDays = selectedBatch ? getFlockAgeDays(selectedBatch) : null;

  const decisionItems = useMemo(() => {
    const items: Array<{ severity: 'critical' | 'warning' | 'info'; title: string; explanation: string; action: string; source: string }> = [];
    const lossRate = performance?.lossRatePct ?? null;
    const recentAdg = performance?.recentAdgKgPerDay ?? null;
    const weightGap = performance?.weightGapKg ?? null;
    const targetDelay = performance?.estimatedDaysToTarget ?? null;

    if (!performance && !healthSummary && records.length === 0) {
      return [{
        severity: 'info',
        title: 'Insufficient data for a reliable assessment.',
        explanation: 'No daily flock data or health records are available for this batch yet.',
        action: 'Record today’s flock data',
        source: 'Batch data',
      }];
    }

    if (performance?.performanceStatus === 'CRITICAL') {
      items.push({
        severity: 'critical',
        title: 'Critical performance deviation',
        explanation: 'The current performance indicators show a critical flock trend that needs immediate attention.',
        action: 'Review flock performance and intervene immediately',
        source: 'Performance engine',
      });
    } else if (performance?.performanceStatus === 'WATCH') {
      items.push({
        severity: 'warning',
        title: 'Watch performance status',
        explanation: 'The flock is behind plan or trending below expected performance.',
        action: 'Review feed, weight, and mortality trends',
        source: 'Performance engine',
      });
    }

    if (typeof lossRate === 'number' && lossRate > 5) {
      items.push({
        severity: 'warning',
        title: 'High mortality or cull loss',
        explanation: `Loss rate is ${formatPercent(lossRate)} in the current dataset.`,
        action: 'Check mortality/cull trend and ventilation or health checks',
        source: 'Daily flock records',
      });
    }

    if (typeof recentAdg === 'number' && recentAdg < 0) {
      items.push({
        severity: 'warning',
        title: 'Weak recent gain',
        explanation: `Average daily gain is ${recentAdg.toFixed(3)} kg/day, below the expected trend.`,
        action: 'Review feed intake and flock health',
        source: 'Weight trend',
      });
    }

    if (typeof weightGap === 'number' && weightGap > 0) {
      items.push({
        severity: 'info',
        title: 'Target weight gap remains',
        explanation: `Current weight remains ${formatNumber(weightGap, 2)} kg below the target.`,
        action: 'Continue monitoring weight gain and feed efficiency',
        source: 'Weight target',
      });
    }

    if (typeof targetDelay === 'number' && targetDelay > 7) {
      items.push({
        severity: 'warning',
        title: 'Sale-age delay is likely',
        explanation: `The current projection suggests a delay of ${formatNumber(targetDelay, 0)} days to the target sale age.`,
        action: 'Review feed and growth performance against the target plan',
        source: 'Projected target age',
      });
    }

    if (healthSummary?.lowConfidenceInspections && healthSummary.lowConfidenceInspections > 0) {
      items.push({
        severity: 'warning',
        title: 'Low-confidence inspection',
        explanation: 'One or more inspection images require a clearer image before the system can interpret them reliably.',
        action: 'Capture a clearer image and rerun the health inspection',
        source: 'Health inspection quality',
      });
    }

    if (healthSummary?.abnormalInspectionCount && healthSummary.abnormalInspectionCount > 0 && healthSummary.recentHealthTrend === 'worsening') {
      items.push({
        severity: 'warning',
        title: 'Recurring abnormal health signal',
        explanation: 'Recent inspection results are trending worse, so the flock should be monitored closely.',
        action: 'Review health history and inspect additional birds',
        source: 'Health summary',
      });
    }

    if (healthSummary?.latestHealthStatus === 'MODEL_NOT_TRAINED') {
      items.push({
        severity: 'info',
        title: 'AI model is not yet available',
        explanation: 'No visual diagnosis is being generated because the model is not trained or connected yet.',
        action: 'Continue routine flock monitoring and capture clearer images when the model is ready',
        source: 'Health model status',
      });
    }

    if (!items.length) {
      items.push({
        severity: 'info',
        title: 'Flock currently appears on track.',
        explanation: 'The available performance and health indicators do not show an immediate issue.',
        action: 'Continue routine monitoring',
        source: 'Batch overview',
      });
    }

    return items.slice(0, 3);
  }, [performance, healthSummary, records]);

  const todayStatus = useMemo(() => {
    if (!performance && !healthSummary && records.length === 0) return 'INSUFFICIENT DATA';
    if (performance?.performanceStatus === 'CRITICAL') return 'CRITICAL';
    if (performance?.performanceStatus === 'WATCH') return 'WATCH';
    if (healthSummary?.latestHealthStatus === 'LOW_CONFIDENCE') return 'WATCH';
    if (healthSummary?.latestHealthStatus === 'MODEL_NOT_TRAINED') return 'ON TRACK';
    if (performance?.performanceStatus === 'ON_TRACK') return 'ON TRACK';
    return 'INSUFFICIENT DATA';
  }, [performance, healthSummary, records]);

  const weightTrend = useMemo(() => {
    if (!records.length) return [] as Array<{ label: string; value: number }>;
    return records.slice(-7).map(record => ({
      label: new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      value: Number(record.averageWeightKg),
    }));
  }, [records]);

  const mortalityTrend = useMemo(() => {
    if (!records.length) return [] as Array<{ label: string; value: number }>;
    return records.slice(-7).map(record => ({
      label: new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      value: Number(record.mortality + record.culls),
    }));
  }, [records]);

  const weightChartPath = useMemo(() => {
    if (!weightTrend.length) return '';
    return buildLinePath(weightTrend.map((item, index) => ({ x: index, y: item.value })));
  }, [weightTrend]);

  const mortalityChartPath = useMemo(() => {
    if (!mortalityTrend.length) return '';
    return buildLinePath(mortalityTrend.map((item, index) => ({ x: index, y: item.value })));
  }, [mortalityTrend]);

  if (loading && !selectedBatch) {
    return <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading flock dashboard…</div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="screen-title" style={{ marginBottom: '0.2rem' }}>Flock Decision Dashboard</h2>
          <p className="text-muted" style={{ margin: 0 }}>{activeFarm}</p>
        </div>
        {selectedBatch && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => onNavigate?.('batch')}>View flock records</button>
            <button className="btn btn-primary" onClick={() => onNavigate?.('health')}>New health inspection</button>
          </div>
        )}
      </div>

      {error && (
        <div className="danger-card" style={{ padding: '0.8rem 1rem' }}>{error}</div>
      )}

      {!selectedBatch ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No batches are available for this farm.
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Batch overview</div>
                <h3 style={{ margin: '0.2rem 0 0' }}>{selectedBatch.batchName}</h3>
              </div>
              <div className={`badge ${todayStatus === 'CRITICAL' ? 'badge-critical' : todayStatus === 'WATCH' ? 'badge-warning' : 'badge-success'}`}>
                {todayStatus}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginTop: '1rem' }}>
              <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Flock age</div>
                <div style={{ fontWeight: 700 }}>{flockAgeDays !== null ? `${flockAgeDays} days` : 'N/A'}</div>
              </div>
              <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Birds placed</div>
                <div style={{ fontWeight: 700 }}>{formatNumber(selectedBatch.initialBirds, 0)}</div>
              </div>
              <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Birds alive</div>
                <div style={{ fontWeight: 700 }}>{formatNumber(performance?.birdsAlive ?? selectedBatch.aliveBirds, 0)}</div>
              </div>
              <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Total mortality</div>
                <div style={{ fontWeight: 700 }}>{formatNumber(performance?.totalMortality ?? null, 0)}</div>
              </div>
              <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Loss rate</div>
                <div style={{ fontWeight: 700 }}>{performance?.lossRatePct !== null && performance?.lossRatePct !== undefined ? `${performance.lossRatePct.toFixed(1)}%` : 'N/A'}</div>
              </div>
              <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Avg. weight</div>
                <div style={{ fontWeight: 700 }}>{performance?.latestAverageWeightKg !== null && performance?.latestAverageWeightKg !== undefined ? `${performance.latestAverageWeightKg.toFixed(2)} kg` : 'Average weight not available.'}</div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <AlertTriangle size={16} />
                <h3 className="card-title" style={{ margin: 0 }}>What needs attention</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {decisionItems.map(item => (
                  <div key={item.title} className="card" style={{ padding: '0.8rem', marginBottom: 0, borderLeft: item.severity === 'critical' ? '4px solid #ef4444' : item.severity === 'warning' ? '4px solid #f59e0b' : '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <strong>{item.title}</strong>
                      <span className={`badge ${item.severity === 'critical' ? 'badge-critical' : item.severity === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                        {item.severity}
                      </span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>{item.explanation}</div>
                    <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span><strong>Action:</strong> {item.action}</span>
                      <span className="text-muted">Source: {item.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <Activity size={16} />
                <h3 className="card-title" style={{ margin: 0 }}>Today's flock status</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className={`badge ${todayStatus === 'CRITICAL' ? 'badge-critical' : todayStatus === 'WATCH' ? 'badge-warning' : 'badge-success'}`}>{todayStatus}</span>
              </div>
              <p className="text-muted" style={{ margin: '0.25rem 0 0.75rem' }}>{decisionItems[0]?.explanation ?? 'Flock currently appears on track.'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {decisionItems.slice(0, 3).map((item, index) => (
                  <div key={`${item.title}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <ArrowRight size={14} />
                    <span>{item.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <HeartPulse size={16} />
                <h3 className="card-title" style={{ margin: 0 }}>Health summary</h3>
              </div>
              {healthSummary ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.7rem' }}>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Status</div>
                    <strong>{healthSummary.latestHealthStatus}</strong>
                  </div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Risk level</div>
                    <strong>{healthSummary.highestRecentRisk}</strong>
                  </div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Total inspections</div>
                    <strong>{healthSummary.totalInspections}</strong>
                  </div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Low confidence</div>
                    <strong>{healthSummary.lowConfidenceInspections}</strong>
                  </div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Abnormal</div>
                    <strong>{healthSummary.abnormalInspectionCount}</strong>
                  </div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Trend</div>
                    <strong>{healthSummary.recentHealthTrend}</strong>
                  </div>
                </div>
              ) : (
                <div className="text-muted">No health inspections recorded yet.</div>
              )}
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <TrendingUp size={16} />
                <h3 className="card-title" style={{ margin: 0 }}>Performance summary</h3>
              </div>
              {performance ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.7rem' }}>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}><div className="text-muted" style={{ fontSize: '0.72rem' }}>Birds alive</div><strong>{formatNumber(performance.birdsAlive, 0)}</strong></div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}><div className="text-muted" style={{ fontSize: '0.72rem' }}>Loss rate</div><strong>{performance.lossRatePct !== null ? formatPercent(performance.lossRatePct) : 'N/A'}</strong></div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}><div className="text-muted" style={{ fontSize: '0.72rem' }}>Avg. weight</div><strong>{performance.latestAverageWeightKg !== null ? `${performance.latestAverageWeightKg.toFixed(2)} kg` : 'N/A'}</strong></div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}><div className="text-muted" style={{ fontSize: '0.72rem' }}>Biomass</div><strong>{performance.liveBiomassKg !== null ? `${performance.liveBiomassKg.toFixed(1)} kg` : 'N/A'}</strong></div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}><div className="text-muted" style={{ fontSize: '0.72rem' }}>Feed</div><strong>{performance.cumulativeFeedKg !== null ? `${performance.cumulativeFeedKg.toFixed(1)} kg` : 'N/A'}</strong></div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}><div className="text-muted" style={{ fontSize: '0.72rem' }}>ADG</div><strong>{performance.recentAdgKgPerDay !== null ? `${performance.recentAdgKgPerDay.toFixed(3)} kg/day` : 'N/A'}</strong></div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}><div className="text-muted" style={{ fontSize: '0.72rem' }}>Target weight</div><strong>{performance.targetSaleWeightKg !== null ? `${performance.targetSaleWeightKg.toFixed(2)} kg` : 'N/A'}</strong></div>
                  <div className="card" style={{ padding: '0.7rem', marginBottom: 0 }}><div className="text-muted" style={{ fontSize: '0.72rem' }}>Actual FCR</div><strong>{performance.operationalFcr !== null ? performance.operationalFcr.toFixed(2) : 'Not yet calculable'}</strong></div>
                </div>
              ) : (
                <div className="text-muted">Daily flock data not recorded yet.</div>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <Weight size={16} />
                <h3 className="card-title" style={{ margin: 0 }}>Average weight trend</h3>
              </div>
              {weightTrend.length ? (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '140px', borderRadius: '10px', background: 'rgba(148,163,184,0.04)' }}>
                  <path d={weightChartPath} stroke="#3b82f6" strokeWidth="2.4" fill="none" />
                </svg>
              ) : (
                <div className="text-muted">Daily flock data not recorded yet.</div>
              )}
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <ShieldAlert size={16} />
                <h3 className="card-title" style={{ margin: 0 }}>Mortality + culls trend</h3>
              </div>
              {mortalityTrend.length ? (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '140px', borderRadius: '10px', background: 'rgba(148,163,184,0.04)' }}>
                  <path d={mortalityChartPath} stroke="#ef4444" strokeWidth="2.4" fill="none" />
                </svg>
              ) : (
                <div className="text-muted">Daily flock data not recorded yet.</div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <CheckCircle2 size={16} />
              <h3 className="card-title" style={{ margin: 0 }}>Quick actions</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => onNavigate?.('batch')}>Record today’s flock data</button>
              <button className="btn btn-outline" onClick={() => onNavigate?.('health')}>View health history</button>
              <button className="btn btn-outline" onClick={() => onNavigate?.('batch')}>View batch performance</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
