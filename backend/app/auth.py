"""
Утилиты для работы с паролями и JWT токенами.
"""

from datetime import datetime, timedelta
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import jwt

from app.config import settings


# Password hashing
ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Хэширование пароля с Argon2."""
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Проверка пароля."""
    try:
        ph.verify(password_hash, password)
        return True
    except VerifyMismatchError:
        return False


# JWT
SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 часа


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Создать JWT токен."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Декодировать JWT токен."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.JWTError:
        return None
