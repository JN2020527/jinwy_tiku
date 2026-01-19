from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Text, Enum
from sqlalchemy.sql import func
import enum
from app.database import Base


class ContentType(str, enum.Enum):
    """Content type for question parts"""
    STEM = "stem"
    ANSWER = "answer"
    ANALYSIS = "analysis"
    OPTIONS = "options"


class QuestionContent(Base):
    """Question content table - stores rich text token streams"""
    __tablename__ = "question_contents"
    __table_args__ = {'schema': 'tiku'}

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)

    # Content type (stem, answer, analysis, options)
    content_type = Column(Enum(ContentType), nullable=False)

    # Token stream (JSON array of token objects)
    # Format: [{"t":"text","v":"content"}, {"t":"math","omml":"...","mathml":"..."}, {"t":"img","ref":123}]
    tokens = Column(JSON, nullable=False)

    # Rendered HTML (for frontend display)
    html = Column(Text, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
