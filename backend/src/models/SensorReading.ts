import mongoose, { Schema, Document } from 'mongoose';

export interface ISensorReading extends Document {
  farmId: string;
  farmName: string;
  shedId: string;
  batchId?: mongoose.Types.ObjectId;
  temperature: number;
  humidity: number;
  ammonia: number;      // ppm
  waterLevel: number;   // % full
  lux: number;          // light intensity
  co2: number;          // ppm
  birdDensity: number;  // birds/m2
  timestamp: Date;
}

const SensorReadingSchema = new Schema<ISensorReading>({
  farmId: { type: String, required: true },
  farmName: { type: String, required: true },
  shedId: { type: String, required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: false },
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  ammonia: { type: Number, required: true },
  waterLevel: { type: Number, required: true },
  lux: { type: Number, required: true },
  co2: { type: Number, required: true },
  birdDensity: { type: Number, default: 12 },
  timestamp: { type: Date, default: Date.now }
});

// Indexes for SensorReading
SensorReadingSchema.index({ batchId: 1, timestamp: -1 });
SensorReadingSchema.index({ farmId: 1, shedId: 1, timestamp: -1 });

export default mongoose.model<ISensorReading>('SensorReading', SensorReadingSchema);
