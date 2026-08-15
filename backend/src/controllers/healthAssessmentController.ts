import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Batch from '../models/Batch';
import HealthInspection from '../models/HealthInspection';
import { assessHealthInspection, summarizeBatchHealth } from '../services/healthAssessmentService';

function getParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

export async function getBatchHealthSummary(req: Request, res: Response): Promise<void> {
  try {
    const batchId = getParam(req, 'batchId');
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      res.status(400).json({ success: false, error: 'Invalid batchId' });
      return;
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }

    const summary = await summarizeBatchHealth(batchId);
    res.json({ success: true, summary });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }
    res.status(500).json({ success: false, error: error.message || 'Server error generating health summary' });
  }
}

export async function getHealthInspectionAssessment(req: Request, res: Response): Promise<void> {
  try {
    const inspectionId = getParam(req, 'inspectionId');
    if (!mongoose.Types.ObjectId.isValid(inspectionId)) {
      res.status(400).json({ success: false, error: 'Invalid inspectionId' });
      return;
    }

    const inspection = await HealthInspection.findById(inspectionId);
    if (!inspection) {
      res.status(404).json({ success: false, error: 'Health inspection not found' });
      return;
    }

    const batch = await Batch.findById(inspection.batchId);
    const assessment = assessHealthInspection(inspection.toObject(), batch?.toObject ? batch.toObject() : batch);
    res.json({ success: true, assessment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error generating health assessment' });
  }
}
