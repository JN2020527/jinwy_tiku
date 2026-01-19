"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-01-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure tiku schema exists
    op.execute('CREATE SCHEMA IF NOT EXISTS tiku')

    # Create papers table
    op.create_table(
        'papers',
        sa.Column('task_id', sa.String(36), nullable=False),
        sa.Column('file_hash', sa.String(64), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('paper_metadata', sa.JSON(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', name='paperstatus'), nullable=False),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('task_id')
    )
    op.create_index(op.f('ix_papers_task_id'), 'papers', ['task_id'], unique=False)
    op.create_index(op.f('ix_papers_file_hash'), 'papers', ['file_hash'], unique=False)

    # Create question_groups table
    op.create_table(
        'question_groups',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_id', sa.String(36), nullable=False),
        sa.Column('number', sa.String(20), nullable=False),
        sa.Column('material_content', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['papers.task_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_question_groups_task_id'), 'question_groups', ['task_id'], unique=False)

    # Create questions table
    op.create_table(
        'questions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_id', sa.String(36), nullable=False),
        sa.Column('number', sa.String(20), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('difficulty', sa.Integer(), nullable=True),
        sa.Column('knowledge_points', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('answer_raw', sa.Text(), nullable=True),
        sa.Column('group_id', sa.Integer(), nullable=True),
        sa.Column('parent_number', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['papers.task_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['group_id'], ['question_groups.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_questions_task_id'), 'questions', ['task_id'], unique=False)
    op.create_index(op.f('ix_questions_group_id'), 'questions', ['group_id'], unique=False)

    # Create question_contents table
    op.create_table(
        'question_contents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('content_type', sa.Enum('STEM', 'ANSWER', 'ANALYSIS', 'OPTIONS', name='contenttype'), nullable=False),
        sa.Column('tokens', sa.JSON(), nullable=False),
        sa.Column('html', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_question_contents_question_id'), 'question_contents', ['question_id'], unique=False)

    # Create images table
    op.create_table(
        'images',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_id', sa.String(36), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('content_type', sa.String(50), nullable=False),
        sa.Column('size', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['papers.task_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_images_task_id'), 'images', ['task_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_images_task_id'), table_name='images')
    op.drop_table('images')

    op.drop_index(op.f('ix_question_contents_question_id'), table_name='question_contents')
    op.drop_table('question_contents')

    op.drop_index(op.f('ix_questions_group_id'), table_name='questions')
    op.drop_index(op.f('ix_questions_task_id'), table_name='questions')
    op.drop_table('questions')

    op.drop_index(op.f('ix_question_groups_task_id'), table_name='question_groups')
    op.drop_table('question_groups')

    op.drop_index(op.f('ix_papers_file_hash'), table_name='papers')
    op.drop_index(op.f('ix_papers_task_id'), table_name='papers')
    op.drop_table('papers')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS contenttype')
    op.execute('DROP TYPE IF EXISTS paperstatus')
