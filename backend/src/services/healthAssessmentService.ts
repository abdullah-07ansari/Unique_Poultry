import Batch from '../models/Batch';
import DailyFlockRecord from '../models/DailyFlockRecord';
import HealthInspection from '../models/HealthInspection';
import { HEALTH_CONDITION_TAXONOMY, getConfidenceState, inferHealthConditionFromDetection, type HealthConditionCode } from './healthTaxonomy';

export type HealthAssessmentStatus =
  | 'INSUFFICIENT_DATA'
  | 'MODEL_NOT_TRAINED'
  | 'LOW_CONFIDENCE'
  | 'WATCH'
  | 'ALERT'
  | 'CRITICAL';

export type HealthRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INSUFFICIENT_DATA';
export type HealthSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'INSUFFICIENT_DATA';

export interface HealthConditionAssessment {
  code: HealthConditionCode;
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
  confidenceState: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  conditionDetails: HealthConditionAssessment[];
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getSeverityFromRisk(score: number): HealthSeverity {
  if (score <= 0) return 'LOW';
  if (score < 30) return 'LOW';
  if (score < 50) return 'MODERATE';
  if (score < 75) return 'HIGH';
  return 'CRITICAL';
}

function getRiskLevelFromScore(score: number): HealthRiskLevel {
  if (score <= 0) return 'LOW';
  if (score < 30) return 'LOW';
  if (score < 50) return 'MEDIUM';
  if (score < 75) return 'HIGH';
  return 'CRITICAL';
}

function getHealthStatusFromScore(score: number, lowConfidence: boolean, modelUnavailable: boolean): HealthAssessmentStatus {
  if (modelUnavailable) return 'MODEL_NOT_TRAINED';
  if (lowConfidence) return 'LOW_CONFIDENCE';
  if (score <= 0) return 'INSUFFICIENT_DATA';
  if (score < 30) return 'WATCH';
  if (score < 55) return 'WATCH';
  if (score < 75) return 'ALERT';
  return 'CRITICAL';
}

export function assessHealthInspection(inspection: any, batch?: any): HealthAssessment {
  const result = inspection?.result ?? null;
  const detectResults = Array.isArray(result?.detections) ? result.detections : [];
  const confidence = typeof result?.confidence === 'number' ? result.confidence : inspection?.confidence ?? null;

  if (!result || result.status === 'NOT_RUN') {
    return {
      healthStatus: 'INSUFFICIENT_DATA',
      riskLevel: 'INSUFFICIENT_DATA',
      riskScore: 0,
      severity: 'INSUFFICIENT_DATA',
      possibleConditions: ['UNKNOWN'],
      explanation: 'No health analysis has been run for this inspection yet.',
      recommendedActions: ['Capture an image and run the analysis once the model is available.'],
      requiresClearerImage: false,
      veterinaryAttentionRecommended: false,
      confidenceState: 'INSUFFICIENT_DATA',
      conditionDetails: [HEALTH_CONDITION_TAXONOMY.UNKNOWN]
    };
  }

  if (result.status === 'MODEL_NOT_TRAINED') {
    return {
      healthStatus: 'MODEL_NOT_TRAINED',
      riskLevel: 'INSUFFICIENT_DATA',
      riskScore: 0,
      severity: 'INSUFFICIENT_DATA',
      possibleConditions: ['UNKNOWN'],
      explanation: 'AI model is not yet available. This inspection cannot determine any visual health signal.',
      recommendedActions: ['Capture a clearer image when the model is ready.', 'Continue routine flock monitoring.'],
      requiresClearerImage: true,
      veterinaryAttentionRecommended: false,
      confidenceState: 'INSUFFICIENT_DATA',
      conditionDetails: [HEALTH_CONDITION_TAXONOMY.UNKNOWN]
    };
  }

  const confidenceState = getConfidenceState(confidence);
  const requiresClearerImage = result.status === 'LOW_CONFIDENCE' || confidenceState === 'LOW';

  let mappedConditions: HealthConditionCode[] = detectResults.length > 0
    ? detectResults.map((detection: any) => inferHealthConditionFromDetection(detection.className ?? ''))
    : ['HEALTHY'];

  if (result.status === 'LOW_CONFIDENCE') {
    mappedConditions = ['UNKNOWN'];
  }

  const conditionDetails = mappedConditions.map(code => HEALTH_CONDITION_TAXONOMY[code] ?? HEALTH_CONDITION_TAXONOMY.UNKNOWN);

  let baseScore = 0;
  for (const detail of conditionDetails) {
    const severityWeight = { LOW: 12, MODERATE: 28, HIGH: 42, CRITICAL: 58 };
    baseScore += severityWeight[detail.severity];
  }

  const confidenceFactor = confidence === null ? 0 : (100 - confidence) * 0.2;
  const repeatedConditionBonus = detectResults.length > 0 ? 8 : 0;
  const lossRateBonus = batch && typeof batch.lossRatePct === 'number' ? clamp((batch.lossRatePct / 100) * 40, 0, 25) : 0;
  const score = clamp(baseScore + confidenceFactor + repeatedConditionBonus + lossRateBonus, 0, 100);

  const riskLevel = getRiskLevelFromScore(score);
  const severity = getSeverityFromRisk(score);
  const healthStatus = getHealthStatusFromScore(score, result.status === 'LOW_CONFIDENCE' || confidenceState === 'LOW', false);

  const recommendedActions = Array.from(new Set(
    conditionDetails.flatMap(detail => [
      detail.recommendedAction,
      ...(detail.requiresVeterinaryAttention ? ['Consider veterinary attention if the issue persists or spreads.'] : [])
    ])
  ));

  if (requiresClearerImage) {
    recommendedActions.unshift('Capture a clearer image.');
  }

  if (lossRateBonus > 0) {
    recommendedActions.push('Review recent mortality and cull trends for the flock.');
  }

  const explanation = result.status === 'LOW_CONFIDENCE'
    ? 'The image confidence is low, so the system should not assign a definitive visual health interpretation.'
    : result.status === 'SUCCESS' && detectResults.length === 0
      ? 'The inspection did not detect any clear abnormalities in the available visual data.'
      : `Detections suggest ${conditionDetails.map(item => item.displayName.toLowerCase()).join(', ')}. The score incorporates detection severity, confidence, and current flock context.`;

  return {
    healthStatus,
    riskLevel,
    riskScore: Math.round(score),
    severity,
    possibleConditions: conditionDetails.map(item => item.code),
    explanation,
    recommendedActions,
    requiresClearerImage,
    veterinaryAttentionRecommended: conditionDetails.some(item => item.requiresVeterinaryAttention),
    confidenceState,
    conditionDetails: conditionDetails.map(item => ({
      code: item.code,
      displayName: item.displayName,
      description: item.description,
      severity: item.severity,
      recommendedAction: item.recommendedAction,
      requiresVeterinaryAttention: item.requiresVeterinaryAttention
    }))
  };
}

export async function summarizeBatchHealth(batchId: string): Promise<BatchHealthSummary> {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  const inspections = await HealthInspection.find({ batchId }).sort({ inspectionDate: -1, createdAt: -1 });
  const records = await DailyFlockRecord.find({ batchId }).sort({ date: 1 });

  const totalMortality = records.reduce((sum, record) => sum + (Number(record.mortality) || 0), 0);
  const totalCulls = records.reduce((sum, record) => sum + (Number(record.culls) || 0), 0);
  const totalLosses = totalMortality + totalCulls;
  const lossRatePct = batch.initialBirds > 0 ? (totalLosses / batch.initialBirds) * 100 : null;

  const assessments = inspections.map(inspection => assessHealthInspection(inspection, { lossRatePct }));
  const successfulAnalyses = inspections.filter(inspection => inspection.result?.status === 'SUCCESS').length;
  const lowConfidenceInspections = inspections.filter(inspection => inspection.result?.status === 'LOW_CONFIDENCE').length;
  const abnormalInspectionCount = inspections.filter(inspection => {
    const result = inspection.result;
    if (!result) return false;
    return Boolean(result.detections?.length) || result.status === 'LOW_CONFIDENCE';
  }).length;

  const latestAssessment = assessments[0] ?? {
    healthStatus: 'INSUFFICIENT_DATA',
    riskLevel: 'INSUFFICIENT_DATA',
    riskScore: 0,
    possibleConditions: ['UNKNOWN']
  };

  const recurringConditionCounts: Record<string, number> = {};
  for (const assessment of assessments) {
    for (const code of assessment.possibleConditions) {
      recurringConditionCounts[code] = (recurringConditionCounts[code] ?? 0) + 1;
    }
  }

  const recurringConditions = Object.entries(recurringConditionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code]) => code);

  let recentHealthTrend: BatchHealthSummary['recentHealthTrend'] = 'insufficient_data';
  if (assessments.length >= 2) {
    const latestScore = assessments[0]?.riskScore ?? 0;
    const previousScore = assessments[1]?.riskScore ?? 0;
    if (latestScore > previousScore) recentHealthTrend = 'worsening';
    else if (latestScore < previousScore) recentHealthTrend = 'improving';
    else recentHealthTrend = 'stable';
  }

  return {
    batchId: batch._id.toString(),
    batchName: batch.batchName,
    totalInspections: inspections.length,
    successfulAnalyses,
    lowConfidenceInspections,
    abnormalInspectionCount,
    latestHealthStatus: latestAssessment.healthStatus,
    highestRecentRisk: (() => {
      const maxScore = assessments.reduce((max, assessment) => Math.max(max, assessment.riskScore), 0);
      return maxScore >= 75 ? 'CRITICAL' : maxScore >= 50 ? 'HIGH' : maxScore >= 30 ? 'MEDIUM' : maxScore > 0 ? 'LOW' : 'INSUFFICIENT_DATA';
    })(),
    recurringConditions,
    recentHealthTrend
  };
}
