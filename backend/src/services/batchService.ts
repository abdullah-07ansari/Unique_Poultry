import Batch from '../models/Batch';
import DailyFlockRecord from '../models/DailyFlockRecord';

/**
 * Recalculates the number of alive birds in a batch based on its initial count
 * and the sum of daily mortality and culls from all its DailyFlockRecords.
 * Clamps the resulting value to a minimum of 0.
 *
 * @param batchId The ID of the batch to update
 */
export async function recalculateAliveBirds(batchId: string): Promise<number> {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  const records = await DailyFlockRecord.find({ batchId });
  const totalLosses = records.reduce((sum, r) => sum + (r.mortality || 0) + (r.culls || 0), 0);

  const updatedAlive = Math.max(0, batch.initialBirds - totalLosses);
  batch.aliveBirds = updatedAlive;
  await batch.save();

  return updatedAlive;
}
