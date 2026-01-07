from datetime import datetime
from pydantic import BaseModel, Field


class LeadBase(BaseModel):
    name: str | None = None
    phone: str
    comment: str | None = None


class LeadCreate(LeadBase):
    """Схема для создания заявки с публичного сайта."""
    # Поля для Honeypot (невидимые для человека)
    email_confirm: str | None = Field(None, description="Honeypot field - must be empty")
    last_name: str | None = Field(None, description="Another honeypot field")


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
