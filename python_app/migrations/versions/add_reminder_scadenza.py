"""Aggiunge reminder_scadenza_inviato a prenotazioni"""
from alembic import op
import sqlalchemy as sa

revision = 'add_reminder_scadenza'
down_revision = 'add_email_non_valida'

def upgrade():
    with op.batch_alter_table('prenotazioni') as batch_op:
        batch_op.add_column(sa.Column('reminder_scadenza_inviato', sa.Boolean(), server_default='0', nullable=False))

def downgrade():
    with op.batch_alter_table('prenotazioni') as batch_op:
        batch_op.drop_column('reminder_scadenza_inviato')
