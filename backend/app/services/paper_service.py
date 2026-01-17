from sqlalchemy.orm import Session
from typing import Optional, Dict
from app.models.database.paper import Paper, PaperStatus
from app.models.schemas.paper import PaperMetadata
import hashlib


class PaperService:
    """Service for paper-related business logic"""

    def __init__(self, db: Session):
        """
        Initialize paper service

        Args:
            db: Database session
        """
        self.db = db

    def create_paper(
        self,
        task_id: str,
        filename: str,
        file_content: bytes,
        metadata: PaperMetadata
    ) -> Paper:
        """
        Create a new paper record

        Args:
            task_id: Unique task ID
            filename: Original filename
            file_content: File binary content for hash calculation
            metadata: Paper metadata

        Returns:
            Created Paper object
        """
        # Calculate file hash
        file_hash = hashlib.sha256(file_content).hexdigest()

        # Create paper record
        paper = Paper(
            task_id=task_id,
            file_hash=file_hash,
            filename=filename,
            paper_metadata=metadata.model_dump(),
            status=PaperStatus.PENDING
        )

        self.db.add(paper)
        self.db.commit()
        self.db.refresh(paper)

        return paper

    def get_paper_by_task_id(self, task_id: str) -> Optional[Paper]:
        """
        Get paper by task ID

        Args:
            task_id: Task ID

        Returns:
            Paper object or None
        """
        return self.db.query(Paper).filter(Paper.task_id == task_id).first()

    def update_status(self, task_id: str, status: PaperStatus, error_message: Optional[str] = None):
        """
        Update paper status

        Args:
            task_id: Task ID
            status: New status
            error_message: Error message if status is FAILED
        """
        paper = self.get_paper_by_task_id(task_id)
        if paper:
            paper.status = status
            if error_message:
                paper.error_message = error_message
            self.db.commit()

    def check_duplicate(self, file_hash: str) -> Optional[Paper]:
        """
        Check if a paper with the same file hash already exists

        Args:
            file_hash: File hash to check

        Returns:
            Existing Paper object or None
        """
        return self.db.query(Paper).filter(Paper.file_hash == file_hash).first()
