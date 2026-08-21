# 🐔 PoultrySense AI

> An intelligent poultry farm management platform for flock monitoring, performance analysis, health inspection, nutrition tracking, and farm-level decision support.

PoultrySense AI is a full-stack poultry farm management system designed to bring day-to-day flock operations, performance analytics, health inspection, nutrition, weather context, and future AI-powered disease detection into a single platform.

The project is being developed with a focus on **practical poultry-farm workflows, reliable calculations, explainable data, and modular AI integration**.

---

## 🚀 Current Project Status

### Core platform

| Module | Status |
|---|---|
| Batch / Flock Management | ✅ Implemented |
| Batch Editing | ✅ Implemented |
| Daily Flock Records | ✅ Implemented |
| Mortality & Culls | ✅ Implemented |
| Feed & Water Tracking | ✅ Implemented |
| FCR / Performance Engine | ✅ Implemented |
| Dashboard | ✅ Implemented |
| Growth Analytics | ✅ Implemented |
| Health Inspection | ✅ Implemented |
| Health Taxonomy | ✅ Implemented |
| Nutrition | ✅ Implemented |
| Farm & Shed Management | ✅ Implemented |
| Farm-aware Weather | ✅ Implemented |
| Error Validation | ✅ Hardened |
| Automated Backend Tests | ✅ 42 tests passing |
| Backend TypeScript | ✅ Passing |
| Frontend TypeScript | ✅ Passing |
| AI Disease Detection | ⏸️ Deferred |
| Kaggle ML Dataset | ⏸️ Deferred |
| Model Training | ⏸️ Deferred |
| Real-time Weather API | ⏸️ Not integrated |
| Browser `//` validation issue | 🔎 Under investigation |

---

# 🏗️ Architecture

PoultrySense follows a full-stack architecture:

```text
┌──────────────────────────────────────────────┐
│                 React Frontend               │
│                  Vite + TS                   │
│                                              │
│  Dashboard │ Batch │ Growth │ Health        │
│  Nutrition │ Mortality │ Weather │ Analytics │
└──────────────────────┬───────────────────────┘
                       │ REST API
                       ▼
┌──────────────────────────────────────────────┐
│              Node.js Backend                 │
│             Express + TypeScript             │
│                                              │
│ Controllers │ Services │ Validation │ Routes │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                   MongoDB                    │
│                 Mongoose                     │
│                                              │
│ Batch │ DailyFlockRecord │ Farm │ Shed       │
│ Health Inspection │ Nutrition                │
└──────────────────────────────────────────────┘
                       │
                       │ Future
                       ▼
┌──────────────────────────────────────────────┐
│               AI / ML Layer                  │
│          MobileNetV3Small + TFJS             │
│                                              │
│ Dropping/Fecal Matter Disease Detection     │
│ Healthy │ Coccidiosis │ Salmonella │         │
│ Newcastle                                    │
└──────────────────────────────────────────────┘
