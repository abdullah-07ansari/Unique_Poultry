import {
  Cpu, Wifi, Database, Share2, Activity, Server,
  Thermometer, Droplets, Zap, Eye, Radio, ShieldCheck, AlertTriangle,
  type LucideIcon
} from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';

// ═══════════════════════════════════════════════
//  TYPES & INTERFACES
// ═══════════════════════════════════════════════

interface SensorData {
  shedId: string;
  temperature: number;
  humidity: number;
  ammonia: number;
  waterLevel: number;
  lux: number;
  co2: number;
  birdDensity: number;
}

interface TimeSeriesPoint {
  t: number;
  v: number;
}

interface PipelineStep {
  icon: LucideIcon;
  label: string;
  sub: string;
  color: string;
}

type ShedStatus = 'critical' | 'warning' | 'normal';

// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════

const SENSOR_THRESHOLDS = {
  temperature: { max: 45, warning: 35, unit: '°C', label: '🌡️ Temperature', color: 'var(--accent-warning)' },
  humidity:    { max: 100, warning: 85, unit: '%',  label: '💧 Humidity',    color: 'var(--accent-cyan)' },
  ammonia:     { max: 50,  warning: 25, unit: 'ppm', label: '☠️ Ammonia',   color: 'var(--accent-secondary)' },
  waterLevel:  { max: 100, warning: undefined, unit: '%', label: '🚿 Water Tank', color: 'var(--accent-primary)' },
  lux:         { max: 600, warning: undefined, unit: 'lx', label: '💡 Lux (Light)', color: '#fbbf24' },
  co2:         { max: 1500, warning: 1200, unit: 'ppm', label: '🌬️ CO₂', color: 'var(--accent-danger)' },
} as const;

const SHED_TABLE_HEADERS = ['Shed', 'Temp', 'Hum%', 'NH₃', 'H₂O%', 'Density', 'Status'] as const;

const FALLBACK_SHEDS: SensorData[] = [
  { shedId: 'Shed-A', temperature: 29.8, humidity: 65, ammonia: 12, waterLevel: 72, lux: 280, co2: 720, birdDensity: 13.5 },
  { shedId: 'Shed-B', temperature: 36.1, humidity: 78, ammonia: 24, waterLevel: 38, lux: 180, co2: 950, birdDensity: 18.2 },
  { shedId: 'Shed-C', temperature: 28.4, humidity: 58, ammonia: 9,  waterLevel: 81, lux: 320, co2: 580, birdDensity: 11.0 },
  { shedId: 'Shed-D', temperature: 31.2, humidity: 70, ammonia: 15, waterLevel: 55, lux: 240, co2: 810, birdDensity: 14.8 },
];

const PIPELINE_STEPS: PipelineStep[] = [
  { icon: Cpu,      label: 'ESP32 Edge Nodes',       sub: 'DHT22, MQ-135, HX711, LDR sensors',      color: 'success' },
  { icon: Radio,    label: 'MQTT Broker (25ms)',      sub: 'Mosquitto v2 · TLS 1.3 encrypted',        color: 'success' },
  { icon: Server,   label: 'NVIDIA Jetson Nano',      sub: 'YOLOv8 RTSP inference (24ms)',            color: 'secondary' },
  { icon: Database, label: 'MongoDB Warehouse',       sub: 'Central time-series store · REST API',     color: 'primary' },
  { icon: Share2,   label: 'External APIs',           sub: 'IMD Weather · Mandi Rates · WhatsApp',    color: 'warning' },
  { icon: Activity, label: 'React Dashboard',         sub: 'Real-time visualization & ML insights',    color: 'danger' },
];

const MQTT_LATENCY_MS = 25;
const SIMULATION_INTERVAL_MS = 2000;

// ═══════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

/** Clamp a number between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Generate initial time-series data for charts */
function generateInitialTimeSeries(
  length: number,
  baseValue: number,
  variance: number
): TimeSeriesPoint[] {
  return Array.from({ length }, (_, i) => ({
    t: i,
    v: baseValue + Math.random() * variance,
  }));
}

/** Append a new simulated point to the time-series, shifting the window */
function advanceTimeSeries(
  prev: TimeSeriesPoint[],
  jitter: number,
  min: number,
  max: number
): TimeSeriesPoint[] {
  const lastPoint = prev[prev.length - 1];
  const nextValue = clamp(lastPoint.v + (Math.random() - 0.5) * jitter, min, max);
  return [...prev.slice(1), { t: lastPoint.t + 1, v: nextValue }];
}

