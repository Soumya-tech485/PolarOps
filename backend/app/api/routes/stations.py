"""Station list with map coordinates — feeds every selector and the Leaflet map."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_role
from app.models import Station, User
from app.schemas.voyages import StationRead

router = APIRouter()


@router.get("", response_model=list[StationRead])
async def list_stations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("station", "logistics", "admin")),
):
    stmt = select(
        Station,
        func.ST_X(Station.geom).label("lon"),
        func.ST_Y(Station.geom).label("lat"),
    )
    rows = (await db.execute(stmt)).all()
    return [
        StationRead(id=s.id, code=s.code, name=s.name, lat=lat, lon=lon,
                    next_resupply_date=s.next_resupply_date)
        for s, lon, lat in rows
    ]