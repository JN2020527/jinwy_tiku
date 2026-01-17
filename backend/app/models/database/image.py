from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger
from sqlalchemy.sql import func
from app.database import Base


class Image(Base):
    """Image table - stores extracted images from Word documents"""
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(36), ForeignKey("papers.task_id", ondelete="CASCADE"), nullable=False, index=True)

    # File information
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    content_type = Column(String(50), nullable=False)  # e.g., "image/png", "image/jpeg"
    size = Column(BigInteger, nullable=False)  # File size in bytes

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
