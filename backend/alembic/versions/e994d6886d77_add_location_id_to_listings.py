"""add_location_id_to_listings

Revision ID: e994d6886d77
Revises: 6b30f4b04740
Create Date: 2026-02-02 20:41:11.346136

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e994d6886d77'
down_revision: Union[str, Sequence[str], None] = '6b30f4b04740'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Добавление location_id в таблицу listings."""
    op.add_column('listings', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_listings_location_id'), 'listings', ['location_id'], unique=False)
    op.create_foreign_key('fk_listings_location_id', 'listings', 'locations', ['location_id'], ['id'])


def downgrade() -> None:
    """Удаление location_id из таблицы listings."""
    op.drop_constraint('fk_listings_location_id', 'listings', type_='foreignkey')
    op.drop_index(op.f('ix_listings_location_id'), table_name='listings')
    op.drop_column('listings', 'location_id')
