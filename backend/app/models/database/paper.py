from sqlalchemy import Column, String, JSON, DateTime, Enum
from sqlalchemy.sql import func
import enum
from app.database import Base


class PaperStatus(str, enum.Enum):
    """Paper processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Paper(Base):
    """Paper document table"""
    __tablename__ = "papers"
    __table_args__ = {'schema': 'tiku'}

    task_id = Column(String(36), primary_key=True, index=True)
    file_hash = Column(String(64), nullable=False, index=True)
    filename = Column(String(255), nullable=False)

    # Paper metadata (name, subject, year, region, type, mode)
    paper_metadata = Column(JSON, nullable=False)

    status = Column(Enum(PaperStatus), default=PaperStatus.PENDING, nullable=False)
    error_message = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
