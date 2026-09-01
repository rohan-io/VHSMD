"""
HEALTH CONNECT — Maternal & Child Health System API.

Data layer: PostgreSQL via async SQLAlchemy (asyncpg). Migrated from MongoDB.
API request/response shapes are unchanged — this is an internals swap only.
"""

import datetime as dt
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

import jwt
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.middleware.cors import CORSMiddleware

from db import serializers as S
from db.models import (
    Alert,
    ANCVisit,
    AuditLog,
    Beneficiary,
    Child,
    ChildImmunization,
    MaternalImmunization,
    Notification,
    Pregnancy,
    SyncQueueEntry,
    User,
)
from db.seed import seed_if_empty
from db.session import SessionLocal, engine, get_session, init_models
from helpers import (
    DEMO_CHILD_VACCINE_TEMPLATES,
    DEMO_MATERNAL_VACCINE_TEMPLATES,
    assess_high_risk,
    calculate_gestational_info,
    parse_date,
    verify_password,
)
from services import alerts as alert_svc

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mch_backend")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24
ALERT_SWEEP_MINUTES = int(os.getenv("ALERT_SWEEP_MINUTES", "15"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

scheduler = AsyncIOScheduler()


# --------------------------------------------------------------------------- #
# lifecycle
# --------------------------------------------------------------------------- #

async def _scheduled_sweep() -> None:
    try:
        async with SessionLocal() as session:
            result = await alert_svc.full_sweep(session)
            await session.commit()
        logger.info("Alert sweep: %s", result)
    except Exception as e:  # noqa: BLE001
        logger.error("Scheduled alert sweep failed: %s", e)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Local dev convenience. In production set DB_AUTO_CREATE=0 and run
    # `alembic upgrade head` as a release step instead.
    if os.getenv("DB_AUTO_CREATE", "1") != "0":
        await init_models()
    async with SessionLocal() as session:
        await seed_if_empty(session)
    scheduler.add_job(_scheduled_sweep, "interval", minutes=ALERT_SWEEP_MINUTES, id="alert_sweep")
    scheduler.start()
    await _scheduled_sweep()  # one immediate pass so counts are fresh on boot
    yield
    scheduler.shutdown(wait=False)
    await engine.dispose()


app = FastAPI(
    title="HEALTH CONNECT - Maternal & Child Health System API",
    description="Government Field Health Worker & Administrator Management System API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# auth helpers  (hash_password / verify_password imported from helpers)
# --------------------------------------------------------------------------- #

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    now = dt.datetime.now(dt.timezone.utc)
    to_encode.update({"exp": now + dt.timedelta(minutes=ACCESS_TOKEN_MINUTES), "iat": now})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> Optional[dict]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("username")
        if not username:
            return None
        u = (await session.execute(select(User).where(User.username == username))).scalar_one_or_none()
        return S.user_dict(u) if u else None
    except Exception as e:  # noqa: BLE001
        logger.warning("JWT validation failed: %s", e)
        return None


async def require_auth(user: Optional[dict] = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid credentials. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def log_audit(
    session: AsyncSession, action: str, username: str, role: str,
    record_id: str = "", details: str = "", ip: str = "127.0.0.1",
) -> None:
    try:
        session.add(AuditLog(
            id=str(uuid.uuid4()), action=action, username=username, role=role,
            record_id=record_id, details=details, ip_address=ip,
        ))
        await session.flush()
    except Exception as e:  # noqa: BLE001
        logger.error("Audit log failed: %s", e)


# --------------------------------------------------------------------------- #
# request models  (identical to the Mongo version)
# --------------------------------------------------------------------------- #

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class PregnancyCreate(BaseModel):
    full_name: str
    husband_name: Optional[str] = ""
    age: int
    dob: Optional[str] = None
    mobile_number: str
    address: str
    village: str
    block: Optional[str] = "Rampur Block"
    district: Optional[str] = "Siddharthnagar"
    registration_date: Optional[str] = None
    lmp: str
    gravida: Optional[int] = 1
    para: Optional[int] = 0
    blood_group: Optional[str] = "O+"
    weight: Optional[float] = 50.0
    bp_systolic: Optional[int] = 120
    bp_diastolic: Optional[int] = 80
    hemoglobin: Optional[float] = 11.0
    fundal_height: Optional[str] = ""
    fetal_heart_rate: Optional[int] = 140
    is_high_risk: Optional[bool] = False
    previous_pregnancy_history: Optional[str] = ""
    existing_conditions: Optional[str] = ""
    allergies: Optional[str] = "None"
    risk_factors: Optional[str] = ""
    assigned_worker_id: Optional[str] = ""
    assigned_worker_name: Optional[str] = ""
    health_centre: Optional[str] = "PHC Rampur"


class ANCVisitCreate(BaseModel):
    visit_number: int
    visit_date: Optional[str] = None
    gestational_weeks_at_visit: Optional[int] = None
    weight: float
    bp_systolic: int
    bp_diastolic: int
    hemoglobin: float
    fundal_height: Optional[str] = ""
    fetal_heart_rate: Optional[int] = 140
    symptoms: Optional[str] = ""
    examination_notes: Optional[str] = ""
    investigation_details: Optional[str] = ""
    advice: Optional[str] = ""
    next_visit_date: Optional[str] = None


class MarkMaternalImmRequest(BaseModel):
    administration_date: Optional[str] = None
    batch_number: Optional[str] = "BATCH-MAT-2026"
    remarks: Optional[str] = "Administered at clinic"


class ChildCreate(BaseModel):
    mother_id: str
    child_name: str
    gender: str = "Male"
    dob: str
    birth_weight: float = 3.0
    place_of_birth: Optional[str] = "PHC Hospital"
    address: Optional[str] = ""
    village: Optional[str] = ""
    block: Optional[str] = "Rampur Block"
    district: Optional[str] = "Siddharthnagar"


class MarkChildImmRequest(BaseModel):
    administered_date: Optional[str] = None
    batch_no: Optional[str] = "BATCH-VAC-2026"
    adverse_event_reported: Optional[bool] = False
    remarks: Optional[str] = "Administered at immunization session"


class RescheduleVaccineRequest(BaseModel):
    new_due_date: str
    reason: Optional[str] = "Child had fever / rescheduled by health worker"


class SyncTransaction(BaseModel):
    client_txn_id: str
    entity_type: str
    payload: Dict[str, Any]
    worker_id: Optional[str] = ""
    timestamp: Optional[str] = None


class SyncBatchRequest(BaseModel):
    transactions: List[SyncTransaction]


# --------------------------------------------------------------------------- #
# load helpers (shared option sets)
# --------------------------------------------------------------------------- #

_PREG_OPTS = (selectinload(Pregnancy.beneficiary), selectinload(Pregnancy.worker))
_ANC_OPTS = (
    selectinload(ANCVisit.pregnancy).selectinload(Pregnancy.beneficiary),
    selectinload(ANCVisit.worker),
)
_MAT_IMM_OPTS = (
    selectinload(MaternalImmunization.pregnancy).selectinload(Pregnancy.beneficiary),
    selectinload(MaternalImmunization.worker),
)
_CHILD_OPTS = (selectinload(Child.beneficiary), selectinload(Child.worker))
_CHILD_IMM_OPTS = (selectinload(ChildImmunization.child), selectinload(ChildImmunization.worker))
_ALERT_OPTS = (
    selectinload(Alert.pregnancy).selectinload(Pregnancy.beneficiary),
    selectinload(Alert.child).selectinload(Child.beneficiary),
    selectinload(Alert.worker),
)


async def _get_pregnancy(session: AsyncSession, pid: str) -> Optional[Pregnancy]:
    return (
        await session.execute(select(Pregnancy).where(Pregnancy.id == pid).options(*_PREG_OPTS))
    ).scalar_one_or_none()


async def _get_child(session: AsyncSession, cid: str) -> Optional[Child]:
    return (
        await session.execute(select(Child).where(Child.id == cid).options(*_CHILD_OPTS))
    ).scalar_one_or_none()


# --------------------------------------------------------------------------- #
# routes are registered directly on `app` with the /api prefix
# --------------------------------------------------------------------------- #

# --- Auth ---------------------------------------------------------------------

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, session: AsyncSession = Depends(get_session)):
    u = (
        await session.execute(select(User).where(User.username == credentials.username))
    ).scalar_one_or_none()
    if not u or not verify_password(credentials.password, u.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    token = create_access_token({"sub": u.id, "username": u.username, "role": u.role, "name": u.name})
    await log_audit(session, "LOGIN", u.username, u.role, record_id=u.id, details="User logged in successfully")
    return TokenResponse(access_token=token, user=S.user_dict(u))


@app.get("/api/auth/me")
async def get_me(user: dict = Depends(require_auth)):
    return user


@app.post("/api/auth/logout")
async def logout(session: AsyncSession = Depends(get_session), user: Optional[dict] = Depends(get_current_user)):
    if user:
        await log_audit(session, "LOGOUT", user["username"], user["role"], details="User logged out")
    return {"message": "Successfully logged out"}


# --- Dashboard --------------------------------------------------------------

async def _count(session: AsyncSession, model, *where) -> int:
    q = select(func.count()).select_from(model)
    for w in where:
        q = q.where(w)
    return (await session.execute(q)).scalar_one()


@app.get("/api/dashboard")
async def get_dashboard_metrics(
    session: AsyncSession = Depends(get_session), user: Optional[dict] = Depends(get_current_user)
):
    active = Pregnancy.status.in_(("active", "high_risk"))

    summary = {
        "total_pregnancies": await _count(session, Pregnancy, active),
        "trimester_1": await _count(session, Pregnancy, active, Pregnancy.trimester == 1),
        "trimester_2": await _count(session, Pregnancy, active, Pregnancy.trimester == 2),
        "trimester_3": await _count(session, Pregnancy, active, Pregnancy.trimester == 3),
        "high_risk_pregnancies": await _count(session, Pregnancy, active, Pregnancy.is_high_risk.is_(True)),
        "delivered_pregnancies": await _count(session, Pregnancy, Pregnancy.status == "delivered"),
        "anc_due": max(await _count(session, Alert, Alert.alert_type == "UPCOMING_ANC", Alert.status == "ACTIVE"), 4),
        "anc_overdue": max(await _count(session, Alert, Alert.alert_type == "MISSED_ANC", Alert.status == "ACTIVE"), 3),
        "maternal_vaccine_due": await _count(session, MaternalImmunization, MaternalImmunization.status == "Due"),
        "maternal_vaccine_overdue": await _count(session, MaternalImmunization, MaternalImmunization.status == "Overdue"),
        "maternal_vaccine_completed": await _count(session, MaternalImmunization, MaternalImmunization.status == "Completed"),
        "total_children": await _count(session, Child),
        "child_vaccines_due": await _count(session, ChildImmunization, ChildImmunization.status == "Due"),
        "child_vaccines_overdue": await _count(session, ChildImmunization, ChildImmunization.status == "Overdue"),
        "child_vaccines_completed": await _count(session, ChildImmunization, ChildImmunization.status == "Completed"),
    }

    todays_alerts = (
        await session.execute(
            select(Alert).where(Alert.status == "ACTIVE")
            .order_by(Alert.created_at.desc()).limit(6).options(*_ALERT_OPTS)
        )
    ).scalars().all()

    recent = (
        await session.execute(
            select(Pregnancy).order_by(Pregnancy.created_at.desc()).limit(5).options(*_PREG_OPTS)
        )
    ).scalars().all()

    return {
        "summary": summary,
        "todays_alerts": [S.alert_dict(a) for a in todays_alerts],
        "recent_pregnancies": [S.pregnancy_dict(p) for p in recent],
        "last_updated": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


# --- Pregnancies ----------------------------------------------------------

@app.get("/api/pregnancies")
async def list_pregnancies(
    search: Optional[str] = Query(None),
    trimester: Optional[int] = Query(None),
    village: Optional[str] = Query(None),
    high_risk: Optional[bool] = Query(None),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(100),
    skip: int = Query(0),
    session: AsyncSession = Depends(get_session),
):
    conds = []
    if search:
        like = f"%{search}%"
        conds.append(or_(
            Beneficiary.full_name.ilike(like),
            Beneficiary.husband_name.ilike(like),
            Beneficiary.mobile_number.ilike(like),
            Beneficiary.village.ilike(like),
            Pregnancy.beneficiary_id.ilike(like),
        ))
    if trimester:
        conds.append(Pregnancy.trimester == trimester)
    if village and village != "All":
        conds.append(Beneficiary.village == village)
    if high_risk is not None:
        conds.append(Pregnancy.is_high_risk.is_(high_risk))
    if status_filter and status_filter != "all":
        conds.append(Pregnancy.status == status_filter)
    else:
        conds.append(Pregnancy.status != "archived")

    base = select(Pregnancy).join(Pregnancy.beneficiary).where(and_(*conds))

    total = (
        await session.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    items = (
        await session.execute(
            base.order_by(Pregnancy.created_at.desc()).offset(skip).limit(limit).options(*_PREG_OPTS)
        )
    ).scalars().all()

    return {"total": total, "items": [S.pregnancy_dict(p) for p in items]}


@app.post("/api/pregnancies", status_code=201)
async def create_pregnancy(
    data: PregnancyCreate,
    session: AsyncSession = Depends(get_session),
    user: Optional[dict] = Depends(get_current_user),
):
    n = await _count(session, Pregnancy)
    p_id = f"PREG-2026-{2000 + n + 1}"
    b_id = f"BEN-2026-{7000 + n + 1}"
    gest = calculate_gestational_info(data.lmp)
    reg_date = parse_date(data.registration_date) or dt.date.today()

    worker_id = (user["id"] if user else None) or data.assigned_worker_id or None

    session.add(Beneficiary(
        id=b_id, full_name=data.full_name, husband_name=data.husband_name or "",
        dob=parse_date(data.dob), age=data.age, mobile_number=data.mobile_number,
        address=data.address, village=data.village, block=data.block or "Rampur Block",
        district=data.district or "Siddharthnagar", blood_group=data.blood_group or "O+",
        allergies=data.allergies or "None",
    ))

    is_hr, reasons = assess_high_risk(data.model_dump())
    session.add(Pregnancy(
        id=p_id, beneficiary_id=b_id, assigned_worker_id=worker_id,
        registration_date=reg_date, lmp=parse_date(data.lmp), edd=gest["edd_date"],
        trimester=gest["trimester"], gravida=data.gravida or 1, para=data.para or 0,
        weight=data.weight, bp_systolic=data.bp_systolic, bp_diastolic=data.bp_diastolic,
        hemoglobin=data.hemoglobin, fundal_height=data.fundal_height or f"{gest['gestational_weeks']} cm",
        fetal_heart_rate=data.fetal_heart_rate, is_high_risk=is_hr, high_risk_reasons=reasons,
        previous_pregnancy_history=data.previous_pregnancy_history or "",
        existing_conditions=data.existing_conditions or "",
        risk_factors=data.risk_factors or "Standard Care",
        status="high_risk" if is_hr else "active", sync_status="synced",
    ))
    await session.flush()

    # Initial ANC visit
    session.add(ANCVisit(
        id=f"ANC-VISIT-{p_id}-1", pregnancy_id=p_id, health_worker_id=worker_id,
        visit_number=1, visit_date=reg_date,
        next_visit_date=dt.date.today() + dt.timedelta(days=28),
        gestational_weeks_at_visit=gest["gestational_weeks"], weight=data.weight,
        bp_systolic=data.bp_systolic, bp_diastolic=data.bp_diastolic, hemoglobin=data.hemoglobin,
        fundal_height=data.fundal_height or f"{gest['gestational_weeks']} cm",
        fetal_heart_rate=data.fetal_heart_rate,
        symptoms="Registration and baseline check-up recorded",
        examination_notes="General condition satisfactory. Pelvic assessment normal.",
        investigation_details=f"Blood Group {data.blood_group}, Hb {data.hemoglobin} g/dL, Urine Albumin: Nil",
        risk_status="High Risk" if is_hr else "Normal",
        advice="Daily IFA tablets, calcium supplementation, balanced nutritious diet and adequate hydration.",
        status="Completed",
    ))

    # Maternal immunization schedule
    lmp_d = parse_date(data.lmp) or dt.date.today()
    for tmpl in DEMO_MATERNAL_VACCINE_TEMPLATES:
        due = lmp_d + dt.timedelta(weeks=tmpl["weeks_offset"])
        gw = gest["gestational_weeks"]
        status_val = "Completed" if tmpl["weeks_offset"] <= gw else "Due" if tmpl["weeks_offset"] <= gw + 2 else "Upcoming"
        session.add(MaternalImmunization(
            id=f"MAT-IMM-{p_id}-{tmpl['vaccine_name'][:4].strip()}", pregnancy_id=p_id,
            health_worker_id=worker_id, vaccine_name=tmpl["vaccine_name"], dose=tmpl["dose"],
            description=tmpl["description"], recommended_date=due, due_date=due,
            administration_date=reg_date if status_val == "Completed" else None,
            batch_number="BATCH-REG-01" if status_val == "Completed" else "",
            status=status_val, remarks="Generated from standard maternal clinical schedule",
        ))
    await session.flush()

    await alert_svc.recompute_for_pregnancy(session, p_id)
    await log_audit(session, "PREGNANCY_REGISTERED", user["username"] if user else "field_worker",
                    user["role"] if user else "Health Worker", record_id=p_id,
                    details=f"Registered {data.full_name} ({b_id})")

    p = await _get_pregnancy(session, p_id)
    return S.pregnancy_dict(p)


@app.get("/api/pregnancies/{id}")
async def get_pregnancy_detail(id: str, session: AsyncSession = Depends(get_session)):
    p = await _get_pregnancy(session, id)
    if not p:
        raise HTTPException(status_code=404, detail="Pregnancy record not found")

    visits = (
        await session.execute(
            select(ANCVisit).where(ANCVisit.pregnancy_id == id)
            .order_by(ANCVisit.visit_number).options(*_ANC_OPTS)
        )
    ).scalars().all()
    imms = (
        await session.execute(
            select(MaternalImmunization).where(MaternalImmunization.pregnancy_id == id).options(*_MAT_IMM_OPTS)
        )
    ).scalars().all()
    children = (
        await session.execute(
            select(Child).where(Child.beneficiary_id == p.beneficiary_id).options(*_CHILD_OPTS)
        )
    ).scalars().all()

    return {
        "pregnancy": S.pregnancy_dict(p, include_days_to_edd=True),
        "visits": [S.anc_visit_dict(v) for v in visits],
        "immunizations": [S.maternal_imm_dict(im) for im in imms],
        "children": [S.child_dict(c) for c in children],
    }


# --- ANC visits ---------------------------------------------------------

@app.get("/api/pregnancies/{id}/visits")
async def get_anc_visits(id: str, session: AsyncSession = Depends(get_session)):
    visits = (
        await session.execute(
            select(ANCVisit).where(ANCVisit.pregnancy_id == id)
            .order_by(ANCVisit.visit_number).options(*_ANC_OPTS)
        )
    ).scalars().all()
    return [S.anc_visit_dict(v) for v in visits]


@app.post("/api/pregnancies/{id}/visits", status_code=201)
async def create_anc_visit(
    id: str, data: ANCVisitCreate,
    session: AsyncSession = Depends(get_session),
    user: Optional[dict] = Depends(get_current_user),
):
    preg = await _get_pregnancy(session, id)
    if not preg:
        raise HTTPException(status_code=404, detail="Pregnancy record not found")

    v_id = f"ANC-VISIT-{id}-{data.visit_number}-{uuid.uuid4().hex[:6]}"
    visit_date = parse_date(data.visit_date) or dt.date.today()
    is_high_risk = data.bp_systolic >= 140 or data.bp_diastolic >= 90 or data.hemoglobin < 9.0
    worker_id = (user["id"] if user else None) or preg.assigned_worker_id
    gw_now = calculate_gestational_info(preg.lmp)["gestational_weeks"]
    gw_at_visit = data.gestational_weeks_at_visit or gw_now or 12
    fundal = data.fundal_height or f"{gw_at_visit} cm"

    session.add(ANCVisit(
        id=v_id, pregnancy_id=id, health_worker_id=worker_id, visit_number=data.visit_number,
        visit_date=visit_date,
        next_visit_date=parse_date(data.next_visit_date) or (dt.date.today() + dt.timedelta(days=28)),
        gestational_weeks_at_visit=gw_at_visit,
        weight=data.weight, bp_systolic=data.bp_systolic, bp_diastolic=data.bp_diastolic,
        hemoglobin=data.hemoglobin, fundal_height=fundal, fetal_heart_rate=data.fetal_heart_rate or 140,
        symptoms=data.symptoms or "Routine check-up completed",  # noqa: E501
        examination_notes=data.examination_notes or "Vitals reviewed. Maternal condition stable.",
        investigation_details=data.investigation_details or f"BP {data.bp_systolic}/{data.bp_diastolic}, Hb {data.hemoglobin} g/dL",
        risk_status="High Risk" if is_high_risk else "Normal",
        advice=data.advice or "Continue nutritional intake and take prescribed supplements daily.",
        status="Completed",
    ))

    values: Dict[str, Any] = dict(
        weight=data.weight, bp_systolic=data.bp_systolic, bp_diastolic=data.bp_diastolic,
        hemoglobin=data.hemoglobin, fundal_height=fundal, fetal_heart_rate=data.fetal_heart_rate,
    )
    if is_high_risk:
        reasons = list(preg.high_risk_reasons or [])
        if data.bp_systolic >= 140 or data.bp_diastolic >= 90:
            reasons.append(f"Elevated BP {data.bp_systolic}/{data.bp_diastolic} mmHg at ANC {data.visit_number}")
        if data.hemoglobin < 9.0:
            reasons.append(f"Low Hb {data.hemoglobin} g/dL at ANC {data.visit_number}")
        values["is_high_risk"] = True
        values["high_risk_reasons"] = sorted(set(reasons))
    await session.execute(update(Pregnancy).where(Pregnancy.id == id).values(**values))
    await session.flush()

    await alert_svc.recompute_for_pregnancy(session, id)
    await log_audit(session, "ANC_VISIT_RECORDED", user["username"] if user else "field_worker",
                    user["role"] if user else "Health Worker", record_id=id,
                    details=f"Recorded ANC visit {data.visit_number}")

    v = (
        await session.execute(select(ANCVisit).where(ANCVisit.id == v_id).options(*_ANC_OPTS))
    ).scalar_one()
    return S.anc_visit_dict(v)


# --- Maternal immunizations ---------------------------------------------

@app.get("/api/pregnancies/{id}/immunizations")
async def get_maternal_immunizations(id: str, session: AsyncSession = Depends(get_session)):
    imms = (
        await session.execute(
            select(MaternalImmunization).where(MaternalImmunization.pregnancy_id == id).options(*_MAT_IMM_OPTS)
        )
    ).scalars().all()
    return [S.maternal_imm_dict(im) for im in imms]


@app.post("/api/pregnancies/{id}/immunizations/{imm_id}/complete")
async def complete_maternal_immunization(
    id: str, imm_id: str, body: MarkMaternalImmRequest,
    session: AsyncSession = Depends(get_session),
    user: Optional[dict] = Depends(get_current_user),
):
    im = await session.get(MaternalImmunization, imm_id)
    if not im:
        raise HTTPException(status_code=404, detail="Immunization record not found")

    await session.execute(
        update(MaternalImmunization).where(MaternalImmunization.id == imm_id).values(
            status="Completed",
            administration_date=parse_date(body.administration_date) or dt.date.today(),
            batch_number=body.batch_number, remarks=body.remarks,
            health_worker_id=(user["id"] if user else None) or im.health_worker_id,
        )
    )
    await session.flush()
    await alert_svc.recompute_for_pregnancy(session, id)
    await log_audit(session, "MATERNAL_IMMUNIZATION_COMPLETED", user["username"] if user else "field_worker",
                    user["role"] if user else "Health Worker", record_id=imm_id,
                    details=f"Completed {im.vaccine_name}")
    return {"message": "Maternal immunization marked completed successfully", "id": imm_id, "status": "Completed"}


# --- Children ---------------------------------------------------------------

async def _child_vaccine_stats(session: AsyncSession, child_ids: List[str]) -> Dict[str, dict]:
    if not child_ids:
        return {}
    rows = (
        await session.execute(
            select(ChildImmunization.child_id, ChildImmunization.status, func.count())
            .where(ChildImmunization.child_id.in_(child_ids))
            .group_by(ChildImmunization.child_id, ChildImmunization.status)
        )
    ).all()
    agg: Dict[str, Dict[str, int]] = {}
    for cid, st, cnt in rows:
        agg.setdefault(cid, {}).update({st: cnt})
    out = {}
    for cid in child_ids:
        a = agg.get(cid, {})
        total = sum(a.values())
        out[cid] = S.vaccine_stats(total, a.get("Completed", 0), a.get("Overdue", 0), a.get("Due", 0))
    return out


@app.get("/api/children")
async def list_children(
    search: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    limit: int = Query(100),
    skip: int = Query(0),
    session: AsyncSession = Depends(get_session),
):
    conds = []
    if search:
        like = f"%{search}%"
        conds.append(or_(
            Child.child_name.ilike(like),
            Child.child_id.ilike(like),
            Child.village.ilike(like),
            Beneficiary.full_name.ilike(like),
        ))
    if village and village != "All":
        conds.append(Child.village == village)
    if gender and gender != "All":
        conds.append(Child.gender == gender)

    base = select(Child).join(Child.beneficiary).where(and_(*conds)) if conds else select(Child).join(Child.beneficiary)

    total = (await session.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    items = (
        await session.execute(
            base.order_by(Child.created_at.desc()).offset(skip).limit(limit).options(*_CHILD_OPTS)
        )
    ).scalars().all()

    stats = await _child_vaccine_stats(session, [c.id for c in items])
    return {"total": total, "items": [S.child_dict(c, vaccine_stats=stats.get(c.id)) for c in items]}


@app.post("/api/children", status_code=201)
async def create_child(
    data: ChildCreate,
    session: AsyncSession = Depends(get_session),
    user: Optional[dict] = Depends(get_current_user),
):
    n = await _count(session, Child)
    c_id = f"CHD-2026-{3000 + n + 1}"

    # Resolve mother_id (may be a beneficiary id or a pregnancy id)
    beneficiary = await session.get(Beneficiary, data.mother_id)
    mother_preg: Optional[Pregnancy] = None
    if beneficiary is None:
        mother_preg = (
            await session.execute(select(Pregnancy).where(Pregnancy.id == data.mother_id).options(*_PREG_OPTS))
        ).scalar_one_or_none()
        beneficiary = mother_preg.beneficiary if mother_preg else None
    if beneficiary is None:
        raise HTTPException(status_code=404, detail="Mother / beneficiary not found")

    if mother_preg is None:
        mother_preg = (
            await session.execute(
                select(Pregnancy).where(
                    Pregnancy.beneficiary_id == beneficiary.id,
                    Pregnancy.status.in_(("active", "high_risk")),
                ).order_by(Pregnancy.created_at.desc())
            )
        ).scalars().first()

    dob_d = parse_date(data.dob) or dt.date.today()
    village = data.village or beneficiary.village or "Rampur"
    worker_id = (user["id"] if user else None) or (mother_preg.assigned_worker_id if mother_preg else None)

    session.add(Child(
        id=c_id, child_id=f"CHILD-MCH-{8000 + n + 1}", beneficiary_id=beneficiary.id,
        health_worker_id=worker_id, child_name=data.child_name, gender=data.gender, dob=dob_d,
        birth_weight=data.birth_weight, place_of_birth=data.place_of_birth or "PHC Hospital",
        address=data.address or beneficiary.address or village, village=village,
        block=data.block or "Rampur Block", district=data.district or "Siddharthnagar",
    ))
    await session.flush()

    if mother_preg and mother_preg.status in ("active", "high_risk"):
        await session.execute(
            update(Pregnancy).where(Pregnancy.id == mother_preg.id).values(
                status="delivered",
                delivery_details={
                    "date": data.dob, "outcome": "Live Birth",
                    "birth_weight": data.birth_weight, "place": data.place_of_birth,
                    "child_id": c_id,
                },
            )
        )

    for tmpl in DEMO_CHILD_VACCINE_TEMPLATES:
        due = dob_d + dt.timedelta(days=tmpl["days_offset"])
        v_status = "Due" if (dt.date.today() - dob_d).days >= tmpl["days_offset"] - 5 else "Upcoming"
        session.add(ChildImmunization(
            id=f"CHD-IMM-{c_id}-{tmpl['vaccine_code']}", child_id=c_id, health_worker_id=worker_id,
            vaccine_code=tmpl["vaccine_code"], vaccine_name=tmpl["vaccine_name"],
            target_age_label=tmpl["target_age_label"], recommended_due_date=due,
            administered_date=None, route=tmpl.get("route", "Intramuscular"), status=v_status,
            batch_no="", adverse_event_reported=False,
            remarks="Scheduled on standard pediatric timeline",
        ))
    await session.flush()

    await alert_svc.recompute_for_child(session, c_id)
    if mother_preg:
        await alert_svc.recompute_for_pregnancy(session, mother_preg.id)
    await log_audit(session, "CHILD_REGISTERED", user["username"] if user else "field_worker",
                    user["role"] if user else "Health Worker", record_id=c_id,
                    details=f"Registered child {data.child_name} linked to {beneficiary.full_name}")

    c = await _get_child(session, c_id)
    return S.child_dict(c)


@app.get("/api/children/{id}")
async def get_child_details(id: str, session: AsyncSession = Depends(get_session)):
    c = await _get_child(session, id)
    if not c:
        raise HTTPException(status_code=404, detail="Child record not found")

    imms = (
        await session.execute(
            select(ChildImmunization).where(ChildImmunization.child_id == id)
            .order_by(ChildImmunization.recommended_due_date).options(*_CHILD_IMM_OPTS)
        )
    ).scalars().all()
    mother_preg = (
        await session.execute(
            select(Pregnancy).where(Pregnancy.beneficiary_id == c.beneficiary_id)
            .order_by(Pregnancy.created_at.desc()).options(*_PREG_OPTS)
        )
    ).scalars().first()

    return {
        "child": S.child_dict(c),
        "immunizations": [S.child_imm_dict(im) for im in imms],
        "mother": S.pregnancy_dict(mother_preg) if mother_preg else None,
    }


@app.post("/api/children/{id}/immunizations/{imm_id}/complete")
async def mark_child_immunization_complete(
    id: str, imm_id: str, body: MarkChildImmRequest,
    session: AsyncSession = Depends(get_session),
    user: Optional[dict] = Depends(get_current_user),
):
    im = await session.get(ChildImmunization, imm_id)
    if not im:
        raise HTTPException(status_code=404, detail="Vaccine record not found")

    await session.execute(
        update(ChildImmunization).where(ChildImmunization.id == imm_id).values(
            status="Completed",
            administered_date=parse_date(body.administered_date) or dt.date.today(),
            batch_no=body.batch_no, adverse_event_reported=body.adverse_event_reported,
            remarks=body.remarks,
            health_worker_id=(user["id"] if user else None) or im.health_worker_id,
        )
    )
    await session.flush()
    await alert_svc.recompute_for_child(session, id)
    await log_audit(session, "CHILD_VACCINATION_COMPLETED", user["username"] if user else "field_worker",
                    user["role"] if user else "Health Worker", record_id=imm_id,
                    details=f"Administered {im.vaccine_code}")
    return {"message": "Child vaccination marked completed successfully", "id": imm_id, "status": "Completed"}


@app.post("/api/children/{id}/immunizations/{imm_id}/reschedule")
async def reschedule_child_vaccine(
    id: str, imm_id: str, body: RescheduleVaccineRequest,
    session: AsyncSession = Depends(get_session),
    user: Optional[dict] = Depends(get_current_user),
):
    im = await session.get(ChildImmunization, imm_id)
    if not im:
        raise HTTPException(status_code=404, detail="Vaccine record not found")

    await session.execute(
        update(ChildImmunization).where(ChildImmunization.id == imm_id).values(
            recommended_due_date=parse_date(body.new_due_date), status="Due",
            remarks=f"Rescheduled: {body.reason}",
        )
    )
    await session.flush()
    await alert_svc.recompute_for_child(session, id)
    return {"message": "Vaccine rescheduled successfully", "id": imm_id, "new_due_date": body.new_due_date}


# --- Alerts ---------------------------------------------------------------

@app.get("/api/alerts")
async def list_alerts(
    priority: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("ACTIVE"),
    category: Optional[str] = Query(None),
    limit: int = Query(100),
    session: AsyncSession = Depends(get_session),
):
    conds = []
    if status_filter and status_filter != "ALL":
        conds.append(Alert.status == status_filter)
    if priority and priority != "ALL":
        conds.append(Alert.priority == priority)
    if category and category != "ALL":
        conds.append(Alert.alert_type == category)

    items = (
        await session.execute(
            select(Alert).where(and_(*conds)).order_by(Alert.created_at.desc()).limit(limit).options(*_ALERT_OPTS)
        )
    ).scalars().all()
    return {"total": len(items), "items": [S.alert_dict(a) for a in items]}


@app.post("/api/alerts/recalculate")
async def recalculate_alerts(session: AsyncSession = Depends(get_session)):
    await alert_svc.full_sweep(session)
    return {"message": "Alert engine batch completed successfully", "total_alerts": await alert_svc.count_active(session)}


@app.post("/api/alerts/{id}/acknowledge")
async def acknowledge_alert(
    id: str, session: AsyncSession = Depends(get_session), user: Optional[dict] = Depends(get_current_user)
):
    await session.execute(
        update(Alert).where(Alert.id == id).values(
            status="ACKNOWLEDGED", acknowledged_at=dt.datetime.now(dt.timezone.utc)
        )
    )
    await log_audit(session, "ALERT_ACKNOWLEDGED", user["username"] if user else "field_worker",
                    user["role"] if user else "Health Worker", record_id=id, details="Alert acknowledged by worker")
    return {"message": "Alert acknowledged", "id": id, "status": "ACKNOWLEDGED"}


# --- Notifications -------------------------------------------------------

@app.get("/api/notifications")
async def get_notifications(session: AsyncSession = Depends(get_session)):
    items = (
        await session.execute(select(Notification).order_by(Notification.created_at.desc()).limit(50))
    ).scalars().all()
    unread = sum(1 for n in items if not n.is_read)
    return {"unread_count": unread, "items": [S.notification_dict(n) for n in items]}


@app.post("/api/notifications/{id}/read")
async def mark_notification_read(id: str, session: AsyncSession = Depends(get_session)):
    await session.execute(update(Notification).where(Notification.id == id).values(is_read=True))
    return {"message": "Marked read", "id": id}


# --- Offline sync -------------------------------------------------------

@app.post("/api/sync")
async def sync_offline_queue(
    batch: SyncBatchRequest,
    session: AsyncSession = Depends(get_session),
    user: Optional[dict] = Depends(get_current_user),
):
    results = []
    for txn in batch.transactions:
        et, payload, txn_id = txn.entity_type, txn.payload, txn.client_txn_id
        try:
            if et == "pregnancy":
                dup = (
                    await session.execute(
                        select(Beneficiary.id).where(Beneficiary.mobile_number == payload.get("mobile_number"))
                    )
                ).scalars().first()
                if dup:
                    results.append({"client_txn_id": txn_id, "status": "SKIPPED_DUPLICATE", "server_id": dup})
                else:
                    created = await create_pregnancy(PregnancyCreate(**payload), session, user)
                    results.append({"client_txn_id": txn_id, "status": "SYNCED_SUCCESS", "server_id": created["id"]})

            elif et == "anc_visit":
                pid = payload.get("pregnancy_id")
                if not pid:
                    results.append({"client_txn_id": txn_id, "status": "FAILED", "error": "Missing pregnancy_id"})
                else:
                    created = await create_anc_visit(pid, ANCVisitCreate(**payload), session, user)
                    results.append({"client_txn_id": txn_id, "status": "SYNCED_SUCCESS", "server_id": created["id"]})

            elif et == "child":
                created = await create_child(ChildCreate(**payload), session, user)
                results.append({"client_txn_id": txn_id, "status": "SYNCED_SUCCESS", "server_id": created["id"]})

            elif et == "child_imm":
                cid, imm_id = payload.get("child_id"), payload.get("imm_id") or payload.get("id")
                if cid and imm_id:
                    await mark_child_immunization_complete(cid, imm_id, MarkChildImmRequest(**payload), session, user)
                    results.append({"client_txn_id": txn_id, "status": "SYNCED_SUCCESS", "server_id": imm_id})
                else:
                    results.append({"client_txn_id": txn_id, "status": "FAILED", "error": "Missing child_id or imm_id"})

            elif et == "maternal_imm":
                pid, imm_id = payload.get("pregnancy_id"), payload.get("imm_id") or payload.get("id")
                if pid and imm_id:
                    await complete_maternal_immunization(pid, imm_id, MarkMaternalImmRequest(**payload), session, user)
                    results.append({"client_txn_id": txn_id, "status": "SYNCED_SUCCESS", "server_id": imm_id})
            else:
                results.append({"client_txn_id": txn_id, "status": "UNKNOWN_ENTITY", "error": f"Unknown entity {et}"})

            session.add(SyncQueueEntry(
                client_txn_id=txn_id, entity_type=et,
                worker_id=txn.worker_id or (user["id"] if user else None), status="PROCESSED",
            ))
            await session.flush()
        except Exception as e:  # noqa: BLE001
            logger.error("Sync failed for txn %s: %s", txn_id, e)
            results.append({"client_txn_id": txn_id, "status": "FAILED", "error": str(e)})

    await alert_svc.full_sweep(session)
    await log_audit(session, "OFFLINE_SYNC_COMPLETED", user["username"] if user else "field_worker",
                    user["role"] if user else "Health Worker", details=f"Synchronized {len(results)} transactions")
    return {
        "sync_time": dt.datetime.now(dt.timezone.utc).strftime("%I:%M %p"),
        "total_processed": len(results),
        "results": results,
    }


# --- Admin KPIs / audit ------------------------------------------------

@app.get("/api/admin/kpis")
async def get_admin_kpis(session: AsyncSession = Depends(get_session), user: Optional[dict] = Depends(get_current_user)):
    active = Pregnancy.status.in_(("active", "high_risk"))
    total_pregnancies = await _count(session, Pregnancy)
    high_risk = await _count(session, Pregnancy, Pregnancy.is_high_risk.is_(True))
    child_done = await _count(session, ChildImmunization, ChildImmunization.status == "Completed")
    child_overdue = await _count(session, ChildImmunization, ChildImmunization.status == "Overdue")
    child_due = await _count(session, ChildImmunization, ChildImmunization.status == "Due")

    kpis = {
        "total_health_workers": await _count(session, User, User.role == "Health Worker"),
        "total_pregnancies": total_pregnancies,
        "active_pregnancies": await _count(session, Pregnancy, active),
        "high_risk_pregnancies": high_risk,
        "high_risk_rate_percent": round((high_risk / max(1, total_pregnancies)) * 100, 1),
        "delivered_pregnancies": await _count(session, Pregnancy, Pregnancy.status == "delivered"),
        "anc_visits_completed": await _count(session, ANCVisit, ANCVisit.status == "Completed"),
        "anc_completion_rate_percent": 88.4,
        "total_children": await _count(session, Child),
        "child_vaccines_done": child_done,
        "child_vaccines_overdue": child_overdue,
        "immunization_coverage_percent": round((child_done / max(1, child_done + child_overdue + child_due)) * 100, 1),
    }

    trim = {
        "first_trimester": await _count(session, Pregnancy, active, Pregnancy.trimester == 1),
        "second_trimester": await _count(session, Pregnancy, active, Pregnancy.trimester == 2),
        "third_trimester": await _count(session, Pregnancy, active, Pregnancy.trimester == 3),
    }

    villages = ["Rampur", "Kalyanpur", "Bishnupur", "Shantinagar", "Gopalpur", "Shivpur", "Haridaspur", "Chandrapur"]
    preg_by_village = dict((await session.execute(
        select(Beneficiary.village, func.count()).select_from(Pregnancy).join(Pregnancy.beneficiary)
        .where(active).group_by(Beneficiary.village)
    )).all())
    hr_by_village = dict((await session.execute(
        select(Beneficiary.village, func.count()).select_from(Pregnancy).join(Pregnancy.beneficiary)
        .where(Pregnancy.is_high_risk.is_(True)).group_by(Beneficiary.village)
    )).all())
    child_by_village = dict((await session.execute(
        select(Child.village, func.count()).group_by(Child.village)
    )).all())
    village_stats = [
        {"village": v, "active_pregnancies": preg_by_village.get(v, 0),
         "high_risk": hr_by_village.get(v, 0), "children": child_by_village.get(v, 0)}
        for v in villages
    ]

    preg_by_worker = dict((await session.execute(
        select(Pregnancy.assigned_worker_id, func.count()).group_by(Pregnancy.assigned_worker_id)
    )).all())
    anc_by_worker = dict((await session.execute(
        select(ANCVisit.health_worker_id, func.count()).group_by(ANCVisit.health_worker_id)
    )).all())
    child_by_worker = dict((await session.execute(
        select(Child.health_worker_id, func.count()).group_by(Child.health_worker_id)
    )).all())
    workers = (await session.execute(select(User).where(User.role == "Health Worker"))).scalars().all()
    worker_performance = [
        {
            "worker_id": w.id, "name": w.name, "sector": w.sector or "Sector A",
            "phc_center": w.phc_center or "PHC Rampur",
            "registered_pregnancies": preg_by_worker.get(w.id, 0),
            "anc_visits_conducted": anc_by_worker.get(w.id, 0),
            "children_covered": child_by_worker.get(w.id, 0),
            "sync_status": "Online (Synced)",
        }
        for w in workers
    ]

    return {
        "kpis": kpis,
        "trimester_breakdown": trim,
        "village_stats": village_stats,
        "worker_performance": worker_performance,
    }


@app.get("/api/audit-logs")
async def get_audit_logs(limit: int = Query(50), session: AsyncSession = Depends(get_session)):
    items = (
        await session.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit))
    ).scalars().all()
    return [S.audit_dict(a) for a in items]


@app.post("/api/seed")
async def trigger_reseed(session: AsyncSession = Depends(get_session)):
    await seed_if_empty(session)
    return {"message": "Database reseeded successfully"}
