import mongoose, { Schema, Document } from 'mongoose';

export interface INutritionPlan extends Document {
  batchRef: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  batchName: string;
  feedType: string;
  proteinPct: number;
  fatPct: number;
  fiberPct: number;
  dailyFeedKg: number;
  waterLitersPer100: number;
  scheduleAM: string;
  schedulePM: string;
  wastageFlag: boolean;
  wastagePct: number;
  aiRecommendation: string;
  weekNumber: number;
}

const NutritionPlanSchema = new Schema<INutritionPlan>({
  batchRef: { type: Schema.Types.ObjectId, ref: 'Batch' },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: false },
  batchName: { type: String, required: true },
  feedType: { type: String, required: true },
  proteinPct: { type: Number, required: true },
  fatPct: { type: Number, required: true },
  fiberPct: { type: Number, required: true },
  dailyFeedKg: { type: Number, required: true },
  waterLitersPer100: { type: Number, required: true },
  scheduleAM: { type: String, default: '06:00 AM' },
  schedulePM: { type: String, default: '03:00 PM' },
  wastageFlag: { type: Boolean, default: false },
  wastagePct: { type: Number, default: 0 },
  aiRecommendation: { type: String, default: '' },
  weekNumber: { type: Number, default: 1 }
});

export default mongoose.model<INutritionPlan>('NutritionPlan', NutritionPlanSchema);
