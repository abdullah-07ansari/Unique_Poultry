import mongoose, { Schema, Document } from 'mongoose';

export interface IFarm extends Document {
  farmName: string;
  location: string;
  gpsLat: number;
  gpsLng: number;
  manager: string;
  shedCount: number;
  totalCapacity: number;
  status: 'active' | 'maintenance' | 'inactive';
  weatherZone: string;
  createdAt: Date;
  updatedAt: Date;
}

const FarmSchema = new Schema<IFarm>(
  {
    farmName: { type: String, required: true },
    location: { type: String, required: true },
    gpsLat: { type: Number, required: true },
    gpsLng: { type: Number, required: true },
    manager: { type: String, required: true },
    shedCount: { type: Number, default: 2 },
    totalCapacity: { type: Number, default: 10000 },
    status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
    weatherZone: { type: String, default: 'Tropical' }
  },
  { timestamps: true }
);

export default mongoose.model<IFarm>('Farm', FarmSchema);
