from datetime import datetime
from pydantic import BaseModel, Field


class LeadBase(BaseModel):
    name: str | None = None
    phone: str
    comment: str | None = None


class LeadCreate(LeadBase):
    """Схема для создания заявки с публичного сайта."""
    # Ловушка для ботов: скрытый чекбокс. Именно чекбокс, а не текстовое поле —
    # автозаполнение браузера заполняет скрытые текстовые поля независимо от их
    # названия и раньше топило заявки живых людей, а чекбоксы оно не трогает.
    subscribe_updates: bool | None = Field(None, description="Honeypot - должен остаться пустым")

    # Сколько миллисекунд форма была открыта до отправки: человек не успевает
    # заполнить имя и телефон за секунду, а бот отправляет мгновенно
    form_time_ms: int | None = Field(None, description="Время заполнения формы, мс")

    # Старые honeypot-поля: принимаем, но не проверяем, чтобы заявки из уже
    # открытых у посетителей вкладок со старой версией сайта не терялись
    subject_line: str | None = Field(None, deprecated=True)
    reference_code: str | None = Field(None, deprecated=True)
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
