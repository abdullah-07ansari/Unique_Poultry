import { Router } from 'express';
import {
  getDailyRecords,
  getDailyRecordById,
  createDailyRecord,
  updateDailyRecord,
  deleteDailyRecord
} from '../controllers/dailyRecordController';

const router = Router({ mergeParams: true });

router.get('/', getDailyRecords);
router.post('/', createDailyRecord);
router.get('/:recordId', getDailyRecordById);
router.put('/:recordId', updateDailyRecord);
router.delete('/:recordId', deleteDailyRecord);

export default router;
