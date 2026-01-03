"""init

Revision ID: d9ac3e5c6e90
Revises: 
Create Date: 2026-01-02 22:04:45.258678

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd9ac3e5c6e90'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('images', sa.Column('original_filename', sa.String(length=255), nullable=True))
    op.add_column('images', sa.Column('mime_type', sa.String(length=100), nullable=True))
    op.add_column('images', sa.Column('size', sa.Integer(), nullable=True))
    op.add_column('images', sa.Column('width', sa.Integer(), nullable=True))
    op.add_column('images', sa.Column('height', sa.Integer(), nullable=True))
    op.alter_column('images', 'entity_type',
               existing_type=sa.VARCHAR(length=50),
               nullable=True)
    op.alter_column('images', 'entity_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    # Удаляем старые индексы, если они есть
    op.drop_index('ix_images_entity_id', table_name='images', if_exists=True)
    op.drop_index('ix_images_entity_type', table_name='images', if_exists=True)
    # Создаем составной индекс
    op.create_index('ix_images_entity', 'images', ['entity_type', 'entity_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_images_entity', table_name='images')
    op.create_index('ix_images_entity_type', 'images', ['entity_type'], unique=False)
    op.create_index('ix_images_entity_id', 'images', ['entity_id'], unique=False)
    op.alter_column('images', 'entity_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('images', 'entity_type',
               existing_type=sa.VARCHAR(length=50),
               nullable=False)
    op.drop_column('images', 'height')
    op.drop_column('images', 'width')
    op.drop_column('images', 'size')
    op.drop_column('images', 'mime_type')
    op.drop_column('images', 'original_filename')
