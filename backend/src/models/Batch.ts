import mongoose, { Schema, Document } from 'mongoose';

export interface IBatch extends Document {
  batchName: string;
  farmId?: mongoose.Types.ObjectId;
  shedId?: mongoose.Types.ObjectId;
  breed: string;
  placementDate: Date;
  initialBirds: number;
  aliveBirds: number;
  avgWeight: number;
  targetSaleWeightKg: number;
  targetFcr: number;
  targetSaleAgeDays: number;
  status: 'Active' | 'Sold';
  saleDate?: Date;
  soldBirds?: number;
  saleWeightKg?: number;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema: Schema = new Schema(
  {
    batchName: { type: String, required: true },
    farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: false },
    shedId: { type: Schema.Types.ObjectId, ref: 'Shed', required: false },
    breed: { type: String, default: 'Cobb 500' },
    placementDate: { type: Date, default: Date.now },
    initialBirds: { type: Number, required: true },
    aliveBirds: { type: Number, required: true },
    avgWeight: { type: Number, default: 0.05 },
    targetSaleWeightKg: { type: Number, default: 2.0 },
    targetFcr: { type: Number, default: 1.60 },
    targetSaleAgeDays: { type: Number, default: 35 },
    status: { type: String, enum: ['Active', 'Sold'], default: 'Active' },
    saleDate: { type: Date },
    soldBirds: { type: Number },
    saleWeightKg: { type: Number }
  },
  { timestamps: true }
);

export default mongoose.model<IBatch>('Batch', BatchSchema);
