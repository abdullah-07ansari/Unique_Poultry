import type { HealthInspection } from '../types/api';
import { ApiError } from '../types/api';

const BASE = 'http://localhost:5000/api';

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

export async function createHealthInspection(
  batchId: string,
  data: {
    inspectionDate: string;
    flockDay: number;
    imageReference: string;
    notes?: string;
  }
): Promise<HealthInspection> {
  const res = await fetch(`${BASE}/batches/${batchId}/health-inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse<HealthInspection>(res);
}

export async function fetchHealthInspections(batchId: string): Promise<HealthInspection[]> {
  const res = await fetch(`${BASE}/batches/${batchId}/health-inspections`);
  return handleResponse<HealthInspection[]>(res);
}

export async function fetchHealthInspection(inspectionId: string): Promise<HealthInspection> {
  const res = await fetch(`${BASE}/health-inspections/${inspectionId}`);
  return handleResponse<HealthInspection>(res);
}

export async function analyzeHealthInspection(inspectionId: string): Promise<HealthInspection> {
  const res = await fetch(`${BASE}/health-inspections/${inspectionId}/analyze`, {
    method: 'POST'
  });
  return handleResponse<{ success: boolean; inspection: HealthInspection }>(res).then(r => r.inspection);
}
