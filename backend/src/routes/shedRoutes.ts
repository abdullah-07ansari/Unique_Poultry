import { Router } from 'express';
import { getSheds, getShedById, createShed, updateShed } from '../controllers/shedController';

const router = Router();

router.get('/', getSheds);
router.post('/', createShed);
router.get('/:id', getShedById);
router.put('/:id', updateShed);

export default router;
