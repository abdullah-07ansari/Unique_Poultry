// ============================================================
// PoultrySense AI — Shared API Types (Step 2 schema-aligned)
// ============================================================

export interface Farm {
  _id: string;
  farmName: string;
  location: string;
  manager: string;
  shedCount: number;
  totalCapacity: number;
  status: 'active' | 'inactive' | 'maintenance';
  weatherZone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shed {
  _id: string;
  shedName: string;
  farmId: string;
  capacity: number;
  status: 'Active' | 'Inactive' | 'Maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  _id: string;
  batchName: string;
  farmId?: string;
  shedId?: string;
  breed: string;
  placementDate: string;
  initialBirds: number;
  aliveBirds: number;
  avgWeight: number;
  targetSaleWeightKg: number;
  targetFcr: number;
  targetSaleAgeDays: number;
  status: 'Active' | 'Sold';
  saleDate?: string;
  soldBirds?: number;
  saleWeightKg?: number;
  createdAt: string;
  updatedAt: string;
}

export type BatchPerformanceStatus = 'ON_TRACK' | 'WATCH' | 'CRITICAL' | 'INSUFFICIENT_DATA';

export interface BatchPerformance {
  batchId: string;
  batchName: string;
  ageDays: number;
  birdsPlaced: number;
  birdsAlive: number;
  totalMortality: number;
  totalCulls: number;
  totalLosses: number;
  lossRatePct: number | null;
  cumulativeFeedKg: number | null;
  feedPerPlacedBirdKg: number | null;
  latestAverageWeightKg: number | null;
  latestRecordDate: string | null;
  latestRecordFlockDay: number | null;
  liveBiomassKg: number | null;
  startingBiomassKg: null;
  weightGainKg: null;
  recentAdgKgPerDay: number | null;
  operationalFcr: number | null;
  targetFcr: number | null;
  fcrGap: number | null;
  targetSaleWeightKg: number | null;
  weightGapKg: number | null;
  targetSaleAgeDays: number | null;
  estimatedDaysToTarget: number | null;
  projectedTargetAgeDays: number | null;
  saleAgeDeviationDays: number | null;
  performanceStatus: BatchPerformanceStatus;
}

/**
 * Raw daily observation record for a flock.
 * All counts (mortality, culls) are DAILY — never cumulative.
 * aliveBirds is NOT stored here; it lives on the Batch document
 * and is always recalculated on the backend from the sum of all daily records.
 */
export interface DailyFlockRecord {
  _id: string;
  batchId: string;
  /** Calendar date of this observation (UTC midnight) */
  date: string;
  /** Age of the flock on this date (Day 1 = placement day) */
  flockDay: number;
  /** Total flock feed consumed that day, kg — DAILY, not cumulative */
  feedConsumedKg: number;
  /** Total flock water consumed that day, liters — DAILY, not cumulative */
  waterConsumedLiters: number;
  /** Birds that died during this day only — DAILY count */
  mortality: number;
  /** Birds culled (removed alive) during this day only — DAILY count */
  culls: number;
  /** Average live body weight of sampled birds, kg */
  averageWeightKg: number;
  /** Number of birds weighed to produce averageWeightKg */
  sampleSize: number;
  temperatureC: number;
  humidityPct: number;
  ammoniaPpm: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Shape of the daily-record form (pre-submit). */
export interface DailyRecordFormData {
  date: string;
  feedConsumedKg: string;
  waterConsumedLiters: string;
  mortality: string;
  culls: string;
  averageWeightKg: string;
  sampleSize: string;
  temperatureC: string;
  humidityPct: string;
  ammoniaPpm: string;
  notes: string;
}

export interface NewBatchFormData {
  batchName: string;
  farmId: string;
  shedId: string;
  breed: string;
  placementDate: string;
  initialBirds: string;
  targetSaleWeightKg: string;
  targetFcr: string;
  targetSaleAgeDays: string;
}

export type HealthInspectionStatus = 'pending' | 'completed' | 'needs_review' | 'error';
export type HealthInspectionModelStatus = 'NOT_RUN' | 'MODEL_NOT_TRAINED' | 'SUCCESS' | 'LOW_CONFIDENCE' | 'ERROR';

export interface HealthInspectionDetectionBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HealthInspectionDetection {
  className: string;
  confidence: number;
  bbox: HealthInspectionDetectionBBox;
}

export interface HealthInspectionResult {
  status: HealthInspectionModelStatus;
  confidence: number | null;
  detections: HealthInspectionDetection[];
  message: string | null;
}

export interface HealthInspection {
  _id: string;
  batchId: string;
  inspectionDate: string;
  flockDay: number;
  imageReference: string;
  inspectionStatus: HealthInspectionStatus;
  aiModelStatus: HealthInspectionModelStatus;
  confidence: number | null;
  detectedConditions: string[];
  notes?: string;
  result?: HealthInspectionResult;
  createdAt: string;
  updatedAt: string;
}

export type HealthAssessmentStatus =
  | 'INSUFFICIENT_DATA'
  | 'MODEL_NOT_TRAINED'
  | 'LOW_CONFIDENCE'
  | 'WATCH'
  | 'ALERT'
  | 'CRITICAL';

export type HealthRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INSUFFICIENT_DATA';
export type HealthSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'INSUFFICIENT_DATA';
export type ConfidenceState = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export interface HealthConditionDefinition {
  code: string;
  displayName: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendedAction: string;
  requiresVeterinaryAttention: boolean;
}

export interface HealthAssessment {
  healthStatus: HealthAssessmentStatus;
  riskLevel: HealthRiskLevel;
  riskScore: number;
  severity: HealthSeverity;
  possibleConditions: string[];
  explanation: string;
  recommendedActions: string[];
  requiresClearerImage: boolean;
  veterinaryAttentionRecommended: boolean;
  confidenceState: ConfidenceState;
  conditionDetails: HealthConditionDefinition[];
}

export interface BatchHealthSummary {
  batchId: string;
  batchName: string;
  totalInspections: number;
  successfulAnalyses: number;
  lowConfidenceInspections: number;
  abnormalInspectionCount: number;
  latestHealthStatus: HealthAssessmentStatus;
  highestRecentRisk: HealthRiskLevel;
  recurringConditions: string[];
  recentHealthTrend: 'stable' | 'improving' | 'worsening' | 'insufficient_data';
}

/** API error with status code for targeted error handling */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
