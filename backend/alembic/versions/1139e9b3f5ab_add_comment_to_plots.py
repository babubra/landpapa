"""add_comment_to_plots

Revision ID: 1139e9b3f5ab
Revises: 2325dc14972c
Create Date: 2026-01-04 23:58:06.542860

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1139e9b3f5ab'
down_revision: Union[str, Sequence[str], None] = '2325dc14972c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Добавить поле comment в таблицу plots."""
    op.add_column('plots', sa.Column('comment', sa.Text(), nullable=True))


def downgrade() -> None:
    """Удалить поле comment из таблицы plots."""
    op.drop_column('plots', 'comment')
