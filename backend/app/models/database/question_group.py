from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class QuestionGroup(Base):
    """Question group table - for material questions with sub-questions"""
    __tablename__ = "question_groups"
    __table_args__ = {'schema': 'tiku'}

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(36), ForeignKey("papers.task_id", ondelete="CASCADE"), nullable=False, index=True)

    # Group identification
    number = Column(String(20), nullable=False)  # e.g., "1", "2"

    # Material content (shared context for sub-questions)
    material_content = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    questions = relationship("Question", back_populates="group")
