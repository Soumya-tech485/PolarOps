"""Pydantic DTOs for /auth/* — the exact JSON contract with the frontend."""
import uuid

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserRead(BaseModel):
    id: uuid.UUID
    email: str
    role: str

    model_config = {"from_attributes": True}