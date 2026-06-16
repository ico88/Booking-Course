"""add invii_marketing table

Revision ID: add_invii_marketing
Revises: add_tags_marketing
Create Date: 2026-06-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_invii_marketing'
down_revision = 'add_tags_marketing'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'invii_marketing',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('corso_id', sa.String(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('inviato_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['corso_id'], ['corsi.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('corso_id', 'email', name='uq_invio_corso_email'),
    )
    op.create_index('ix_invii_marketing_corso_id', 'invii_marketing', ['corso_id'])
    op.create_index('ix_invii_marketing_email', 'invii_marketing', ['email'])


def downgrade():
    op.drop_index('ix_invii_marketing_email', table_name='invii_marketing')
    op.drop_index('ix_invii_marketing_corso_id', table_name='invii_marketing')
    op.drop_table('invii_marketing')
