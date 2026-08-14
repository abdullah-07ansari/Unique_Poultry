import Batch from '../models/Batch';
import DailyFlockRecord, { IDailyFlockRecord } from '../models/DailyFlockRecord';

const DAY_MS = 24 * 60 * 60 * 1000;

export type PerformanceStatus = 'ON_TRACK' | 'WATCH' | 'CRITICAL' | 'INSUFFICIENT_DATA';

export interface FlockPerformance {
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
  performanceStatus: PerformanceStatus;
}

function toUtcDateOnly(dateValue: Date | string): Date {
  const date = new Date(dateValue);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function roundValue(value: number | null | undefined, digits = 2): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(digits));
}

function calcAgeDays(placementDate: Date | string | undefined): number {
  if (!placementDate) {
    return 0;
  }

  const placement = toUtcDateOnly(placementDate);
  const today = toUtcDateOnly(new Date());
  const daysSincePlacement = Math.floor((today.getTime() - placement.getTime()) / DAY_MS);
  return Math.max(0, daysSincePlacement + 1);
}

function sortByFlockDayThenDate(a: IDailyFlockRecord, b: IDailyFlockRecord): number {
  const dayDelta = (a.flockDay ?? 0) - (b.flockDay ?? 0);
  if (dayDelta !== 0) return dayDelta;

  const aTime = new Date(a.date).getTime();
  const bTime = new Date(b.date).getTime();
  return aTime - bTime;
}

function determinePerformanceStatus(performance: FlockPerformance): PerformanceStatus {
  const hasRecords = performance.totalMortality >= 0 || performance.totalCulls >= 0 || performance.birdsPlaced > 0;
  const noMeaningfulSignals =
    performance.lossRatePct === null &&
    performance.latestAverageWeightKg === null &&
    performance.recentAdgKgPerDay === null &&
    performance.projectedTargetAgeDays === null &&
    performance.operationalFcr === null;

  if (!hasRecords || noMeaningfulSignals) {
    return 'INSUFFICIENT_DATA';
  }

  const lossRate = performance.lossRatePct ?? 0;
  const severeLoss = lossRate >= 12;
  const deadOut = performance.birdsAlive === 0 && performance.birdsPlaced > 0;

  if (severeLoss || deadOut) {
    return 'CRITICAL';
  }

  const lateProjection = performance.saleAgeDeviationDays !== null && performance.saleAgeDeviationDays > 10;
  const weakAdg = performance.recentAdgKgPerDay !== null && performance.recentAdgKgPerDay <= 0;
  const belowTargetWeight = performance.latestAverageWeightKg !== null &&
    performance.targetSaleWeightKg !== null &&
    performance.weightGapKg !== null &&
    performance.weightGapKg < -0.5;

  if (lossRate >= 2 || lateProjection || (weakAdg && belowTargetWeight)) {
    return 'WATCH';
  }

  return 'ON_TRACK';
}

