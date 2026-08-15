import { Router } from 'express';
import {
  createHealthInspection,
  getHealthInspections,
  analyzeHealthInspection
} from '../controllers/healthInspectionController';

const router = Router({ mergeParams: true });

router.get('/', getHealthInspections);
router.post('/', createHealthInspection);
router.post('/:inspectionId/analyze', analyzeHealthInspection);

export default router;
