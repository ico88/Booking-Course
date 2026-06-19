"""Aggiunge tabella materiale_corso per materiale didattico dei corsi"""
from alembic import op
import sqlalchemy as sa

revision = 'add_materiale_corso'
down_revision = 'add_media_library'


def upgrade():
    op.create_table('materiale_corso',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('corso_id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('nome_file', sa.String(255), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('dimensione', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['corso_id'], ['corsi.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['utenti.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_materiale_corso_corso_id', 'materiale_corso', ['corso_id'])


def downgrade():
    op.drop_index('ix_materiale_corso_corso_id', 'materiale_corso')
    op.drop_table('materiale_corso')
