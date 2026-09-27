"""Forecast + what-if endpoints (PS#3 intelligence surface)."""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import User
from app.schemas.intelligence import StationForecast, WhatIfReport
from app.services import forecasting

router = APIRouter()
ANY_ROLE = require_role("station", "logistics", "admin")


@router.get("", response_model=StationForecast)
async def station_forecast(station_id: uuid.UUID = Query(...), db: AsyncSession = Depends(get_db), user: User = Depends(ANY_ROLE)):
    return await forecasting.forecast_for_station(db, station_id)


@router.get("/what-if", response_model=WhatIfReport)
async def what_if(station_id: uuid.UUID = Query(...), delay_days: int = Query(30, ge=0, le=180), db: AsyncSession = Depends(get_db), user: User = Depends(require_role("logistics", "admin"))):
    """'The ship is delayed N days — what runs out, and what must fly?'"""
    return await forecasting.what_if(db, station_id, delay_days)