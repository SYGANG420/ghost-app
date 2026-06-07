import os
import base64
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel


JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-me")
JWT_PRIVATE_KEY_B64 = os.getenv("JWT_PRIVATE_KEY_B64", "")
JWT_PUBLIC_KEY_B64 = os.getenv("JWT_PUBLIC_KEY_B64", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "RS256")
JWT_EXPIRE_DAYS = 30
DEVICE_ROLES = {"device_a": "ADMIN", "device_b": "USER"}

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


def _b64decode_text(value: str) -> str:
    return base64.b64decode(value.encode()).decode() if value else ""


def _signing_key() -> str:
    if JWT_ALGORITHM == "RS256":
        key = _b64decode_text(JWT_PRIVATE_KEY_B64)
        if not key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="JWT private key missing")
        return key
    return JWT_SECRET


def _verify_key() -> str:
    if JWT_ALGORITHM == "RS256":
        key = _b64decode_text(JWT_PUBLIC_KEY_B64)
        if not key:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="JWT public key missing")
        return key
    return JWT_SECRET


class DeviceAuthRequest(BaseModel):
    device_id: Literal["device_a", "device_b"]

    class Config:
        extra = "forbid"


class TokenResponse(BaseModel):
    token: str
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    device_id: str
    role: str


def create_access_token(device_id: str) -> TokenResponse:
    role = DEVICE_ROLES.get(device_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown device")

    expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    token = jwt.encode(
        {"sub": device_id, "role": role, "exp": expires_at},
        _signing_key(),
        algorithm=JWT_ALGORITHM,
    )
    return TokenResponse(
        token=token,
        access_token=token,
        expires_at=expires_at.isoformat(),
        device_id=device_id,
        role=role,
    )


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _verify_key(), algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    device_id = payload.get("sub")
    role = payload.get("role")
    if device_id not in DEVICE_ROLES or DEVICE_ROLES[device_id] != role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device")

    return {"device_id": device_id, "role": role}


def get_current_device(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    return decode_token(credentials.credentials)


def require_admin(current: Annotated[dict, Depends(get_current_device)]) -> dict:
    if current["role"] != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current


@router.post("/device", response_model=TokenResponse)
def issue_device_token(payload: DeviceAuthRequest) -> TokenResponse:
    return create_access_token(payload.device_id)


@router.post("/refresh", response_model=TokenResponse)
def refresh_device_token(current: Annotated[dict, Depends(get_current_device)]) -> TokenResponse:
    return create_access_token(current["device_id"])
