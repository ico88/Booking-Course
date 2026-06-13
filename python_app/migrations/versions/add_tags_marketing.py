"""add tags_marketing to utenti

Revision ID: add_tags_marketing
Revises: 
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_tags_marketing'
down_revision = 'dddaac545046'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('utenti') as batch_op:
        batch_op.add_column(sa.Column('tags_marketing', sa.JSON(), nullable=True))

def downgrade():
    with op.batch_alter_table('utenti') as batch_op:
        batch_op.drop_column('tags_marketing')
