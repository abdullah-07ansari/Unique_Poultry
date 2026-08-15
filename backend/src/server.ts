import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import Batch from './models/Batch';
import Expense from './models/Expense';
import Alert from './models/Alert';
import Farm from './models/Farm';
import NutritionPlan from './models/NutritionPlan';
import SensorReading from './models/SensorReading';
import Shed from './models/Shed';
import DailyFlockRecord from './models/DailyFlockRecord';

import shedRoutes from './routes/shedRoutes';
import dailyRecordRoutes from './routes/dailyRecordRoutes';
import healthInspectionRoutes from './routes/healthInspectionRoutes';
import { recalculateAliveBirds } from './services/batchService';
import { calculateFlockPerformance } from './services/performanceService';
import { getHealthInspectionById, analyzeHealthInspection } from './controllers/healthInspectionController';

const app = express();
app.use(cors());
app.use(express.json());

// Mount the new routes
app.use('/api/sheds', shedRoutes);
// Daily records are nested: /api/batches/:batchId/daily-records
app.use('/api/batches/:batchId/daily-records', dailyRecordRoutes);
app.use('/api/batches/:batchId/health-inspections', healthInspectionRoutes);
app.get('/api/health-inspections/:inspectionId', getHealthInspectionById);
app.post('/api/health-inspections/:inspectionId/analyze', analyzeHealthInspection);

// -----------------------------------------
// DATABASE CONNECTION (Stateless Mongoose)
// -----------------------------------------
let mongoServer: MongoMemoryServer;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Try environment MONGODB_URI
  if (uri) {
    try {
      console.log(`[⚡️] Attempting connection to MONGODB_URI from environment: ${uri}`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`[⚡️] Connected successfully to MONGODB_URI.`);
      return;
    } catch (error: any) {
      console.error(`[❌] MONGODB_URI connection failed: ${error.message}`);
      if (isProd) {
        console.error(`[🚨] FATAL: Production mode database connection failure. Exiting.`);
        process.exit(1);
      }
    }
  }

  // 2. Try default local MongoDB
  const defaultUri = 'mongodb://127.0.0.1:27017/poultrysense';
  try {
    console.log(`[⚡️] Attempting connection to default local MongoDB: ${defaultUri}`);
    await mongoose.connect(defaultUri, { serverSelectionTimeoutMS: 4000 });
    console.log(`[⚡️] Connected successfully to default local MongoDB.`);
    return;
  } catch (error: any) {
    console.error(`[❌] Default local MongoDB connection failed: ${error.message}`);
    if (isProd) {
      console.error(`[🚨] FATAL: Production mode database connection failure. Exiting.`);
      process.exit(1);
    }
  }

  // 3. Fallback to DEVELOPMENT-ONLY MongoMemoryServer if not in production
  console.log(`[⚠️] WARNING: Local persistent MongoDB not running.`);
  console.log(`[⚠️] Falling back to DEVELOPMENT-ONLY MongoMemoryServer. Data will NOT persist across restarts!`);
  mongoServer = await MongoMemoryServer.create();
  const memoryUri = mongoServer.getUri();
  await mongoose.connect(memoryUri);
  console.log(`[⚡️] MongoMemoryServer (Memory DB) connected: ${memoryUri}`);
}

