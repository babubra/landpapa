"""add name_locative to locations

Revision ID: a1b2c3d4e5f6
Revises: e994d6886d77
Create Date: 2026-02-05 19:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e994d6886d77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('locations', sa.Column('name_locative', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('locations', 'name_locative')
