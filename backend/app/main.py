"""FastAPI entry point - the single door every request walks through."""
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (assets, audit, auth, cargo, emergency, forecast,
                            indents, inventory, optimize, personnel, stations,
                            sync, voyages)
from app.core.config import settings
from app.middleware.audit import AuditMiddleware
from app.services import emergency as emergency_service
from app.services import forecasting

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_started = False
    if settings.ENV != "test":
        scheduler.add_job(forecasting.nightly_critical_scan, "cron", hour=2, minute=0)
        scheduler.add_job(emergency_service.scheduled_escalation_check, "interval", hours=1)
        try:
            scheduler.start()
            scheduler_started = True
        except Exception:
            scheduler_started = False
    yield
    if scheduler_started and scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(title="PolarOps API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)


@app.get("/")
def root():
    return {"message": "PolarOps API is running", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(stations.router, prefix="/stations", tags=["stations"])
app.include_router(cargo.router, prefix="/cargo", tags=["cargo"])
app.include_router(indents.router, prefix="/indents", tags=["indents"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(voyages.router, prefix="/voyages", tags=["voyages"])
app.include_router(personnel.router, prefix="/personnel", tags=["personnel"])
app.include_router(assets.router, prefix="/assets", tags=["assets"])
app.include_router(audit.router, prefix="/audit", tags=["audit"])
app.include_router(forecast.router, prefix="/forecast", tags=["forecast"])
app.include_router(optimize.router, prefix="/optimize", tags=["optimize"])
app.include_router(emergency.router, prefix="/emergency", tags=["emergency"])
app.include_router(sync.router, prefix="/sync", tags=["sync"])
