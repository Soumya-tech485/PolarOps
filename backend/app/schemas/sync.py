"""The batch-sync wire protocol — FE outbox and BE engine share these shapes."""
import uuid

from pydantic import BaseModel, Field


class SyncOp(BaseModel):
    client_uuid: uuid.UUID
    entity: str
    entity_id: uuid.UUID | None = None
    base_ts: str | None = None
    client_ts: str
    payload: dict = Field(default_factory=dict)


class SyncBatch(BaseModel):
    ops: list[SyncOp] = Field(max_length=200)


class ConflictInfo(BaseModel):
    client_uuid: uuid.UUID
    entity: str
    reason: str


class SyncResult(BaseModel):
    applied: list[uuid.UUID]
    skipped_duplicate: list[uuid.UUID]
    conflicts: list[ConflictInfo]