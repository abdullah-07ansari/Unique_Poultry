export type HealthConditionCode =
  | 'HEALTHY'
  | 'RESPIRATORY_SIGN'
  | 'EYE_ABNORMALITY'
  | 'LEG_ABNORMALITY'
  | 'SKIN_FEATHER_ABNORMALITY'
  | 'SWELLING'
  | 'GENERAL_ABNORMALITY'
  | 'UNKNOWN';

export type RiskSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface HealthConditionDefinition {
  code: HealthConditionCode;
  displayName: string;
  description: string;
  severity: RiskSeverity;
  recommendedAction: string;
  requiresVeterinaryAttention: boolean;
}

export const HEALTH_CONDITION_TAXONOMY: Record<HealthConditionCode, HealthConditionDefinition> = {
  HEALTHY: {
    code: 'HEALTHY',
    displayName: 'Healthy observation',
    description: 'No clear abnormal visual signal was detected in the inspected image.',
    severity: 'LOW',
    recommendedAction: 'Continue routine monitoring and keep standard flock observation schedules.',
    requiresVeterinaryAttention: false
  },
  RESPIRATORY_SIGN: {
    code: 'RESPIRATORY_SIGN',
    displayName: 'Possible respiratory sign',
    description: 'Visual cues may indicate respiratory stress or airflow issues in the flock.',
    severity: 'MODERATE',
    recommendedAction: 'Review ventilation and air quality. Capture a clearer image and inspect additional birds in the same area.',
    requiresVeterinaryAttention: false
  },
  EYE_ABNORMALITY: {
    code: 'EYE_ABNORMALITY',
    displayName: 'Possible eye abnormality',
    description: 'Eye-related abnormalities may indicate irritation or an emerging health issue.',
    severity: 'MODERATE',
    recommendedAction: 'Inspect the affected birds closely and confirm the image quality before escalating.',
    requiresVeterinaryAttention: false
  },
  LEG_ABNORMALITY: {
    code: 'LEG_ABNORMALITY',
    displayName: 'Possible leg abnormality',
    description: 'Leg or posture abnormalities may reflect movement issues or localized discomfort.',
    severity: 'MODERATE',
    recommendedAction: 'Inspect mobility and gait in a representative sample of birds. Review litter quality and stocking density.',
    requiresVeterinaryAttention: false
  },
  SKIN_FEATHER_ABNORMALITY: {
    code: 'SKIN_FEATHER_ABNORMALITY',
    displayName: 'Possible skin or feather abnormality',
    description: 'Skin or feather irregularities may reflect stress, irritation, or environmental issues.',
    severity: 'MODERATE',
    recommendedAction: 'Inspect affected birds and review the environment for stressors or poor conditions.',
    requiresVeterinaryAttention: false
  },
  SWELLING: {
    code: 'SWELLING',
    displayName: 'Possible swelling',
    description: 'Swelling or localized tissue changes may indicate a developing health concern.',
    severity: 'HIGH',
    recommendedAction: 'Inspect the affected birds closely and consider a veterinary review if the pattern persists or spreads.',
    requiresVeterinaryAttention: true
  },
  GENERAL_ABNORMALITY: {
    code: 'GENERAL_ABNORMALITY',
    displayName: 'Visual abnormality detected',
    description: 'A visual cue suggests some abnormality, but the specific cause is not yet confirmed.',
    severity: 'HIGH',
    recommendedAction: 'Capture a clearer image and inspect additional birds. Continue monitoring the flock closely.',
    requiresVeterinaryAttention: false
  },
  UNKNOWN: {
    code: 'UNKNOWN',
    displayName: 'Unknown observation',
    description: 'The evidence is insufficient to classify the visual finding confidently.',
    severity: 'LOW',
    recommendedAction: 'Capture a clearer image and re-run inspection when the image quality is better.',
    requiresVeterinaryAttention: false
  }
};

const KEYWORD_MAP: Array<{ keywords: string[]; code: HealthConditionCode }> = [
  { keywords: ['respiratory', 'breathing', 'cough', 'sneeze', 'airflow'], code: 'RESPIRATORY_SIGN' },
  { keywords: ['eye', 'ocular', 'blind', 'retina'], code: 'EYE_ABNORMALITY' },
  { keywords: ['leg', 'lameness', 'limp', 'gait', 'joint'], code: 'LEG_ABNORMALITY' },
  { keywords: ['feather', 'skin', 'plumage', 'scale', 'peeling'], code: 'SKIN_FEATHER_ABNORMALITY' },
  { keywords: ['swelling', 'edema', 'lump', 'inflamed'], code: 'SWELLING' },
  { keywords: ['abnormal', 'anomaly', 'irregular'], code: 'GENERAL_ABNORMALITY' }
];

export function inferHealthConditionFromDetection(className: string): HealthConditionCode {
  const normalized = String(className ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'UNKNOWN';
  }

  for (const map of KEYWORD_MAP) {
    if (map.keywords.some(keyword => normalized.includes(keyword))) {
      return map.code;
    }
  }

  return 'GENERAL_ABNORMALITY';
}

export function getConfidenceState(confidence: number | null): 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA' {
  if (confidence === null || confidence === undefined) return 'INSUFFICIENT_DATA';
  if (confidence >= 80) return 'HIGH';
  if (confidence >= 60) return 'MEDIUM';
  return 'LOW';
}
