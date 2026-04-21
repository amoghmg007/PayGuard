# PayGuard — Autonomous Fraud Recovery OS

PayGuard is a production-grade orchestration engine designed to automate forensic data extraction, risk severity analysis, and standardized legal dispute generation for financial fraud scenarios. It transforms chaotic evidence into actionable intelligence.

## System Architecture

PayGuard operates on a completely decoupled microservice architecture:
- **Frontend (Vite + React)**: A state-driven, dynamic user interface built with Framer Motion, tailwind utility wrappers, and responsive execution matrices.
- **Backend (FastAPI)**: A high-performance Python backend serving the Adaptive Recovery Decision Graph (ARDG) state machine and interfacing directly with multimodal LLMs.

### Core Features
- **Deterministic Action Logging**: An immutable execution state machine powered by SQLite for consistent audit trails.
- **Multimodal OS Intelligence**: Deep integration with **Google Gemini 2.5 Flash** natively extracts complex financial elements from pasted bank text, SMS, and direct image screen captures (Visual OCR).
- **Cryptographic Document Compilation**: Automated generation of formatted Cyber Cell FIRs and RBI Bank Dispute Notices with SHA-256 integrity hashes.
- **Adaptive Execution Polling**: Backend-bound reactive UI polling directly driven by execution registry states rather than frontend simulations.
- **Explainable Probability Adjustments**: Live decay modeling scaling intelligently against real-world event flags (e.g. `Missing UTR`, `Delay > 1 hr`).

---

## Local Development Setup

Ensure you have Node.js 18+ and Python 3.10+ installed. 

### 1. Backend Environment Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

Set your Google API Key:
Add `.env` to your `/backend` directory containing your Gemini API Token:
```env
GEMINI_API_KEY=your_key_here
```

Start the Backend Server:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Environment Setup

```bash
cd frontend
npm install
npm run dev
```

The application will default to `http://localhost:5173`.

---

## Deployment (Google Cloud Run)

PayGuard is pre-configured for serverless container deployment via Docker.

1. **Backend**: 
   Connect your GitHub to Google Cloud Run, select the `/backend` source folder using the pre-configured `Dockerfile`. Cloud Run will securely map `$PORT` into the `uvicorn` bind layer.
   *Ensure you supply the `GEMINI_API_KEY` Environment Variable.*

2. **Frontend**: 
   Build your frontend image utilizing the multi-stage NGINX build configuration found in the `frontend/` directory. 
   *In Google Cloud Run Environment Variables, map `VITE_API_URL` to your live Backend service URL (ensure there is no trailing slash).*

---

### License & Constraints
PayGuard is designed to operate deterministically. Fallback systems automatically halt extraction if unexpected API quotas limits are hit.
