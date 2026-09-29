"""Offline-sync DTOs."""
from uuid import UUID

from pydantic import BaseModel


class SyncOp(BaseModel):
    client_uuid: UUID
    entity: str
    entity_id: UUID | None = None
    base_ts: str | None = None
    client_ts: str | None = None
    payload: dict = {}


class SyncBatch(BaseModel):
    ops: list[SyncOp]


class SyncResult(BaseModel):
    applied: list[UUID] = []
    skipped_duplicate: list[UUID] = []
    conflicts: list[dict] = []