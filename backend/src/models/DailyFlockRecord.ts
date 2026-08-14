import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyFlockRecord extends Document {
  batchId: mongoose.Types.ObjectId;
  /**
   * Calendar date of this observation (UTC midnight, one record per day per batch).
   */
  date: Date;
  /**
   * Age of the flock in days on this date (Day 1 = placement day).
   */
  flockDay: number;
  /**
   * DAILY total feed consumed by the entire flock that day, in kilograms.
   * Raw observation — never a cumulative total.
   */
  feedConsumedKg: number;
  /**
   * DAILY total water consumed by the entire flock that day, in liters.
   * Raw observation — never a cumulative total.
   */
  waterConsumedLiters: number;
  /**
   * Number of birds that DIED (of any cause) during this day only.
   * This is a DAILY count, NOT cumulative.
   * aliveBirds = initialBirds - SUM(all daily mortality) - SUM(all daily culls)
   */
  mortality: number;
  /**
   * Number of birds CULLED (removed alive, e.g. weak/sick) during this day only.
   * This is a DAILY count, NOT cumulative.
   */
  culls: number;
  /**
   * Average live body weight of a random sample of birds weighed that day, in kilograms.
   */
  averageWeightKg: number;
  /**
   * Number of birds actually weighed to produce averageWeightKg.
   */
  sampleSize: number;
  temperatureC: number;
  humidityPct: number;
  ammoniaPpm: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyFlockRecordSchema = new Schema<IDailyFlockRecord>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    date: { type: Date, required: true },
    flockDay: { type: Number, required: true, min: 1 },

    // --- Daily Feed & Water Observations ---
    feedConsumedKg: {
      type: Number, required: true,
      min: [0, 'Feed consumed cannot be negative'],
      comment: 'Total flock feed consumed during that day (kg). DAILY, not cumulative.'
    },
    waterConsumedLiters: {
      type: Number, required: true,
      min: [0, 'Water consumed cannot be negative'],
      comment: 'Total flock water consumed during that day (liters). DAILY, not cumulative.'
    },

    // --- Daily Loss Counts (always DAILY, never cumulative) ---
    mortality: {
      type: Number, required: true,
      min: [0, 'Mortality count cannot be negative'],
      comment: 'Birds that died during this day ONLY. DAILY count.'
    },
    culls: {
      type: Number, required: true,
      min: [0, 'Culls count cannot be negative'],
      comment: 'Birds removed alive (culled) during this day ONLY. DAILY count.'
    },

    // --- Weight Sampling ---
    averageWeightKg: {
      type: Number, required: true,
      min: [0, 'Average body weight cannot be negative'],
      comment: 'Average live body weight of sampled birds (kg).'
    },
    sampleSize: {
      type: Number, required: true,
      min: [0, 'Sample size cannot be negative'],
      comment: 'Number of birds weighed to produce averageWeightKg.'
    },

    // --- Environmental Observations ---
    temperatureC: { type: Number, required: true },
    humidityPct: { type: Number, required: true, min: 0, max: 100 },
    ammoniaPpm: {
      type: Number, required: true,
      min: [0, 'Ammonia level cannot be negative']
    },

    notes: { type: String }
  },
  { timestamps: true }
);

// Prevent duplicate records: one observation per batch per day, one per flockDay
DailyFlockRecordSchema.index({ batchId: 1, date: 1 }, { unique: true });
DailyFlockRecordSchema.index({ batchId: 1, flockDay: 1 }, { unique: true });

export default mongoose.model<IDailyFlockRecord>('DailyFlockRecord', DailyFlockRecordSchema);
