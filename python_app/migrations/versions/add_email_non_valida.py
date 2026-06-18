"""add email_non_valida to leads and utenti
Revision ID: add_email_non_valida
Revises: add_validazione_preventiva
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_email_non_valida'
down_revision = 'add_validazione_preventiva'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('leads_marketing') as batch_op:
        batch_op.add_column(sa.Column('email_non_valida', sa.Boolean(), server_default='0', nullable=False))
    with op.batch_alter_table('utenti') as batch_op:
        batch_op.add_column(sa.Column('email_non_valida', sa.Boolean(), server_default='0', nullable=False))

def downgrade():
    with op.batch_alter_table('leads_marketing') as batch_op:
        batch_op.drop_column('email_non_valida')
    with op.batch_alter_table('utenti') as batch_op:
        batch_op.drop_column('email_non_valida')