export async function calculateFlockPerformance(batchId: string): Promise<FlockPerformance> {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    const error = new Error('Batch not found');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const records: IDailyFlockRecord[] = await DailyFlockRecord.find({ batchId }).sort({ flockDay: 1, date: 1 });
  const sortedRecords = [...records].sort(sortByFlockDayThenDate);

  const birdsPlaced = Number(batch.initialBirds) || 0;
  const totalMortality = sortedRecords.reduce((sum, record) => sum + (Number(record.mortality) || 0), 0);
  const totalCulls = sortedRecords.reduce((sum, record) => sum + (Number(record.culls) || 0), 0);
  const totalLosses = totalMortality + totalCulls;
  const birdsAlive = Math.max(0, birdsPlaced - totalLosses);
  const lossRatePct = birdsPlaced > 0 ? roundValue((totalLosses / birdsPlaced) * 100, 2) : null;

  const cumulativeFeedKg = sortedRecords.reduce((sum, record) => sum + (Number(record.feedConsumedKg) || 0), 0);
  const feedPerPlacedBirdKg = birdsPlaced > 0 ? roundValue(cumulativeFeedKg / birdsPlaced, 2) : null;

  const validWeightRecords = sortedRecords.filter((record) => Number(record.averageWeightKg) > 0);
  const latestWeightRecord = validWeightRecords.length > 0 ? validWeightRecords[validWeightRecords.length - 1] : null;
  const latestAverageWeightKg = latestWeightRecord ? roundValue(Number(latestWeightRecord.averageWeightKg), 2) : null;
  const latestRecordDate = latestWeightRecord ? new Date(latestWeightRecord.date).toISOString() : null;
  const latestRecordFlockDay = latestWeightRecord ? latestWeightRecord.flockDay : null;

  const liveBiomassKg = latestAverageWeightKg !== null ? roundValue(birdsAlive * latestAverageWeightKg, 2) : null;

  let recentAdgKgPerDay: number | null = null;
  if (validWeightRecords.length >= 2) {
    const previousWeightRecord = validWeightRecords[validWeightRecords.length - 2];
    const latestWeight = Number(latestWeightRecord?.averageWeightKg ?? 0);
    const previousWeight = Number(previousWeightRecord?.averageWeightKg ?? 0);
    const dayDifference = (latestWeightRecord?.flockDay ?? 0) - (previousWeightRecord?.flockDay ?? 0);

    if (dayDifference > 0) {
      const weightChange = latestWeight - previousWeight;
      recentAdgKgPerDay = roundValue(weightChange / dayDifference, 4);
    }
  }

  const targetFcr = batch.targetFcr !== undefined && batch.targetFcr !== null ? Number(batch.targetFcr) : null;
  const targetSaleWeightKg = batch.targetSaleWeightKg !== undefined && batch.targetSaleWeightKg !== null ? Number(batch.targetSaleWeightKg) : null;
  const targetSaleAgeDays = batch.targetSaleAgeDays !== undefined && batch.targetSaleAgeDays !== null ? Number(batch.targetSaleAgeDays) : null;

  const startingBiomassKg = null;
  const weightGainKg = null;
  const operationalFcr = null;
  const fcrGap = operationalFcr !== null && targetFcr !== null ? roundValue(operationalFcr - targetFcr, 2) : null;
  const weightGapKg = latestAverageWeightKg !== null && targetSaleWeightKg !== null ? roundValue(latestAverageWeightKg - targetSaleWeightKg, 2) : null;

  let estimatedDaysToTarget: number | null = null;
  let projectedTargetAgeDays: number | null = null;
  if (latestAverageWeightKg !== null && targetSaleWeightKg !== null && recentAdgKgPerDay !== null && recentAdgKgPerDay > 0) {
    if (latestAverageWeightKg >= targetSaleWeightKg) {
      estimatedDaysToTarget = 0;
      projectedTargetAgeDays = latestRecordFlockDay;
    } else {
      const remainingWeightKg = targetSaleWeightKg - latestAverageWeightKg;
      estimatedDaysToTarget = roundValue(remainingWeightKg / recentAdgKgPerDay, 2);
      projectedTargetAgeDays = latestRecordFlockDay !== null && estimatedDaysToTarget !== null
        ? Number(latestRecordFlockDay) + estimatedDaysToTarget
        : null;
    }
  }

  const saleAgeDeviationDays = projectedTargetAgeDays !== null && targetSaleAgeDays !== null
    ? roundValue(projectedTargetAgeDays - targetSaleAgeDays, 2)
    : null;

  const performance: FlockPerformance = {
    batchId: batch._id.toString(),
    batchName: batch.batchName,
    ageDays: calcAgeDays(batch.placementDate),
    birdsPlaced: birdsPlaced,
    birdsAlive: birdsAlive,
    totalMortality,
    totalCulls,
    totalLosses,
    lossRatePct,
    cumulativeFeedKg: roundValue(cumulativeFeedKg, 2),
    feedPerPlacedBirdKg,
    latestAverageWeightKg,
    latestRecordDate,
    latestRecordFlockDay,
    liveBiomassKg,
    startingBiomassKg,
    weightGainKg,
    recentAdgKgPerDay,
    operationalFcr,
    targetFcr,
    fcrGap,
    targetSaleWeightKg,
    weightGapKg,
    targetSaleAgeDays,
    estimatedDaysToTarget,
    projectedTargetAgeDays,
    saleAgeDeviationDays,
    performanceStatus: 'INSUFFICIENT_DATA'
  };

  performance.performanceStatus = determinePerformanceStatus(performance);
  return performance;
}