async function seedDatabase() {
  const farmCount = await Farm.countDocuments();
  if (farmCount > 0) {
    console.log('[⚡️] Database already seeded. Skipping seeding.');
    return;
  }

  console.log('[🌱] Seeding database...');

  // ---- SEED: FARMS ----
  const farm1 = await Farm.create({
    farmName: 'Unique Poultry Farm — Nashik Unit',
    location: 'Nashik, Maharashtra',
    gpsLat: 19.9975,
    gpsLng: 73.7898,
    manager: 'Ramesh Patil',
    shedCount: 4,
    totalCapacity: 20000,
    status: 'active',
    weatherZone: 'Semi-Arid Tropics'
  });

  const shagunaFarm = await Farm.create({
    farmName: 'Shaguna Demo Farm',
    location: 'Karjat, Maharashtra',
    gpsLat: 18.9102,
    gpsLng: 73.3284,
    manager: 'Sanjay Shinde',
    shedCount: 3,
    totalCapacity: 15000,
    status: 'active',
    weatherZone: 'Tropical Monsoon'
  });

  await Farm.create({
    farmName: 'Green Valley Farm — Pune Unit',
    location: 'Pune, Maharashtra',
    gpsLat: 18.5204,
    gpsLng: 73.8567,
    manager: 'Sunita Kadam',
    shedCount: 3,
    totalCapacity: 15000,
    status: 'active',
    weatherZone: 'Tropical Humid'
  });

  await Farm.create({
    farmName: 'Agro Star Farm — Aurangabad',
    location: 'Aurangabad, Maharashtra',
    gpsLat: 19.8762,
    gpsLng: 75.3433,
    manager: 'Vijay Shinde',
    shedCount: 2,
    totalCapacity: 8000,
    status: 'maintenance',
    weatherZone: 'Semi-Arid'
  });

  // ---- SEED: SHEDS ----
  const shedA = await Shed.create({
    shedName: 'Shed-A',
    farmId: farm1._id,
    capacity: 5000,
    status: 'Active'
  });
  const shedB = await Shed.create({
    shedName: 'Shed-B',
    farmId: farm1._id,
    capacity: 5000,
    status: 'Active'
  });
  const shedC = await Shed.create({
    shedName: 'Shed-C',
    farmId: farm1._id,
    capacity: 5000,
    status: 'Active'
  });
  const shedD = await Shed.create({
    shedName: 'Shed-D',
    farmId: farm1._id,
    capacity: 5000,
    status: 'Active'
  });

  const shagunaShed1 = await Shed.create({
    shedName: 'Shed 01',
    farmId: shagunaFarm._id,
    capacity: 10000,
    status: 'Active'
  });

  // ---- SEED: BATCHES ----
  const b1 = await Batch.create({
    batchName: 'Batch 01 (Shed A)',
    initialBirds: 5000,
    aliveBirds: 4920,
    avgWeight: 1.8,
    farmId: farm1._id,
    shedId: shedA._id,
    breed: 'Cobb 500',
    targetSaleWeightKg: 2.2,
    targetFcr: 1.55,
    targetSaleAgeDays: 42,
    status: 'Active'
  });

  const b2 = await Batch.create({
    batchName: 'Batch 02 (Shed B)',
    initialBirds: 5000,
    aliveBirds: 4980,
    avgWeight: 0.45,
    farmId: farm1._id,
    shedId: shedB._id,
    breed: 'Ross 308',
    targetSaleWeightKg: 2.1,
    targetFcr: 1.62,
    targetSaleAgeDays: 38,
    status: 'Active'
  });

  const b3 = await Batch.create({
    batchName: 'Batch 03 (Shed C)',
    initialBirds: 4800,
    aliveBirds: 4750,
    avgWeight: 1.2,
    farmId: farm1._id,
    shedId: shedC._id,
    breed: 'Cobb 500',
    targetSaleWeightKg: 2.2,
    targetFcr: 1.58,
    targetSaleAgeDays: 40,
    status: 'Active'
  });

  const b4 = await Batch.create({
    batchName: 'Batch 04 (Shed D)',
    initialBirds: 3000,
    aliveBirds: 2990,
    avgWeight: 0.08,
    farmId: farm1._id,
    shedId: shedD._id,
    breed: 'Cobb 500',
    targetSaleWeightKg: 2.0,
    targetFcr: 1.60,
    targetSaleAgeDays: 35,
    status: 'Active'
  });

  const placementDate = new Date();
  placementDate.setDate(placementDate.getDate() - 21); // Placed 21 days ago
  placementDate.setUTCHours(0,0,0,0);

  const ps001 = await Batch.create({
    batchName: 'PS-001',
    initialBirds: 10000,
    aliveBirds: 10000,
    avgWeight: 1.05,
    farmId: shagunaFarm._id,
    shedId: shagunaShed1._id,
    breed: 'Cobb 500',
    placementDate: placementDate,
    targetSaleWeightKg: 2.0,
    targetFcr: 1.60,
    targetSaleAgeDays: 35,
    status: 'Active'
  });

  // ---- SEED: EXPENSES ----
  await Expense.create({ category: 'Feed', amount: 18000, batchRef: b1._id });
  await Expense.create({ category: 'Medicine', amount: 2400, batchRef: b1._id });
  await Expense.create({ category: 'Feed', amount: 21000, batchRef: b2._id });
  await Expense.create({ category: 'Labor', amount: 6500, batchRef: b1._id });
  await Expense.create({ category: 'Electricity', amount: 3200, batchRef: b1._id });
  await Expense.create({ category: 'Equipment', amount: 4500, batchRef: b2._id });
  await Expense.create({ category: 'Vaccination', amount: 1800, batchRef: b1._id });

  // ---- SEED: ALERTS ----
  await Alert.create({ severity: 'critical', category: 'disease', title: 'Coccidiosis Detected', message: 'YOLOv8 + gait analysis suggests early-stage Coccidiosis in Shed A (Sector C). Recommend immediate Amprolium 20% treatment.', farmId: farm1._id.toString(), farmName: 'Nashik Unit', shedId: 'Shed-A', batchId: b1._id, notifiedSMS: true, notifiedEmail: true, timestamp: new Date(Date.now() - 1000 * 60 * 14) });
  await Alert.create({ severity: 'critical', category: 'environment', title: 'High Temperature Alert', message: 'Shed B temperature has exceeded 36°C for 12+ minutes. Auto-fan override initiated. Check ventilation units.', farmId: farm1._id.toString(), farmName: 'Nashik Unit', shedId: 'Shed-B', batchId: b2._id, notifiedSMS: true, notifiedEmail: false, timestamp: new Date(Date.now() - 1000 * 60 * 32) });
  await Alert.create({ severity: 'warning', category: 'crowding', title: 'Crowding Anomaly Detected', message: 'Computer vision detected bird density of 18 birds/m² in Sector C (threshold: 15). Suggest redistribution.', farmId: farm1._id.toString(), farmName: 'Nashik Unit', shedId: 'Shed-C', batchId: b3._id, notifiedSMS: false, notifiedEmail: true, timestamp: new Date(Date.now() - 1000 * 60 * 58) });
  await Alert.create({ severity: 'warning', category: 'feed', title: 'Feed Wastage Detected', message: 'Load cell sensors show 18% feed wastage in Shed A feeder line 2. AI suggests adjusting feeder height from 8cm to 6cm.', farmId: farm1._id.toString(), farmName: 'Nashik Unit', shedId: 'Shed-A', batchId: b1._id, notifiedSMS: false, notifiedEmail: false, timestamp: new Date(Date.now() - 1000 * 60 * 90) });
  await Alert.create({ severity: 'info', category: 'vaccine', title: 'Vaccination Due — Batch 02', message: 'Newcastle Disease vaccine (Lasota strain) is due for Batch 02 on Day 18. Schedule vet visit.', farmId: farm1._id.toString(), farmName: 'Nashik Unit', shedId: 'Shed-B', batchId: b2._id, notifiedSMS: false, notifiedEmail: true, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) });
  await Alert.create({ severity: 'info', category: 'weather', title: 'Storm Warning — Adjust Ventilation', message: 'IMD forecast: Heavy rain & drop to 18°C expected tonight. Pre-adjust curtains & heating elements.', farmId: farm1._id.toString(), farmName: 'Nashik Unit', shedId: 'All Sheds', notifiedSMS: true, notifiedEmail: true, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) });
  await Alert.create({ severity: 'warning', category: 'mortality', title: 'Mortality Spike — Batch 03', message: 'Mortality rate in Batch 03 is 1.2% (above 0.5% threshold). AI predicts further 0.8% risk if action not taken.', farmId: farm1._id.toString(), farmName: 'Nashik Unit', shedId: 'Shed-C', batchId: b3._id, notifiedSMS: true, notifiedEmail: true, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7) });

  // ---- SEED: NUTRITION PLANS ----
  await NutritionPlan.create({ batchRef: b1._id, batchId: b1._id, batchName: 'Batch 01 (Shed A)', feedType: 'Growout Finisher Pro', proteinPct: 20, fatPct: 6, fiberPct: 4, dailyFeedKg: 420, waterLitersPer100: 18, scheduleAM: '05:30 AM', schedulePM: '02:30 PM', wastageFlag: true, wastagePct: 18, aiRecommendation: 'Reduce feeder height by 2cm. Switch to nipple drinkers. Expected savings: ₹800/day.', weekNumber: 5 });
  await NutritionPlan.create({ batchRef: b2._id, batchId: b2._id, batchName: 'Batch 02 (Shed B)', feedType: 'Starter Chick Boost', proteinPct: 24, fatPct: 5, fiberPct: 3, dailyFeedKg: 180, waterLitersPer100: 22, scheduleAM: '06:00 AM', schedulePM: '03:00 PM', wastageFlag: false, wastagePct: 4, aiRecommendation: 'Increase protein to 26% from Day 14 to accelerate frame growth. Add Vitamin C supplement.', weekNumber: 2 });

  // ---- SEED: SENSOR READINGS ----
  const primaryFarmId = farm1._id.toString();
  const shedsList = ['Shed-A', 'Shed-B', 'Shed-C', 'Shed-D'];
  const batchesList = [b1._id, b2._id, b3._id, b4._id];
  for (let i = 0; i < shedsList.length; i++) {
    await SensorReading.create({
      farmId: primaryFarmId, farmName: 'Nashik Unit', shedId: shedsList[i], batchId: batchesList[i],
      temperature: 28 + Math.random() * 8,
      humidity: 55 + Math.random() * 25,
      ammonia: 8 + Math.random() * 22,
      waterLevel: 40 + Math.random() * 55,
      lux: 100 + Math.random() * 400,
      co2: 400 + Math.random() * 600,
      birdDensity: 10 + Math.random() * 8,
      timestamp: new Date()
    });
  }

  // ---- SEED: DAILY RECORDS FOR PS-001 (With Day 11-15 Heat Stress Anomaly) ----
  const recordsData = [
    // Week 1 (Days 1 - 7): Brooding Phase
    { day: 1,  weight: 0.05, feed: 180,  water: 360,  mort: 3, culls: 0, temp: 32.0, hum: 60, nh3: 1.0, notes: 'Chicks placed. Healthy start.' },
    { day: 2,  weight: 0.07, feed: 200,  water: 400,  mort: 2, culls: 0, temp: 32.0, hum: 60, nh3: 1.0 },
    { day: 3,  weight: 0.09, feed: 220,  water: 440,  mort: 1, culls: 0, temp: 31.5, hum: 60, nh3: 1.2 },
    { day: 4,  weight: 0.11, feed: 250,  water: 500,  mort: 1, culls: 0, temp: 31.0, hum: 61, nh3: 1.5 },
    { day: 5,  weight: 0.13, feed: 280,  water: 560,  mort: 0, culls: 0, temp: 30.5, hum: 61, nh3: 1.5 },
    { day: 6,  weight: 0.16, feed: 310,  water: 620,  mort: 1, culls: 0, temp: 30.0, hum: 62, nh3: 1.8 },
    { day: 7,  weight: 0.19, feed: 350,  water: 700,  mort: 0, culls: 0, temp: 29.5, hum: 62, nh3: 2.0, notes: 'Day 7 check. Brooding temp target reached.' },

    // Week 2 (Days 8 - 10): Standard Growth
    { day: 8,  weight: 0.23, feed: 390,  water: 780,  mort: 1, culls: 0, temp: 29.0, hum: 63, nh3: 2.5 },
    { day: 9,  weight: 0.28, feed: 440,  water: 880,  mort: 0, culls: 0, temp: 28.5, hum: 63, nh3: 2.8 },
    { day: 10, weight: 0.33, feed: 500,  water: 1000, mort: 1, culls: 1, temp: 28.0, hum: 64, nh3: 3.0 },

    // Days 11 - 15: Heat Stress Anomaly (Exhaust Fan Failure)
    { day: 11, weight: 0.36, feed: 420,  water: 1450, mort: 6, culls: 1, temp: 34.2, hum: 75, nh3: 5.0, notes: 'Exhaust fan failure in Shed 01 sector B.' },
    { day: 12, weight: 0.38, feed: 390,  water: 1580, mort: 8, culls: 2, temp: 34.8, hum: 78, nh3: 7.0, notes: 'Heat stress signs: panting observed.' },
    { day: 13, weight: 0.41, feed: 410,  water: 1520, mort: 7, culls: 1, temp: 34.5, hum: 76, nh3: 8.0 },
    { day: 14, weight: 0.45, feed: 440,  water: 1480, mort: 5, culls: 0, temp: 34.1, hum: 74, nh3: 9.0, notes: 'Contractor replacing fan motor.' },
    { day: 15, weight: 0.49, feed: 480,  water: 1400, mort: 6, culls: 1, temp: 33.8, hum: 72, nh3: 10.0 },

    // Week 3 (Days 16 - 21): Recovery Phase
    { day: 16, weight: 0.58, feed: 780,  water: 1400, mort: 1, culls: 0, temp: 26.5, hum: 65, nh3: 4.0, notes: 'Fan motor replaced. Temp restored to normal.' },
    { day: 17, weight: 0.67, feed: 840,  water: 1510, mort: 0, culls: 0, temp: 26.0, hum: 64, nh3: 4.5 },
    { day: 18, weight: 0.77, feed: 900,  water: 1620, mort: 1, culls: 0, temp: 25.5, hum: 63, nh3: 5.0 },
    { day: 19, weight: 0.88, feed: 960,  water: 1730, mort: 0, culls: 0, temp: 25.0, hum: 63, nh3: 5.0 },
    { day: 20, weight: 0.99, feed: 1030, water: 1850, mort: 1, culls: 0, temp: 24.5, hum: 62, nh3: 5.5 },
    { day: 21, weight: 1.05, feed: 1100, water: 1980, mort: 0, culls: 0, temp: 24.0, hum: 62, nh3: 6.0, notes: 'Flock recovered, feed intake back on track.' }
  ];

  for (const r of recordsData) {
    const recordDate = new Date(placementDate);
    recordDate.setDate(recordDate.getDate() + (r.day - 1));
    recordDate.setUTCHours(0, 0, 0, 0);

    await DailyFlockRecord.create({
      batchId: ps001._id,
      date: recordDate,
      flockDay: r.day,
      feedConsumedKg: r.feed,
      waterConsumedLiters: r.water,
      mortality: r.mort,
      culls: r.culls,
      averageWeightKg: r.weight,
      sampleSize: 100,
      temperatureC: r.temp,
      humidityPct: r.hum,
      ammoniaPpm: r.nh3,
      notes: r.notes
    });
  }

  // Recalculate aliveBirds for PS-001 based on newly seeded daily logs
  await recalculateAliveBirds(ps001._id.toString());

  console.log('[🌱] Seeding finished successfully.');
}

