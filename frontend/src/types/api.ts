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

/** API error with status code for targeted error handling */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
