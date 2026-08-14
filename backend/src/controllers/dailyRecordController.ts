import { Request, Response } from 'express';
import mongoose from 'mongoose';
import DailyFlockRecord from '../models/DailyFlockRecord';
import { recalculateAliveBirds } from '../services/batchService';

function getStartOfDay(d: string | Date): Date {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/** Safely extract a single-string param from Express (which types params as string | string[]) */
function getParam(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export async function getDailyRecords(req: Request, res: Response): Promise<void> {
  try {
    const batchId = getParam(req, 'batchId');
    const records = await DailyFlockRecord.find({ batchId: new mongoose.Types.ObjectId(batchId) }).sort({ flockDay: 1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving daily records' });
  }
}

export async function getDailyRecordById(req: Request, res: Response): Promise<void> {
  try {
    const recordId = getParam(req, 'recordId');
    const record = await DailyFlockRecord.findById(recordId);
    if (!record) {
      res.status(404).json({ error: 'Daily record not found' });
      return;
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving daily record' });
  }
}

export async function createDailyRecord(req: Request, res: Response): Promise<void> {
  try {
    const batchId = getParam(req, 'batchId');
    const {
      date,
      flockDay,
      feedConsumedKg,
      waterConsumedLiters,
      mortality,
      culls,
      averageWeightKg,
      sampleSize,
      temperatureC,
      humidityPct,
      ammoniaPpm,
      notes
    } = req.body;

    if (
      date === undefined ||
      flockDay === undefined ||
      feedConsumedKg === undefined ||
      waterConsumedLiters === undefined ||
      mortality === undefined ||
      culls === undefined ||
      averageWeightKg === undefined ||
      sampleSize === undefined ||
      temperatureC === undefined ||
      humidityPct === undefined ||
      ammoniaPpm === undefined
    ) {
      res.status(400).json({ error: 'Missing required daily record fields' });
      return;
    }

    const batchObjectId = new mongoose.Types.ObjectId(batchId);
    const startOfRecordDate = getStartOfDay(date);

    // Validation: Check for duplicates by date OR flockDay for this batch
    const duplicate = await DailyFlockRecord.findOne({
      batchId: batchObjectId,
      $or: [
        { date: startOfRecordDate },
        { flockDay }
      ]
    });

    if (duplicate) {
      const field = duplicate.flockDay === flockDay
        ? `flockDay ${flockDay}`
        : `date ${new Date(date).toISOString().split('T')[0]}`;
      res.status(409).json({ error: `A daily flock record already exists for this batch with ${field}` });
      return;
    }

    const newRecord = new DailyFlockRecord({
      batchId: batchObjectId,
      date: startOfRecordDate,
      flockDay,
      feedConsumedKg,
      waterConsumedLiters,
      mortality,
      culls,
      averageWeightKg,
      sampleSize,
      temperatureC,
      humidityPct,
      ammoniaPpm,
      notes
    });

    await newRecord.save();

    // Recalculate aliveBirds using sum-based approach (never incremental)
    await recalculateAliveBirds(batchId);

    res.status(201).json(newRecord);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid daily record data' });
  }
}

export async function updateDailyRecord(req: Request, res: Response): Promise<void> {
  try {
    const batchId = getParam(req, 'batchId');
    const recordId = getParam(req, 'recordId');

    const record = await DailyFlockRecord.findById(recordId);
    if (!record) {
      res.status(404).json({ error: 'Daily record not found' });
      return;
    }

    const batchObjectId = new mongoose.Types.ObjectId(batchId);
    const newDate = req.body.date ? getStartOfDay(req.body.date) : record.date;
    const newFlockDay = req.body.flockDay !== undefined ? req.body.flockDay : record.flockDay;

    // Check conflict if date or flockDay is changing
    if (newDate.getTime() !== record.date.getTime() || newFlockDay !== record.flockDay) {
      const conflict = await DailyFlockRecord.findOne({
        batchId: batchObjectId,
        _id: { $ne: new mongoose.Types.ObjectId(recordId) },
        $or: [
          { date: newDate },
          { flockDay: newFlockDay }
        ]
      });

      if (conflict) {
        const field = conflict.flockDay === newFlockDay
          ? `flockDay ${newFlockDay}`
          : `date ${newDate.toISOString().split('T')[0]}`;
        res.status(409).json({ error: `Cannot update: another daily flock record already exists with ${field}` });
        return;
      }
    }

    if (req.body.date) {
      req.body.date = getStartOfDay(req.body.date);
    }

    const updatedRecord = await DailyFlockRecord.findByIdAndUpdate(recordId, req.body, { new: true, runValidators: true });
    if (!updatedRecord) {
      res.status(404).json({ error: 'Daily record not found' });
      return;
    }

    // Recalculate aliveBirds using sum-based approach (never incremental)
    await recalculateAliveBirds(batchId);

    res.json(updatedRecord);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid update data' });
  }
}

export async function deleteDailyRecord(req: Request, res: Response): Promise<void> {
  try {
    const batchId = getParam(req, 'batchId');
    const recordId = getParam(req, 'recordId');

    const deletedRecord = await DailyFlockRecord.findByIdAndDelete(recordId);
    if (!deletedRecord) {
      res.status(404).json({ error: 'Daily record not found' });
      return;
    }

    // Recalculate aliveBirds using sum-based approach (never incremental)
    await recalculateAliveBirds(batchId);

    res.json({ message: 'Daily record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting record' });
  }
}