// ===========================================
// API ROUTES
// ===========================================

// --- Batches ---
app.get('/api/batches', async (req: Request, res: Response) => {
  try { res.json(await Batch.find().sort({ createdAt: -1 })); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/batches', async (req: Request, res: Response) => {
  try {
    const {
      batchName,
      initialBirds,
      farmId,
      shedId,
      breed,
      placementDate,
      targetSaleWeightKg,
      targetFcr,
      targetSaleAgeDays
    } = req.body;

    if (!batchName || initialBirds === undefined) {
      res.status(400).json({ error: 'Missing required fields: batchName, initialBirds' });
      return;
    }

    const newBatch = new Batch({
      batchName,
      initialBirds,
      aliveBirds: initialBirds,
      avgWeight: 0.05,
      farmId: farmId || undefined,
      shedId: shedId || undefined,
      breed: breed || 'Cobb 500',
      placementDate: placementDate ? new Date(placementDate) : new Date(),
      targetSaleWeightKg: targetSaleWeightKg !== undefined ? Number(targetSaleWeightKg) : 2.0,
      targetFcr: targetFcr !== undefined ? Number(targetFcr) : 1.60,
      targetSaleAgeDays: targetSaleAgeDays !== undefined ? Number(targetSaleAgeDays) : 35,
      status: 'Active'
    });

    await newBatch.save();
    res.status(201).json(newBatch);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid batch data' });
  }
});

app.get('/api/batches/:batchId/performance', async (req: Request, res: Response) => {
  try {
    const batchId = Array.isArray(req.params.batchId) ? req.params.batchId[0] : req.params.batchId;
    const performance = await calculateFlockPerformance(batchId);
    res.json({ success: true, performance });
  } catch (error: any) {
    if (error?.statusCode === 404 || /batch not found/i.test(error?.message || '')) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }
    console.error('Failed to calculate flock performance', error);
    res.status(500).json({ success: false, error: 'Server error calculating performance' });
  }
});

