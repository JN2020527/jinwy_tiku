from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, ARRAY, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Question(Base):
    """Question table - structured question data"""
    __tablename__ = "questions"
    __table_args__ = {'schema': 'tiku'}

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(36), ForeignKey("papers.task_id", ondelete="CASCADE"), nullable=False, index=True)

    # Question identification
    number = Column(String(20), nullable=False)  # e.g., "1", "2", "(1)", "(2)"
    type = Column(String(50), nullable=False)  # e.g., "选择题", "填空题", "解答题"

    # Question attributes
    difficulty = Column(Integer, nullable=True)  # 1-5
    knowledge_points = Column(ARRAY(String), nullable=True)  # Array of knowledge point IDs

    # Raw answer text (before token processing)
    answer_raw = Column(Text, nullable=True)

    # Material question grouping
    group_id = Column(Integer, ForeignKey("question_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    parent_number = Column(String(20), nullable=True)  # Parent question number for sub-questions

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    group = relationship("QuestionGroup", back_populates="questions")
