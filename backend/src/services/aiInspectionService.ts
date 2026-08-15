export type AiInspectionStatus = 'MODEL_NOT_TRAINED' | 'SUCCESS' | 'LOW_CONFIDENCE' | 'ERROR';

export interface AiInspectionDetectionBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AiInspectionDetection {
  className: string;
  confidence: number;
  bbox: AiInspectionDetectionBBox;
}

export interface AiInspectionResult {
  status: AiInspectionStatus;
  confidence: number | null;
  detections: AiInspectionDetection[];
  message: string | null;
}

export const MODEL_NOT_AVAILABLE_MESSAGE = 'AI model is not yet available';
export const LOW_CONFIDENCE_MESSAGE = 'Image confidence is low. Please capture a clearer image.';

export async function runPlaceholderAiInspection(): Promise<AiInspectionResult> {
  return {
    status: 'MODEL_NOT_TRAINED',
    confidence: null,
    detections: [],
    message: MODEL_NOT_AVAILABLE_MESSAGE
  };
}

export function buildLowConfidenceResult(confidence = 0.42): AiInspectionResult {
  return {
    status: 'LOW_CONFIDENCE',
    confidence,
    detections: [],
    message: LOW_CONFIDENCE_MESSAGE
  };
}
