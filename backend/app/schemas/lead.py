from datetime import datetime
from pydantic import BaseModel, Field


class LeadBase(BaseModel):
    name: str | None = None
    phone: str
    comment: str | None = None


class LeadCreate(LeadBase):
    """Схема для создания заявки с публичного сайта."""
    # Honeypot: невидимые поля, которые заполняют только боты.
    # Названия намеренно не похожи на имя, фамилию, email или телефон — иначе их
    # заполняет автозаполнение браузера, и заявка живого человека считается спамом.
    subject_line: str | None = Field(None, description="Honeypot field - must be empty")
    reference_code: str | None = Field(None, description="Another honeypot field")

    # Старые названия honeypot-полей: принимаем, но не проверяем, чтобы заявки
    # из уже открытых у посетителей вкладок со старой версией сайта не терялись
    email_confirm: str | None = Field(None, deprecated=True)
    last_name: str | None = Field(None, deprecated=True)


class LeadUpdate(BaseModel):
    """Схема для обновления статуса заявки админом."""
    status: str


class LeadAdmin(LeadBase):
    """Схема для списка заявок в админке."""
    id: int
    status: str
    source_url: str | None = None
    ip_address: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    items: list[LeadAdmin]
    total: int
    page: int
    size: int
