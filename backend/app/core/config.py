"""Central configuration — environment variables in, one frozen object out."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()  # reads backend/.env when present; harmless when absent


@dataclass(frozen=True)
class Settings:
    """Immutable application settings."""

    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL", "postgresql+asyncpg://polar:polar@localhost:5432/polarops"
    )
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "change-me-in-real-env")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    SYNC_MODE: str = os.environ.get("SYNC_MODE", "outbox")
    ENV: str = os.environ.get("ENV", "dev")
    CORS_ORIGINS: tuple = tuple(
        x.strip() for x in os.environ.get(
            "CORS_ORIGINS", "http://localhost:5173,https://polar-ops-nine.vercel.app"
        ).split(",") if x.strip()
    )


settings = Settings()