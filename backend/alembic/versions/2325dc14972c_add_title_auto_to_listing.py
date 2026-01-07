"""add_title_auto_to_listing

Revision ID: 2325dc14972c
Revises: d9ac3e5c6e90
Create Date: 2026-01-03 21:31:24.761866

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2325dc14972c'
down_revision: Union[str, Sequence[str], None] = 'd9ac3e5c6e90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Добавляем только то, что реально нужно проекту, игнорируя системные таблицы PostGIS
    # Сначала проверяем, нет ли уже такой колонки (на всякий случай)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('listings')]
    
    if 'title_auto' not in columns:
        op.add_column('listings', sa.Column('title_auto', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('listings', 'title_auto')
