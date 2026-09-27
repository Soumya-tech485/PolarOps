"""stations table — research stations with a real map coordinate (PostGIS)."""
import uuid
from datetime import date

from geoalchemy2 import Geometry
from sqlalchemy import Date, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Station(Base):
    __tablename__ = "stations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    geom = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    next_resupply_date: Mapped[date | None] = mapped_column(Date, nullable=True)