# Here are your Instructions
# ମା ଓ ଶିଶୁ ସୁରକ୍ଷା (Maa O Shishu Suraksha)

**Digital Care for Every Mother, Protection for Every Child**

A digital field-data platform for India's Village Health, Sanitation & Nutrition Day (VHSND) program, built for ASHA and ANM health workers to register beneficiaries, record maternal and child health data, and surface AI/rule-based risk alerts — with real-time visibility for block, district, and state health officials.

---

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Backend setup](#backend-setup)
- [Frontend setup](#frontend-setup)
- [Running on a device](#running-on-a-device)
- [Demo accounts](#demo-accounts)
- [Environment variables reference](#environment-variables-reference)
- [Database migrations](#database-migrations)
- [Architecture notes](#architecture-notes)
- [Known limitations / roadmap](#known-limitations--roadmap)
- [Contributing](#contributing)

---

## Overview

This platform digitises the monthly VHSND session while working alongside JANANI, adding:

- **Offline-first mobile capture** — ASHA/ANM workers can register beneficiaries and record visits without connectivity; records queue locally and sync automatically once online.
- **Maternal health tracking** — pregnancy registration, ANC visits, vitals (BP, weight, haemoglobin), high-risk flagging, and maternal immunisation schedules.
- **Child health tracking** — birth registration, growth records, and immunisation schedules.
- **Rule-based risk alerts** — automatic flagging of high-risk pregnancies, missed ANC visits, and overdue immunisations, with severity, reason, and acknowledgement tracking.
- **Real-time web dashboard** — KPIs, drill-down by district → block → village → centre, alert review, and executive summaries for BMO, CDMO, and Collector-level users.
- **Role-based access** — ASHA, ANM, BMO, CDMO, Collector, and System Administrator roles.

See [`docs/spec.md`](docs/spec.md) *(if present)* for the full functional specification covering all module scope, API groups, and data entities.

---

## Tech stack

**Frontend** — `app/frontend/`
- [Expo](https://expo.dev) (React Native, Expo Router — file-based navigation)
- TypeScript
- React Context for auth and offline-sync state
- `AsyncStorage` + `expo-secure-store` for local persistence
- Light/dark theming via a custom `ThemeProvider`

**Backend** — `app/backend/`
- [FastAPI](https://fastapi.tiangolo.com) (async)
- PostgreSQL via [SQLAlchemy](https://www.sqlalchemy.org) (async) + `asyncpg`
- [Alembic](https://alembic.sqlalchemy.org) for schema migrations
- [APScheduler](https://apscheduler.readthedocs.io) for periodic alert sweeps
- JWT-based authentication (`pyjwt`)

> **Note:** this project originally used MongoDB and was migrated to PostgreSQL to fix a critical performance issue in the alert-recalculation logic (see [Architecture notes](#architecture-notes)).

---

## Project structure

```
app/
├── backend/
│   ├── server.py            # FastAPI app: all routes, auth, request/response models
│   ├── helpers.py           # Pure functions: gestational calc, risk assessment, formatting
│   ├── db/
│   │   ├── models.py        # SQLAlchemy ORM models (11 tables)
│   │   ├── session.py       # Async engine, session factory
│   │   ├── serializers.py   # Rebuilds API JSON shapes from ORM rows + joins
│   │   └── seed.py          # Demo dataset (called from server startup, not standalone)
│   ├── services/
│   │   └── alerts.py        # Alert recompute-on-write + periodic full sweep
│   ├── alembic/              # Migration scripts
│   ├── requirements.txt
│   └── .env                  # DATABASE_URL, JWT_SECRET (not committed)
│
└── frontend/
    ├── app/                   # Expo Router screens (file-based routing)
    │   ├── (auth)/            # Login
    │   ├── (tabs)/            # Home, Pregnancy, Children, Alerts, Profile
    │   ├── (admin)/           # Admin dashboard
    │   ├── pregnancy/, child/, anc/
    │   └── sync.tsx, notifications.tsx
    ├── src/
    │   ├── api/               # Fetch client + endpoint functions
    │   ├── components/        # Header, MetricCard, StatusBadge, DateField, etc.
    │   ├── constants/theme.ts # Light/dark color tokens, type scale
    │   ├── context/           # AuthContext, OfflineSyncContext, ThemeContext
    │   ├── hooks/, types/, utils/
    ├── assets/
    └── .env                   # EXPO_PUBLIC_BACKEND_URL (not committed)
```

---

## Prerequisites

- **Node.js** (LTS) and **Yarn** (or npm)
- **Python 3.12+**
- **PostgreSQL** (local install, or a free hosted instance e.g. via [Neon](https://neon.tech) or [Render](https://render.com))
- **Expo Go** app on your Android/iOS device (for quick device testing), or an Android emulator / adb + a physical device via USB

---

## Backend setup

```bash
cd app/backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

Create `app/backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@localhost:5432/<database_name>
JWT_SECRET=<any random string>
```

Apply migrations:

```bash
alembic upgrade head
```

Start the server:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

On first run against an empty database, the app **automatically seeds demo data on startup** (6 users, 50 beneficiaries/pregnancies, 30 children, ANC visits, immunisation schedules, and an initial alert sweep). Watch the startup logs for:

```
Seeding demonstration dataset into Postgres...
Seeding complete.
Alert sweep: {'generated_active_alerts': ..., ...}
Application startup complete.
```

> `db/seed.py` has **no standalone entry point** — it's only invoked from the FastAPI startup event. Don't run it directly with `python -m db.seed`; start the server instead.

Verify: open `http://localhost:8000/docs` for interactive API documentation, or `http://localhost:8000/api/dashboard` for a raw response.

---

## Frontend setup

```bash
cd app/frontend
yarn install    # or: npm install
```

Create `app/frontend/.env`:

```env
EXPO_PUBLIC_BACKEND_URL=http://<your-local-ip>:8000
```

> Use your machine's LAN IP (find via `ipconfig` / `ifconfig`), **not** `localhost`, if you're testing on a physical phone — `localhost` on a phone refers to the phone itself. `localhost` is fine only when testing in a browser on the same machine as the backend, or when using `adb reverse` (see below).

Start Expo:

```bash
npx expo start
```

---

## Running on a device

**Option A — Expo Go over WiFi (simplest)**
Ensure your phone and computer are on the same network, then scan the QR code shown in the terminal with the Expo Go app.

**Option B — USB + adb reverse (most reliable, avoids WiFi/firewall issues)**
```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
```
Then set `EXPO_PUBLIC_BACKEND_URL=http://localhost:8000` and run `npx expo start` — nothing touches WiFi.

**Building a standalone APK**
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```
Ensure your `eas.json` android profile has `"buildType": "apk"`. For a build to work for someone on a different network, `EXPO_PUBLIC_BACKEND_URL` must point at a **publicly reachable** backend, not a local IP.

---

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Administrator (CMO) | `admin` | `Admin@123` |
| Health Worker (ANM/ASHA) | `worker01` – `worker05` | `Worker@123` |

---

## Environment variables reference

**Backend (`app/backend/.env`)**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL async connection string (`postgresql+asyncpg://...`) |
| `JWT_SECRET` | Secret used to sign auth tokens — set a real random value, never rely on the hardcoded fallback |
| `ALERT_SWEEP_MINUTES` | *(optional)* Interval for the periodic alert sweep. Default: 15 |
| `DB_AUTO_CREATE` | *(optional)* If `1`, auto-creates tables on boot (dev convenience). Set `0` in any shared/production environment and rely on `alembic upgrade head` instead |

**Frontend (`app/frontend/.env`)**

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | Base URL of the backend, **without** a trailing `/api` (it's appended automatically) |

---

## Database migrations

This project uses Alembic for schema changes.

```bash
# Check current migration state
alembic current

# Apply all pending migrations
alembic upgrade head

# After changing db/models.py, generate a new migration
alembic revision --autogenerate -m "describe the change"
# Review the generated file in alembic/versions/ before applying
alembic upgrade head
```

---

## Architecture notes

**Why PostgreSQL instead of MongoDB?**
The original MongoDB implementation recalculated all alerts on nearly every read (including every dashboard load), which caused `/api/dashboard` to take **up to 8 minutes** under load on a constrained host. The PostgreSQL rewrite:
- Normalizes the schema (beneficiaries extracted from pregnancies, real foreign keys instead of duplicated name fields)
- Computes alerts **on write** (when a visit/vaccine/record changes) and via a periodic background sweep, rather than recalculating on every read
- Adds proper indexes on every field the app filters or sorts by

Result: `/api/dashboard` response time went from **~8 minutes to ~50ms**.

**Offline sync model**
The mobile app queues writes locally when offline and syncs via `POST /api/sync` once connectivity returns, using client-generated transaction IDs for idempotency.

---

## Known limitations / roadmap

- **Authentication is not production-ready.** Several write endpoints currently do not strictly enforce authentication, and login has permissive fallback behavior in some error paths. **Do not deploy this publicly or use it with real patient data until this is addressed.**
- `notifications.is_read` is a global flag, not per-user — marking a notification read affects all users. Documented trade-off, not a bug.
- No real-time GIS map integration yet (module scoped, not implemented).
- No ABHA/JANANI live integration yet — these are stubbed/planned integrations.
- Search on some list screens filters on submit, not as-you-type.
- No draft persistence — a half-completed registration form is lost if the app is backgrounded and killed by the OS.

---

## Contributing

This is an active work-in-progress prototype. Before opening a PR:
- Run the backend test suite: `pytest` (from `app/backend/`)
- Run `tsc --noEmit` in `app/frontend/` to check for type errors
- If you change the schema, include the generated Alembic migration in your PR, not just the model change

---

*Built for the National Health Mission's Village Health, Sanitation & Nutrition Day (VHSND) program.*
