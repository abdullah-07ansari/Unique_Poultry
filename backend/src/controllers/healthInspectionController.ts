import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Batch from '../models/Batch';
import HealthInspection from '../models/HealthInspection';
import { runPlaceholderAiInspection } from '../services/aiInspectionService';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function getParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeImageReference(imageReference: string): string {
  return imageReference.trim();
}

function validateImageReference(imageReference: string): string | null {
  const normalized = normalizeImageReference(imageReference);
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
  if (!hasAllowedExt) {
    return null;
  }

  return normalized;
}

export async function createHealthInspection(req: Request, res: Response): Promise<void> {
  try {
    const batchId = getParam(req, 'batchId');
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      res.status(400).json({ error: 'Invalid batchId' });
      return;
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const { inspectionDate, flockDay, imageReference, notes } = req.body ?? {};
    if (!inspectionDate || flockDay === undefined || !imageReference) {
      res.status(400).json({ error: 'inspectionDate, flockDay, and imageReference are required' });
      return;
    }

    const parsedDate = new Date(inspectionDate);
    if (Number.isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: 'inspectionDate must be a valid date' });
      return;
    }

    const validatedImageReference = validateImageReference(imageReference);
    if (!validatedImageReference) {
      res.status(400).json({ error: 'imageReference must be a valid image path or filename (.jpg, .jpeg, .png, .webp)' });
      return;
    }

    const numericFlockDay = Number(flockDay);
    if (!Number.isFinite(numericFlockDay) || numericFlockDay < 1) {
      res.status(400).json({ error: 'flockDay must be a positive number' });
      return;
    }

    const inspection = new HealthInspection({
      batchId: new mongoose.Types.ObjectId(batchId),
      inspectionDate: parsedDate,
      flockDay: numericFlockDay,
      imageReference: validatedImageReference,
      inspectionStatus: 'pending',
      aiModelStatus: 'NOT_RUN',
      confidence: null,
      detectedConditions: [],
      notes: notes ?? '',
      result: {
        status: 'NOT_RUN',
        confidence: null,
        detections: [],
        message: null
      }
    });

    await inspection.save();
    res.status(201).json(inspection);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid health inspection payload' });
  }
}

export async function getHealthInspections(req: Request, res: Response): Promise<void> {
  try {
    const batchId = getParam(req, 'batchId');
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      res.status(400).json({ error: 'Invalid batchId' });
      return;
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const inspections = await HealthInspection.find({ batchId: new mongoose.Types.ObjectId(batchId) }).sort({ inspectionDate: -1, createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving health inspections' });
  }
}

export async function getHealthInspectionById(req: Request, res: Response): Promise<void> {
  try {
    const inspectionId = getParam(req, 'inspectionId');
    if (!mongoose.Types.ObjectId.isValid(inspectionId)) {
      res.status(400).json({ error: 'Invalid inspectionId' });
      return;
    }

    const inspection = await HealthInspection.findById(inspectionId);
    if (!inspection) {
      res.status(404).json({ error: 'Health inspection not found' });
      return;
    }

    res.json(inspection);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving health inspection' });
  }
}

export async function analyzeHealthInspection(req: Request, res: Response): Promise<void> {
  try {
    const inspectionId = getParam(req, 'inspectionId');
    if (!mongoose.Types.ObjectId.isValid(inspectionId)) {
      res.status(400).json({ error: 'Invalid inspectionId' });
      return;
    }

    const inspection = await HealthInspection.findById(inspectionId);
    if (!inspection) {
      res.status(404).json({ error: 'Health inspection not found' });
      return;
    }

    const batch = await Batch.findById(inspection.batchId);
    if (!batch) {
      res.status(404).json({ error: 'Inspection batch not found' });
      return;
    }

    const result = await runPlaceholderAiInspection();

    inspection.aiModelStatus = result.status;
    inspection.confidence = result.confidence;
    inspection.detectedConditions = result.detections.map(d => d.className);
    inspection.result = result;
    inspection.inspectionStatus = result.status === 'ERROR' ? 'error' : result.status === 'LOW_CONFIDENCE' ? 'needs_review' : 'completed';
    inspection.notes = inspection.notes || result.message || '';

    await inspection.save();
    res.json({ success: true, inspection });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error analyzing health inspection' });
  }
}

export function validateImageFile(file: File | null): string | null {
  if (!file) {
    return null;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPG, PNG, and WEBP images are supported.';
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image size must be 10MB or less.';
  }

  return file.name;
}
