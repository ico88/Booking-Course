"""Aggiunge tabella media_files e campagne email libere"""
from alembic import op
import sqlalchemy as sa

revision = 'add_media_library'
down_revision = 'add_reminder_scadenza'


def upgrade():
    op.create_table('media_files',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('nome_file', sa.String(255), nullable=False),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('dimensione', sa.Integer(), nullable=True),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by'], ['utenti.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('campagne_libere',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('oggetto', sa.String(255), nullable=False),
        sa.Column('corpo_html', sa.Text(), nullable=False),
        sa.Column('tag_filtro', sa.Text(), nullable=True),
        sa.Column('allegato_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('creato_da', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['allegato_id'], ['media_files.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['creato_da'], ['utenti.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('invii_campagne_libere',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('campagna_id', sa.String(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('inviato_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['campagna_id'], ['campagne_libere.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('invii_campagne_libere')
    op.drop_table('campagne_libere')
    op.drop_table('media_files')
