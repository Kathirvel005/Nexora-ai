# Nexora: AI Workforce Digital Twin & Predictive HR Intelligence Platform

Nexora is a workforce intelligence platform combining core HR operations (employees, attendance, leaves, payroll) with predictive analytics, anomaly detection, digital twin org charts, what-if simulations, and an AI copilot.

---

## Technical Architecture Overview

The system is designed as a monorepo consisting of:
1. **Frontend (`apps/web`)**: Next.js (v16) running React, TypeScript, Tailwind CSS, Recharts, Framer Motion, and custom Canvas/SVG-based interactive node graphs.
2. **Backend (`apps/api`)**: Python FastAPI backend supporting REST endpoints, WebSockets, JWT authentication, and NetworkX for graph computation.
3. **Database**: PostgreSQL (for production/Docker) with SQLAlchemy models, falling back to a fully relational SQLite database (`nexora.db`) for zero-dependency local running.
4. **Real-time Event System**: WebSocket server built into FastAPI, broadcasting live check-ins, risk updates, and scenario completions.

```
Nexora Workspace
├── apps/
│   ├── web/                      # Next.js (TypeScript, Tailwind, Recharts, Framer Motion)
│   └── api/                      # FastAPI (Uvicorn, SQLAlchemy, JWT, WebSockets, NetworkX)
├── nexora.db                     # Fallback SQLite database for local-first zero-config run
├── .gitignore                    # Root gitignore rules
└── README.md                     # Documentation & setup guides
```

---

## Setup & Running Locally

### 1. Run the Backend API
1. Open a terminal in the root workspace folder: `d:\Project work\Odoo hack\V4(new anty)`
2. Activate the virtual environment and start the FastAPI server:
   ```bash
   .venv\Scripts\python.exe -m uvicorn apps.api.main:app --port 8000 --reload
   ```
   *(The backend server will run on `http://localhost:8000`)*

### 2. Run the Frontend Client
1. Open a second terminal window.
2. Navigate to `apps/web`:
   ```bash
   cd apps/web
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   *(The frontend will run on `http://localhost:3000` or fallback to `http://localhost:3001` if port 3000 is occupied)*

---

## Demo Credentials
Once you open the web client, the login page will present you with the following pre-configured credentials (password is **`password123`** for all accounts):

*   **HR Super Admin**: `admin@nexora.ai`
*   **Executive / CEO**: `executive@nexora.ai`
*   **Team Manager**: `manager@nexora.ai`
*   **Employee**: `employee@nexora.ai`