/** Determine status severity for a particular shed */
function deriveShedStatus(shed: SensorData): ShedStatus {
  const isHighTemp = shed.temperature > SENSOR_THRESHOLDS.temperature.warning!;
  const isHighGas = shed.ammonia > SENSOR_THRESHOLDS.ammonia.warning!;
  const isLowWater = shed.waterLevel < 40;
  const isHighCO2 = shed.co2 > SENSOR_THRESHOLDS.co2.warning!;

  if (isHighTemp || isHighGas || isHighCO2) return 'critical';
  if (isLowWater) return 'warning';
  return 'normal';
}

/** Check if a shed has any active alerts */
function shedHasAlerts(shed: SensorData): boolean {
  return shed.temperature > SENSOR_THRESHOLDS.temperature.warning! ||
         shed.birdDensity > 16 ||
         shed.ammonia > SENSOR_THRESHOLDS.ammonia.warning! ||
         shed.co2 > SENSOR_THRESHOLDS.co2.warning!;
}

/** Format the status badge for the overview table */
function getStatusBadge(status: ShedStatus): { label: string; className: string } {
  switch (status) {
    case 'critical': return { label: '⚠ Alert', className: 'badge badge-critical' };
    case 'warning':  return { label: 'Warning', className: 'badge badge-warning' };
    case 'normal':   return { label: '✓ OK',    className: 'badge badge-success' };
  }
}

/** Count active alert conditions across all sheds */
function countActiveAlerts(sheds: SensorData[]): number {
  return sheds.filter(s => deriveShedStatus(s) !== 'normal').length;
}

// ═══════════════════════════════════════════════
//  CUSTOM HOOKS
// ═══════════════════════════════════════════════

/** Pulsing boolean for live indicators */
function usePulse(intervalMs: number): boolean {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return pulse;
}

/** Manages a rolling time-series simulation */
function useTimeSeriesSimulation(
  baseValue: number,
  variance: number,
  jitter: number,
  min: number,
  max: number,
  length = 20,
  intervalMs = SIMULATION_INTERVAL_MS
) {
  const [history, setHistory] = useState<TimeSeriesPoint[]>(() =>
    generateInitialTimeSeries(length, baseValue, variance)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setHistory(prev => advanceTimeSeries(prev, jitter, min, max));
    }, intervalMs);
    return () => clearInterval(id);
  }, [jitter, min, max, intervalMs]);

  const latestValue = history[history.length - 1]?.v ?? baseValue;
  return { history, latestValue };
}

/** Fetch sensor data from the backend API */
function useSensorData() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sensors');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSensorData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSensors();
    // Re-poll every 30 seconds
    const id = setInterval(fetchSensors, 30000);
    return () => clearInterval(id);
  }, [fetchSensors]);

  return { sensorData, loading, error, refetch: fetchSensors };
}

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

/** Single horizontal gauge bar for a sensor reading */
function Gauge({ value, max, label, unit, color, warning }: {
  value: number; max: number; label: string; unit: string; color: string; warning?: number;
}) {
  const percentage = clamp((value / max) * 100, 0, 100);
  const isWarning = warning !== undefined && value >= warning;

  return (
    <div className="sensor-row">
      <div className="sensor-label">{label}</div>
      <div className="sensor-bar-track">
        <div
          className="sensor-bar-fill"
          style={{
            width: `${percentage}%`,
            background: isWarning ? 'var(--accent-danger)' : color,
          }}
        />
      </div>
      <div className={`sensor-value ${isWarning ? 'text-danger' : ''}`}>
        {value.toFixed(1)}{unit}
      </div>
    </div>
  );
}

