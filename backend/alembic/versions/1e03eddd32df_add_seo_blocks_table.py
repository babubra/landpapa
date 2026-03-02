"""add_seo_blocks_table

Revision ID: 1e03eddd32df
Revises: 4cc8fec21a0c
Create Date: 2026-03-02 23:01:26.237571

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1e03eddd32df'
down_revision: Union[str, Sequence[str], None] = '4cc8fec21a0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('seo_blocks',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('subtitle', sa.String(length=255), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('link_url', sa.String(length=255), nullable=False),
    sa.Column('location_id', sa.Integer(), nullable=True),
    sa.Column('land_use_filter', sa.String(length=50), nullable=True),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_seo_blocks_location_id'), 'seo_blocks', ['location_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_seo_blocks_location_id'), table_name='seo_blocks')
    op.drop_table('seo_blocks')
