"""Add lead model

Revision ID: ccf4185ecf3a
Revises: 1139e9b3f5ab
Create Date: 2026-01-07 20:07:51.338479

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ccf4185ecf3a'
down_revision: Union[str, Sequence[str], None] = '1139e9b3f5ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Создаем таблицу лидов
    op.create_table('leads',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='new'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_leads_phone'), 'leads', ['phone'], unique=False)
    op.create_index(op.f('ix_leads_status'), 'leads', ['status'], unique=False)
    
    # 2. Добавляем email для администраторов (если его нет)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    admin_columns = [c['name'] for c in inspector.get_columns('admin_users')]
    
    if 'email' not in admin_columns:
        op.add_column('admin_users', sa.Column('email', sa.String(length=255), nullable=True))
        op.create_index(op.f('ix_admin_users_email'), 'admin_users', ['email'], unique=True)
    
    # 3. Удаление колонки company у риэлторов (если она есть)
    realtor_columns = [c['name'] for c in inspector.get_columns('realtors')]
    if 'company' in realtor_columns:
        op.drop_column('realtors', 'company')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('realtors', sa.Column('company', sa.VARCHAR(length=255), autoincrement=False, nullable=True))
    op.drop_index(op.f('ix_admin_users_email'), table_name='admin_users')
    op.drop_column('admin_users', 'email')
    op.drop_index(op.f('ix_leads_status'), table_name='leads')
    op.drop_index(op.f('ix_leads_phone'), table_name='leads')
    op.drop_table('leads')
