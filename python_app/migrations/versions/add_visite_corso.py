"""add visite_corso table
Revision ID: add_visite_corso
Revises: add_invii_marketing
Create Date: 2026-06-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_visite_corso'
down_revision = 'add_invii_marketing'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'visite_corso',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('corso_id', sa.String(), nullable=False),
        sa.Column('visitato_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_hash', sa.String(64), nullable=True),
        sa.Column('utente_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['corso_id'], ['corsi.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['utente_id'], ['utenti.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_visite_corso_corso_id', 'visite_corso', ['corso_id'])
    op.create_index('ix_visite_corso_visitato_at', 'visite_corso', ['visitato_at'])

def downgrade():
    op.drop_index('ix_visite_corso_visitato_at', table_name='visite_corso')
    op.drop_index('ix_visite_corso_corso_id', table_name='visite_corso')
    op.drop_table('visite_corso')
