import mongoose, { Schema, Document } from 'mongoose';

export interface IShed extends Document {
  shedName: string;
  farmId: mongoose.Types.ObjectId;
  capacity: number;
  status: 'Active' | 'Inactive' | 'Maintenance';
  createdAt: Date;
  updatedAt: Date;
}

const ShedSchema = new Schema<IShed>(
  {
    shedName: { type: String, required: true },
    farmId: { type: Schema.Types.ObjectId, ref: 'Farm', required: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ['Active', 'Inactive', 'Maintenance'], default: 'Active' }
  },
  { timestamps: true }
);

export default mongoose.model<IShed>('Shed', ShedSchema);
