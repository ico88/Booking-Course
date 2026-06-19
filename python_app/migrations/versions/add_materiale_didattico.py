"""Libreria materiale didattico centralizzata (sostituisce materiale_corso)"""
from alembic import op
import sqlalchemy as sa

revision = 'add_materiale_didattico'
down_revision = 'add_materiale_corso'


def upgrade():
    op.create_table('materiale_didattico',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('nome_file', sa.String(255), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('dimensione', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by'], ['utenti.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('corso_materiale',
        sa.Column('corso_id', sa.String(), nullable=False),
        sa.Column('materiale_id', sa.String(), nullable=False),
        sa.Column('aggiunto_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['corso_id'], ['corsi.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['materiale_id'], ['materiale_didattico.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('corso_id', 'materiale_id')
    )
    # drop old per-course table (no data to migrate — feature was just added)
    op.drop_table('materiale_corso')


def downgrade():
    op.drop_table('corso_materiale')
    op.drop_table('materiale_didattico')
    op.create_table('materiale_corso',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('corso_id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('nome_file', sa.String(255), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('dimensione', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
