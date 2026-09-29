import uuid
from datetime import date

from sqlalchemy import Date, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Voyage(Base):
    __tablename__ = "voyages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    route: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    depart_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    arrive_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="planned")
    capacity_kg: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    capacity_m3: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    delay_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)