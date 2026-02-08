"""add_telegram_id_to_admin_users

Revision ID: 4cc8fec21a0c
Revises: bef4fa7ce80a
Create Date: 2026-02-08 19:06:09.621381

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4cc8fec21a0c'
down_revision: Union[str, Sequence[str], None] = 'bef4fa7ce80a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Добавить telegram_id в admin_users."""
    op.add_column('admin_users', sa.Column('telegram_id', sa.BigInteger(), nullable=True))
    op.create_index(op.f('ix_admin_users_telegram_id'), 'admin_users', ['telegram_id'], unique=True)


def downgrade() -> None:
    """Удалить telegram_id из admin_users."""
    op.drop_index(op.f('ix_admin_users_telegram_id'), table_name='admin_users')
    op.drop_column('admin_users', 'telegram_id')
