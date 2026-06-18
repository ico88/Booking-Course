"""add validazione preventiva fields
Revision ID: add_validazione_preventiva
Revises: add_visite_corso
Create Date: 2026-06-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_validazione_preventiva'
down_revision = 'add_visite_corso'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('corsi') as batch_op:
        batch_op.add_column(sa.Column('validazione_preventiva', sa.Boolean(), server_default='0', nullable=True))
        batch_op.add_column(sa.Column('descrizione_prerequisito', sa.String(500), nullable=True))
    with op.batch_alter_table('prenotazioni') as batch_op:
        batch_op.add_column(sa.Column('prerequisito_url', sa.String(500), nullable=True))
        batch_op.add_column(sa.Column('prerequisito_nome_file', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('note_rifiuto', sa.Text(), nullable=True))

def downgrade():
    with op.batch_alter_table('corsi') as batch_op:
        batch_op.drop_column('validazione_preventiva')
        batch_op.drop_column('descrizione_prerequisito')
    with op.batch_alter_table('prenotazioni') as batch_op:
        batch_op.drop_column('prerequisito_url')
        batch_op.drop_column('prerequisito_nome_file')
        batch_op.drop_column('note_rifiuto')
