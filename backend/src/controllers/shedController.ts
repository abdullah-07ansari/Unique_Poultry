import { Request, Response } from 'express';
import Shed from '../models/Shed';

export async function getSheds(req: Request, res: Response): Promise<void> {
  try {
    const { farmId } = req.query;
    const filter = farmId ? { farmId: farmId as string } : {};
    const sheds = await Shed.find(filter).sort({ createdAt: -1 });
    res.json(sheds);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving sheds' });
  }
}

export async function getShedById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const shed = await Shed.findById(id);
    if (!shed) {
      res.status(404).json({ error: 'Shed not found' });
      return;
    }
    res.json(shed);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving shed' });
  }
}

export async function createShed(req: Request, res: Response): Promise<void> {
  try {
    const { shedName, farmId, capacity, status } = req.body;
    if (!shedName || !farmId || !capacity) {
      res.status(400).json({ error: 'Missing required fields: shedName, farmId, capacity' });
      return;
    }
    const newShed = new Shed({ shedName, farmId, capacity, status });
    await newShed.save();
    res.status(201).json(newShed);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data or validation error' });
  }
}

export async function updateShed(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updatedShed = await Shed.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedShed) {
      res.status(404).json({ error: 'Shed not found' });
      return;
    }
    res.json(updatedShed);
  } catch (error) {
    res.status(400).json({ error: 'Invalid update data' });
  }
}
