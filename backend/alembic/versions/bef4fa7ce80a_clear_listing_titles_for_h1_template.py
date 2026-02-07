"""clear_listing_titles_for_h1_template

Revision ID: bef4fa7ce80a
Revises: b2c3d4e5f6a7
Create Date: 2026-02-06 10:11:53.631572

Очистка заголовков listings для перехода на генерацию H1 по шаблону.
Теперь H1 генерируется на фронтенде, а поле title используется только
для ручного переопределения заголовка.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'bef4fa7ce80a'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Делаем title nullable и очищаем все существующие значения."""
    # Сначала разрешаем NULL для колонки title
    op.alter_column('listings', 'title',
                    existing_type=sa.String(),
                    nullable=True)
    # Затем очищаем все существующие title
    op.execute("UPDATE listings SET title = NULL WHERE title IS NOT NULL")


def downgrade() -> None:
    """Восстанавливаем NOT NULL constraint (данные title утеряны)."""
    # Заполняем пустые title placeholder-значениями
    op.execute("UPDATE listings SET title = 'Участок ' || id WHERE title IS NULL")
    op.alter_column('listings', 'title',
                    existing_type=sa.String(),
                    nullable=False)

