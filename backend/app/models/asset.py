import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    serial: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    station_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stations.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str | None] = mapped_column(Text, nullable=True)
    maintenance_due: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    next_maintenance: Mapped[date | None] = mapped_column(Date, nullable=True)