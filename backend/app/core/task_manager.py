import uuid
from typing import Dict, Optional, List
from datetime import datetime
from enum import Enum
from app.models.schemas.question import QuestionItem


class TaskStatus(str, Enum):
    """Task processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "success"  # 改为"success"以匹配前端
    FAILED = "failed"


class TaskInfo:
    """Task information container"""
    def __init__(self, task_id: str, metadata: Optional[dict] = None):
        self.task_id = task_id
        self.status = TaskStatus.PENDING
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.metadata = metadata
        self.questions: Optional[List[QuestionItem]] = None
        self.error: Optional[str] = None


class TaskManager:
    """In-memory task manager for tracking parsing tasks"""

    def __init__(self):
        self._tasks: Dict[str, TaskInfo] = {}

    def create_task(self, metadata: Optional[dict] = None) -> str:
        """Create a new task and return task ID"""
        task_id = str(uuid.uuid4())
        self._tasks[task_id] = TaskInfo(task_id, metadata)
        return task_id

    def get_task(self, task_id: str) -> Optional[TaskInfo]:
        """Get task information by ID"""
        return self._tasks.get(task_id)

    def update_status(self, task_id: str, status: TaskStatus) -> None:
        """Update task status"""
        task = self._tasks.get(task_id)
        if task:
            task.status = status
            task.updated_at = datetime.now()

    def set_result(self, task_id: str, questions: List[QuestionItem]) -> None:
        """Set task result (parsed questions)"""
        task = self._tasks.get(task_id)
        if task:
            task.questions = questions
            task.status = TaskStatus.COMPLETED
            task.updated_at = datetime.now()

    def set_error(self, task_id: str, error: str) -> None:
        """Set task error"""
        task = self._tasks.get(task_id)
        if task:
            task.error = error
            task.status = TaskStatus.FAILED
            task.updated_at = datetime.now()


# Global task manager instance
task_manager = TaskManager()
