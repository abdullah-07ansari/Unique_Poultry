import { Router } from 'express';
import { getBatchHealthSummary, getHealthInspectionAssessment } from '../controllers/healthAssessmentController';

const router = Router({ mergeParams: true });

router.get('/batches/:batchId/health-summary', getBatchHealthSummary);
router.get('/health-inspections/:inspectionId/assessment', getHealthInspectionAssessment);

export default router;
