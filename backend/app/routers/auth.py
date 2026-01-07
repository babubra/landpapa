"""
API роутер для аутентификации.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin_user import AdminUser
from app.auth import verify_password, hash_password, create_access_token, decode_access_token
from app.utils.email import send_email
from app.config import settings


router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# === Схемы ===

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str | None
    is_active: bool

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# === Зависимости ===

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    """Получить текущего пользователя из JWT токена."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учётные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )
    
    return user


# === Эндпоинты ===

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Авторизация и получение JWT токена."""
    user = db.query(AdminUser).filter(AdminUser.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )
    
    # Обновляем время последнего входа
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Создаём токен
    access_token = create_access_token(data={"sub": user.username})
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: AdminUser = Depends(get_current_user)):
    """Получить информацию о текущем пользователе."""
    return current_user


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Запрос на восстановление пароля."""
    user = db.query(AdminUser).filter(AdminUser.email == request.email).first()
    if not user:
        # Не выдаем, что email не найден в целях безопасности
        return {"detail": "Если этот email зарегистрирован, вы получите письмо."}

    # Создаем токен на 15 минут
    from datetime import timedelta
    reset_token = create_access_token(
        data={"sub": user.username, "type": "password_reset"}, 
        expires_delta=timedelta(minutes=15)
    )

    # Формируем ссылку (нужно будет настроить BASE_URL в конфиге или использовать захардкоженный)
    site_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:3000"
    reset_link = f"{site_url}/reset-password?token={reset_token}"

    # Отправляем письмо
    try:
        subject = "Восстановление пароля — РКК Лэнд"
        text = f"Здравствуйте! Чтобы сбросить пароль, перейдите по ссылке: {reset_link}\nСсылка действует 15 минут."
        html = f"""
        <p>Здравствуйте!</p>
        <p>Чтобы сбросить пароль для доступа к админ-панели <b>РКК Лэнд</b>, нажмите на кнопку ниже:</p>
        <p><a href="{reset_link}" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Сбросить пароль</a></p>
        <p>Или скопируйте ссылку в браузер: {reset_link}</p>
        <p><i>Ссылка действует 15 минут.</i></p>
        """
        send_email(subject, [user.email], text, html)
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при отправке письма")

    return {"detail": "Письмо отправлено."}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Смена пароля по токену."""
    payload = decode_access_token(request.token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Неверный или просроченный токен")

    username = payload.get("sub")
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Меняем пароль
    user.password_hash = hash_password(request.new_password)
    db.commit()

    return {"detail": "Пароль успешно изменен."}
