import mongoose, { Schema, Document } from 'mongoose';

export type HealthInspectionStatus = 'pending' | 'completed' | 'needs_review' | 'error';
export type AiModelStatus = 'NOT_RUN' | 'MODEL_NOT_TRAINED' | 'SUCCESS' | 'LOW_CONFIDENCE' | 'ERROR';

export interface InspectionDetectionBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InspectionDetection {
  className: string;
  confidence: number;
  bbox: InspectionDetectionBBox;
}

export interface AiInspectionResult {
  status: AiModelStatus;
  confidence: number | null;
  detections: InspectionDetection[];
  message: string | null;
}

export interface IHealthInspection extends Document {
  batchId: mongoose.Types.ObjectId;
  inspectionDate: Date;
  flockDay: number;
  imageReference: string;
  inspectionStatus: HealthInspectionStatus;
  aiModelStatus: AiModelStatus;
  confidence: number | null;
  detectedConditions: string[];
  notes?: string;
  result?: AiInspectionResult;
  createdAt: Date;
  updatedAt: Date;
}

const HealthInspectionSchema: Schema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    inspectionDate: { type: Date, required: true },
    flockDay: { type: Number, required: true, min: 1 },
    imageReference: { type: String, required: true, trim: true },
    inspectionStatus: {
      type: String,
      enum: ['pending', 'completed', 'needs_review', 'error'],
      default: 'pending'
    },
    aiModelStatus: {
      type: String,
      enum: ['NOT_RUN', 'MODEL_NOT_TRAINED', 'SUCCESS', 'LOW_CONFIDENCE', 'ERROR'],
      default: 'NOT_RUN'
    },
    confidence: { type: Number, default: null },
    detectedConditions: { type: [String], default: [] },
    notes: { type: String, default: '' },
    result: {
      status: {
        type: String,
        enum: ['NOT_RUN', 'MODEL_NOT_TRAINED', 'SUCCESS', 'LOW_CONFIDENCE', 'ERROR'],
        default: 'NOT_RUN'
      },
      confidence: { type: Number, default: null },
      detections: [
        {
          className: { type: String, required: true },
          confidence: { type: Number, required: true },
          bbox: {
            x: Number,
            y: Number,
            width: Number,
            height: Number
          }
        }
      ],
      message: { type: String, default: null }
    }
  },
  { timestamps: true }
);

export default mongoose.model<IHealthInspection>('HealthInspection', HealthInspectionSchema);