/** Shed selector pill buttons */
function ShedSelector({ sheds, selectedIndex, onSelect }: {
  sheds: SensorData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      {sheds.map((shed, i) => {
        const hasAlert = shedHasAlerts(shed);
        return (
          <button
            key={shed.shedId}
            id={`shed-selector-${i}`}
            className={`lang-pill ${selectedIndex === i ? 'active' : ''}`}
            onClick={() => onSelect(i)}
            style={hasAlert && selectedIndex !== i ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}
          >
            {shed.shedId}
            {hasAlert && <span style={{ marginLeft: '0.25rem' }}>⚠️</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Panel showing all sensor gauges for a specific shed */
function SensorGaugePanel({ shed, pulse }: { shed: SensorData; pulse: boolean }) {
  const sensorEntries = useMemo(() => [
    { key: 'temperature' as const, value: shed.temperature },
    { key: 'humidity' as const, value: shed.humidity },
    { key: 'ammonia' as const, value: shed.ammonia },
    { key: 'waterLevel' as const, value: shed.waterLevel },
    { key: 'lux' as const, value: shed.lux },
    { key: 'co2' as const, value: shed.co2 },
  ], [shed]);

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="card-title text-success" style={{ margin: 0 }}>
          <Cpu size={16} /> {shed.shedId} — Live Readings
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
          <span
            className="live-dot"
            style={{
              background: pulse ? 'var(--accent-success)' : 'rgba(16,185,129,0.3)',
              transition: 'background 0.2s',
            }}
          />
          <span className="text-success">{MQTT_LATENCY_MS}ms MQTT latency</span>
        </div>
      </div>

      {/* Bird density highlight */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.5rem 0.75rem', marginBottom: '1rem', borderRadius: '8px',
        background: shed.birdDensity > 16 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)',
        border: `1px solid ${shed.birdDensity > 16 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.15)'}`,
        fontSize: '0.8rem',
      }}>
        <span>🐔 Bird Density</span>
        <span style={{ fontWeight: 700, color: shed.birdDensity > 16 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
          {shed.birdDensity.toFixed(1)} birds/m²
          {shed.birdDensity > 16 && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem' }}>⚠ OVERCROWDED</span>}
        </span>
      </div>

      {/* Sensor gauges */}
      <div className="sensor-gauge">
        {sensorEntries.map(({ key, value }) => {
          const config = SENSOR_THRESHOLDS[key];
          return (
            <Gauge
              key={key}
              value={value}
              max={config.max}
              label={config.label}
              unit={config.unit}
              color={config.color}
              warning={config.warning}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Multi-shed comparison table */
function MultiShedTable({ sheds, selectedIndex, onSelect }: {
  sheds: SensorData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const alertCount = countActiveAlerts(sheds);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-title"><Eye size={16} /> Multi-Shed Overview</h3>
        {alertCount > 0 && (
          <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
            <AlertTriangle size={10} /> {alertCount} shed{alertCount > 1 ? 's' : ''} alerting
          </span>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginTop: '0.75rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {SHED_TABLE_HEADERS.map(h => (
                <th key={h} style={{ padding: '0.4rem 0.5rem', textAlign: 'left', borderBottom: '1px solid var(--border-card)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheds.map((shed, i) => {
              const status = deriveShedStatus(shed);
              const badge = getStatusBadge(status);
              const isSelected = selectedIndex === i;

              return (
                <tr
                  key={shed.shedId}
                  id={`shed-row-${i}`}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(168,85,247,0.08)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                  onClick={() => onSelect(i)}
                >
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{shed.shedId}</td>
                  <td style={{ padding: '0.5rem', color: shed.temperature > 35 ? 'var(--accent-danger)' : 'inherit' }}>
                    {shed.temperature.toFixed(1)}°
                  </td>
                  <td style={{ padding: '0.5rem' }}>{shed.humidity.toFixed(0)}%</td>
                  <td style={{ padding: '0.5rem', color: shed.ammonia > 25 ? 'var(--accent-danger)' : 'inherit' }}>
                    {shed.ammonia.toFixed(0)}
                  </td>
                  <td style={{ padding: '0.5rem', color: shed.waterLevel < 40 ? 'var(--accent-danger)' : 'inherit' }}>
                    {shed.waterLevel.toFixed(0)}%
                  </td>
                  <td style={{ padding: '0.5rem', color: shed.birdDensity > 16 ? 'var(--accent-warning)' : 'inherit' }}>
                    {shed.birdDensity.toFixed(1)}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <span className={badge.className}>{badge.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Live time-series trend chart (temperature or humidity) */
function LiveTrendChart({ title, icon: Icon, data, latestValue, unit, color, colorClass, warningThreshold, warningLabel }: {
  title: string;
  icon: LucideIcon;
  data: TimeSeriesPoint[];
  latestValue: number;
  unit: string;
  color: string;
  colorClass: string;
  warningThreshold?: number;
  warningLabel?: string;
}) {
  const isWarning = warningThreshold !== undefined && latestValue > warningThreshold;
  const displayValue = unit === '%' ? latestValue.toFixed(0) : latestValue.toFixed(1);
  const valueColor = isWarning ? 'var(--accent-danger)' : `var(--accent-${colorClass})`;
  const gradientId = `gradient-${colorClass}`;

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h3 className={`card-title text-${colorClass}`}><Icon size={16} /> {title}</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: valueColor }}>
          {displayValue}{unit}
        </span>
        {isWarning && warningLabel && (
          <span className="badge badge-critical">{warningLabel}</span>
        )}
      </div>
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                fontSize: '0.75rem',
              }}
              formatter={(v) => {
                const n = Number(v ?? 0);
                return [`${unit === '%' ? n.toFixed(0) : n.toFixed(1)}${unit}`];
              }}
              labelFormatter={() => ''}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Data pipeline architecture diagram */
function PipelineArchitecture() {
  return (
    <div className="card ai-card">
      <h3 className="card-title text-secondary"><Activity size={16} /> Data Pipeline Architecture</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.75rem' }}>
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.label}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0.625rem',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px',
              transition: 'background 0.15s ease',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `rgba(${step.color === 'success' ? '16,185,129' : step.color === 'primary' ? '168,85,247' : step.color === 'secondary' ? '192,132,252' : step.color === 'warning' ? '245,158,11' : '239,68,68'},0.15)`,
                flexShrink: 0,
              }}>
                <step.icon size={14} className={`text-${step.color}`} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>{step.label}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{step.sub}</div>
              </div>
              <ShieldCheck size={12} className="text-success" style={{ opacity: 0.5, flexShrink: 0 }} />
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div style={{
                height: '14px', width: '2px',
                background: 'var(--border-card)',
                margin: '0 auto', marginLeft: '1.5rem',
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Status bar at the bottom of the pipeline section */
function PipelineStatusBar({ activeStreams, uptime }: {
  activeStreams: number;
  uptime: string;
}) {
  return (
    <div style={{
      marginTop: '1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '0.5rem', fontSize: '0.75rem',
      padding: '0.625rem 0.875rem', borderRadius: '8px',
      background: 'rgba(16,185,129,0.08)',
      border: '1px solid rgba(16,185,129,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Zap size={14} className="text-success" />
        <span>
          Serving <strong>http://localhost:5000/api</strong> · {activeStreams} streams active
        </span>
      </div>
      <span className="text-muted" style={{ fontSize: '0.68rem' }}>Uptime: {uptime}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════

export default function IoTPipelineScreen() {
  // ── State ──
  const [selectedShed, setSelectedShed] = useState(0);

  // ── Hooks ──
  const pulse = usePulse(SIMULATION_INTERVAL_MS);
  const { sensorData, error } = useSensorData();

  const tempSim = useTimeSeriesSimulation(28, 5, 0.8, 24, 38);
  const humSim  = useTimeSeriesSimulation(55, 20, 3, 40, 90);

  // ── Derived data ──
  const allSheds = useMemo(
    () => (sensorData.length > 0 ? sensorData : FALLBACK_SHEDS),
    [sensorData]
  );
  const activeShed = allSheds[selectedShed] ?? allSheds[0];
  const activeStreams = pulse ? 12 : 14;

  // Calculate simulated uptime
  const uptime = useMemo(() => {
    const hrs = Math.floor(Math.random() * 72) + 24;
    return `${hrs}h ${Math.floor(Math.random() * 59)}m`;
  }, []);

  // ── Handlers ──
  const handleShedSelect = useCallback((index: number) => {
    setSelectedShed(index);
  }, []);

  // ── Render ──
  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 className="screen-title" style={{ marginBottom: '0.25rem' }}>
          IoT Pipeline & Live Sensor Telemetry
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {error && (
            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
              <Wifi size={10} /> Using offline data
            </span>
          )}
          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} /> Live
          </span>
        </div>
      </div>
      <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Real-time MQTT stream from ESP32 edge nodes — 6-sensor monitoring across all sheds with anomaly detection
      </p>

      {/* Shed Selector */}
      <ShedSelector
        sheds={allSheds}
        selectedIndex={selectedShed}
        onSelect={handleShedSelect}
      />

      <div className="grid-2">
        {/* ── LEFT COLUMN: Sensors ── */}
        <div>
          <SensorGaugePanel shed={activeShed} pulse={pulse} />
          <MultiShedTable
            sheds={allSheds}
            selectedIndex={selectedShed}
            onSelect={handleShedSelect}
          />
        </div>

        {/* ── RIGHT COLUMN: Charts + Architecture ── */}
        <div>
          <LiveTrendChart
            title="Live Temperature Trend"
            icon={Thermometer}
            data={tempSim.history}
            latestValue={tempSim.latestValue}
            unit="°C"
            color="#f59e0b"
            colorClass="warning"
            warningThreshold={35}
            warningLabel="HIGH TEMP"
          />

          <LiveTrendChart
            title="Live Humidity Trend"
            icon={Droplets}
            data={humSim.history}
            latestValue={humSim.latestValue}
            unit="%"
            color="#06b6d4"
            colorClass="cyan"
            warningThreshold={80}
            warningLabel="HIGH HUMIDITY"
          />

          <PipelineArchitecture />
          <PipelineStatusBar activeStreams={activeStreams} uptime={uptime} />
        </div>
      </div>
    </div>
  );
}
