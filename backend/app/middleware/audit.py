"""Hash-chained audit middleware - every successful write becomes a ledger row."""
import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone

from fastapi import Request
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware

from app.core import security
from app.core.database import AsyncSessionLocal
from app.models import AuditLog

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}
REDACT_KEYS = {"password", "password_hash", "access_token", "qr_token", "authorization"}
_chain_lock = asyncio.Lock()


def _redact(body: dict) -> dict:
    return {k: ("***REDACTED***" if k in REDACT_KEYS else v) for k, v in body.items()}


def _canon_ts(ts) -> str:
    # Accept datetime OR str: the write side passes a datetime, the read
    # side gets whatever the ts column returns, and the break-test passes
    # bare strings. Collapse every form to ONE canonical UTC shape so the
    # hash is identical on both sides regardless of column type.
    if isinstance(ts, str):
        try:
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except ValueError:
            s = ts.strip().replace(" ", "T")
            for suf in ("+00:00", "Z"):
                if s.endswith(suf):
                    s = s[:-len(suf)]
            return s
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    else:
        ts = ts.astimezone(timezone.utc)
    return ts.strftime("%Y-%m-%dT%H:%M:%S.%f")


def compute_row_hash(prev_hash, ts, user_id, action, entity, details):
    payload = "|".join([
        prev_hash or "GENESIS",
        _canon_ts(ts),
        user_id or "anonymous",
        action,
        entity,
        json.dumps(details, sort_keys=True, default=str),
    ])
    return hashlib.sha256(payload.encode()).hexdigest()


def verify_chain(rows):
    prev = None
    for row in rows:
        expected = compute_row_hash(
            prev, row.ts,
            str(row.user_id) if row.user_id else None,
            row.action, row.entity, row.details or {},
        )
        if row.prev_hash != prev or row.row_hash != expected:
            return row.id
        prev = row.row_hash
    return None


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method not in WRITE_METHODS or request.url.path in SKIP_PATHS:
            return await call_next(request)
        raw = await request.body()
        try:
            body = _redact(json.loads(raw)) if raw else {}
        except json.JSONDecodeError:
            body = {"raw": raw[:200].decode(errors="replace")}
        response = await call_next(request)
        if response.status_code < 400:
            user_id = None
            auth = request.headers.get("authorization", "")
            if auth.startswith("Bearer "):
                try:
                    user_id = uuid.UUID(security.decode_access_token(auth[7:])["sub"])
                except Exception:
                    user_id = None
            parts = [p for p in request.url.path.split("/") if p]
            entity = parts[0] if parts else "unknown"
            entity_id = None
            for p in parts:
                try:
                    entity_id = uuid.UUID(p)
                except ValueError:
                    continue
            action = f"{request.method} /{'/'.join(parts)}"
            details = {"body": body, **(getattr(request.state, "audit", None) or {})}
            async with _chain_lock, AsyncSessionLocal() as db:
                prev = (await db.execute(select(AuditLog.row_hash)
                        .order_by(AuditLog.id.desc()).limit(1))).scalar_one_or_none()
                ts = datetime.now(timezone.utc)
                row_hash = compute_row_hash(prev, ts,
                                            str(user_id) if user_id else None,
                                            action, entity, details)
                db.add(AuditLog(ts=ts, user_id=user_id, action=action, entity=entity,
                                entity_id=entity_id, details=details,
                                prev_hash=prev, row_hash=row_hash))
                await db.commit()
        return response
