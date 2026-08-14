import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  severity: 'critical' | 'warning' | 'info';
  category: 'disease' | 'environment' | 'crowding' | 'mortality' | 'vaccine' | 'feed' | 'weather';
  title: string;
  message: string;
  farmId: string;
  farmName: string;
  shedId: string;
  batchId?: mongoose.Types.ObjectId;
  acknowledged: boolean;
  notifiedSMS: boolean;
  notifiedEmail: boolean;
  timestamp: Date;
}

const AlertSchema = new Schema<IAlert>({
  severity: { type: String, enum: ['critical', 'warning', 'info'], required: true },
  category: { type: String, enum: ['disease', 'environment', 'crowding', 'mortality', 'vaccine', 'feed', 'weather'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  farmId: { type: String, required: true },
  farmName: { type: String, required: true },
  shedId: { type: String, default: 'N/A' },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: false },
  acknowledged: { type: Boolean, default: false },
  notifiedSMS: { type: Boolean, default: false },
  notifiedEmail: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

// Indexes for Alert
AlertSchema.index({ batchId: 1 });
AlertSchema.index({ farmId: 1 });
AlertSchema.index({ acknowledged: 1 });

export default mongoose.model<IAlert>('Alert', AlertSchema);
