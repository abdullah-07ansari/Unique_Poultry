// ============================================================
// PoultrySense AI — Flock API Client
// Thin fetch wrappers. No business logic. No fake data.
// ============================================================

import type { Batch, Farm, Shed, DailyFlockRecord, BatchPerformance } from '../types/api';
import { ApiError } from '../types/api';

const BASE = 'http://localhost:5000/api';

/** Helper: throw ApiError with status code on non-ok response. */
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let message = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    message = body.error || body.message || message;
  } catch {
    // body was not JSON
  }
  throw new ApiError(message, res.status);
}

export async function fetchBatches(): Promise<Batch[]> {
  const res = await fetch(`${BASE}/batches`);
  return handleResponse<Batch[]>(res);
}


/** Fetch a fresh copy of a single batch by re-fetching the list. */
export async function refetchBatch(batchId: string): Promise<Batch | null> {
  const all = await fetchBatches();
  return all.find(b => b._id === batchId) ?? null;
}

export async function fetchFarms(): Promise<Farm[]> {
  const res = await fetch(`${BASE}/farms`);
  return handleResponse<Farm[]>(res);
}

export async function fetchSheds(farmId?: string): Promise<Shed[]> {
  const url = farmId ? `${BASE}/sheds?farmId=${farmId}` : `${BASE}/sheds`;
  const res = await fetch(url);
  return handleResponse<Shed[]>(res);
}

export async function fetchDailyRecords(batchId: string): Promise<DailyFlockRecord[]> {
  const res = await fetch(`${BASE}/batches/${batchId}/daily-records`);
  return handleResponse<DailyFlockRecord[]>(res);
}

export async function fetchBatchPerformance(batchId: string): Promise<BatchPerformance> {
  const res = await fetch(`${BASE}/batches/${batchId}/performance`);
  return handleResponse<{ success: boolean; performance: BatchPerformance }>(res).then(r => r.performance);
}

export async function createDailyRecord(
  batchId: string,
  data: {
    date: string;
    flockDay: number;
    feedConsumedKg: number;
    waterConsumedLiters: number;
    mortality: number;
    culls: number;
    averageWeightKg: number;
    sampleSize: number;
    temperatureC: number;
    humidityPct: number;
    ammoniaPpm: number;
    notes?: string;
  }
): Promise<DailyFlockRecord> {
  const res = await fetch(`${BASE}/batches/${batchId}/daily-records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<DailyFlockRecord>(res);
}

export async function updateDailyRecord(
  batchId: string,
  recordId: string,
  data: Partial<{
    date: string;
    flockDay: number;
    feedConsumedKg: number;
    waterConsumedLiters: number;
    mortality: number;
    culls: number;
    averageWeightKg: number;
    sampleSize: number;
    temperatureC: number;
    humidityPct: number;
    ammoniaPpm: number;
    notes: string;
  }>
): Promise<DailyFlockRecord> {
  const res = await fetch(`${BASE}/batches/${batchId}/daily-records/${recordId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<DailyFlockRecord>(res);
}

export async function deleteDailyRecord(batchId: string, recordId: string): Promise<void> {
  const res = await fetch(`${BASE}/batches/${batchId}/daily-records/${recordId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const b = await res.json(); message = b.error || message; } catch {}
    throw new ApiError(message, res.status);
  }
}

export async function createBatch(data: {
  batchName: string;
  initialBirds: number;
  farmId?: string;
  shedId?: string;
  breed?: string;
  placementDate?: string;
  targetSaleWeightKg?: number;
  targetFcr?: number;
  targetSaleAgeDays?: number;
}): Promise<Batch> {
  const res = await fetch(`${BASE}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Batch>(res);
}

/** Returns a user-friendly message for an ApiError. */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409)
      return 'A record for this day already exists. Edit the existing one instead.';
    if (err.status === 404)
      return 'Batch or record not found.';
    if (err.status === 400)
      return err.message || 'Invalid data. Check your inputs.';
    if (err.status >= 500)
      return 'Server error. Please try again.';
    return err.message;
  }
  if (err instanceof TypeError)
    return 'Unable to reach the server. Check your connection.';
  return 'An unexpected error occurred.';
}
