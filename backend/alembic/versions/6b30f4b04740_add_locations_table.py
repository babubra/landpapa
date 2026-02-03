"""add_locations_table

Revision ID: 6b30f4b04740
Revises: ccf4185ecf3a
Create Date: 2026-02-02 20:31:24.040042

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6b30f4b04740'
down_revision: Union[str, Sequence[str], None] = 'ccf4185ecf3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Создание таблицы locations для новой иерархии локаций."""
    from sqlalchemy.dialects import postgresql
    
    # Создаём enum для типов локаций (с проверкой существования)
    locationtype = postgresql.ENUM('REGION', 'DISTRICT', 'CITY', 'SETTLEMENT', name='locationtype', create_type=False)
    locationtype.create(op.get_bind(), checkfirst=True)
    
    # Создаём таблицу locations
    op.create_table('locations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('fias_id', sa.String(length=36), nullable=True),
        sa.Column('type', locationtype, nullable=False),
        sa.Column('settlement_type', sa.String(length=20), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['parent_id'], ['locations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_locations_fias_id'), 'locations', ['fias_id'], unique=True)
    op.create_index(op.f('ix_locations_parent_id'), 'locations', ['parent_id'], unique=False)
    op.create_index(op.f('ix_locations_slug'), 'locations', ['slug'], unique=True)


def downgrade() -> None:
    """Удаление таблицы locations."""
    op.drop_index(op.f('ix_locations_slug'), table_name='locations')
    op.drop_index(op.f('ix_locations_parent_id'), table_name='locations')
    op.drop_index(op.f('ix_locations_fias_id'), table_name='locations')
    op.drop_table('locations')
    
    # Удаляем enum
    sa.Enum(name='locationtype').drop(op.get_bind(), checkfirst=True)