// --- Expenses ---
app.get('/api/expenses', async (req: Request, res: Response) => {
  try { res.json(await Expense.find().sort({ date: -1 })); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  try {
    const { category, amount } = req.body;
    const newExpense = new Expense({ category, amount });
    await newExpense.save();
    res.status(201).json(newExpense);
  } catch { res.status(400).json({ error: 'Invalid data' }); }
});

// --- Dashboard Aggregation ---
app.get('/api/dashboard', async (req: Request, res: Response) => {
  try {
    const birdsAgg = await Batch.aggregate([{ $group: { _id: null, totalAlive: { $sum: '$aliveBirds' }, count: { $sum: 1 } } }]);
    const expensesAgg = await Expense.aggregate([{ $group: { _id: null, totalCost: { $sum: '$amount' } } }]);
    const weightAgg = await Batch.aggregate([{ $group: { _id: null, avgOverallWeight: { $avg: '$avgWeight' } } }]);
    const alertCount = await Alert.countDocuments({ acknowledged: false });
    const totalBirds = birdsAgg[0]?.totalAlive || 0;
    const totalCost = expensesAgg[0]?.totalCost || 0;
    const avgWeight = weightAgg[0]?.avgOverallWeight || 0;
    res.json({
      totalBirds,
      totalCost,
      avgWeight: Number(avgWeight.toFixed(2)),
      costPerBird: totalBirds > 0 ? Number((totalCost / totalBirds).toFixed(2)) : 0,
      unacknowledgedAlerts: alertCount,
      activeBatches: birdsAgg[0]?.count || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to aggregate metrics' });
  }
});

// --- Alerts ---
app.get('/api/alerts', async (req: Request, res: Response) => {
  try { res.json(await Alert.find().sort({ timestamp: -1 })); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { acknowledged: true }, { new: true });
    res.json(alert);
  } catch { res.status(500).json({ error: 'Update failed' }); }
});

// --- Farms ---
app.get('/api/farms', async (req: Request, res: Response) => {
  try { res.json(await Farm.find().sort({ createdAt: -1 })); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/farms', async (req: Request, res: Response) => {
  try {
    const farm = new Farm(req.body);
    await farm.save();
    res.status(201).json(farm);
  } catch { res.status(400).json({ error: 'Invalid farm data' }); }
});

// --- Nutrition Plans ---
app.get('/api/nutrition', async (req: Request, res: Response) => {
  try { res.json(await NutritionPlan.find()); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

// --- Sensor Readings (most recent per shed) ---
app.get('/api/sensors', async (req: Request, res: Response) => {
  try {
    const readings = await SensorReading.find().sort({ timestamp: -1 }).limit(20);
    res.json(readings);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// --- Growth Predictions (computed) ---
app.get('/api/growth', async (req: Request, res: Response) => {
  try {
    const batches = await Batch.find();
    const growthData = batches.map(b => {
      const dayAge = Math.floor((Date.now() - b.createdAt.getTime()) / 86400000) + 1;
      const targetWeight = b.targetSaleWeightKg || 2.0;
      const predictedDaysToHarvest = Math.max(0, Math.ceil((targetWeight - b.avgWeight) / 0.065));
      const mortalityRate = Number(((b.initialBirds - b.aliveBirds) / b.initialBirds * 100).toFixed(2));
      const fcr = b.targetFcr || 1.60; // Step 2 Rule: Do not randomize FCR or perform new predictive logic using Math.random
      const projectedRevenue = Math.round(b.aliveBirds * targetWeight * 102);
      return {
        batchName: b.batchName,
        currentWeight: b.avgWeight,
        dayAge,
        predictedDaysToHarvest,
        mortalityRate,
        fcr,
        projectedRevenue,
        growthCurve: Array.from({ length: 7 }, (_, i) => ({
          day: `Day ${dayAge - 6 + i}`,
          weight: Number(Math.max(0.05, b.avgWeight - 0.065 * (6 - i)).toFixed(2)),
          target: Number(Math.max(0.05, 0.05 + 0.065 * (dayAge - 6 + i)).toFixed(2))
        }))
      };
    });
    res.json(growthData);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// --- Weather (Mock IMD API) ---
app.get('/api/weather', async (req: Request, res: Response) => {
  res.json({
    location: 'Nashik, MH',
    provider: 'AccuWeather',
    current: {
      temp: 30, // Removed Math.random() for deterministic fallback/weather stability
      realFeel: 32,
      humidity: 60,
      condition: 'Partly Sunny',
      uvIndex: 'High',
      windKmh: 14
    },
    forecast: [
      { day: 'Today', high: 34, low: 22, condition: 'Sunny', recommendation: 'Increase cooling. Ensure water is refilled every 4 hours.' },
      { day: 'Tomorrow', high: 28, low: 19, condition: 'Rainy', recommendation: 'Close curtains. Check heaters. Expect humidity spike.' },
      { day: 'Day 3', high: 25, low: 17, condition: 'Stormy', recommendation: 'Emergency curtain check. Pre-activate backup generator.' }
    ]
  });
});

// --- Voice Command (Mock NLP processor) ---
app.post('/api/voice-command', async (req: Request, res: Response) => {
  const { text, lang } = req.body;
  const lowerText = (text || '').toLowerCase();

  let response = 'Command not recognized. Please try: "show alerts", "batch status", "feed schedule", or "temperature".';

  if (lowerText.includes('alert') || lowerText.includes('अलर्ट')) {
    const count = await Alert.countDocuments({ acknowledged: false });
    response = `आपके पास ${count} unacknowledged alerts हैं. Highest priority: Coccidiosis in Shed A.`;
  } else if (lowerText.includes('temperature') || lowerText.includes('temp') || lowerText.includes('तापमान')) {
    response = 'Current temperature: Shed A 29.5°C ✓, Shed B 36.1°C ⚠️ HIGH — auto-fan override active.';
  } else if (lowerText.includes('batch') || lowerText.includes('बैच')) {
    const count = await Batch.countDocuments();
    response = `You have ${count} active batches. Total ${await Batch.aggregate([{ $group: { _id: null, total: { $sum: '$aliveBirds' } } }]).then(r => r[0]?.total || 0)} alive birds.`;
  } else if (lowerText.includes('feed') || lowerText.includes('खाना') || lowerText.includes('चारा')) {
    response = 'Next feeding: 02:30 PM (Batch 01 Finisher Pro, 420kg). Wastage alert active on feeder line 2.';
  } else if (lowerText.includes('profit') || lowerText.includes('revenue') || lowerText.includes('मुनाफा')) {
    response = 'Projected profit for Batch 01: ₹91,200. Best sell day predicted: Day 37 (in 3 days).';
  }

  res.json({ response, lang: lang || 'en', timestamp: new Date() });
});

// Start Server
const PORT = 5000;
connectDB()
  .then(() => seedDatabase())
  .then(() => {
    app.listen(PORT, () => console.log(`[🚀] Poultry AI Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Failed to start server:', err);
  });
