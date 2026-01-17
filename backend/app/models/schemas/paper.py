from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from app.models.schemas.question import QuestionItem


class PaperMetadata(BaseModel):
    """Paper metadata schema"""
    name: str = Field(..., description="Paper name")
    subject: str = Field(..., description="Subject (e.g., '化学', '数学')")
    year: Optional[str] = Field(None, description="Year (e.g., '2024')")
    region: Optional[str] = Field(None, description="Region (e.g., '全国卷', '北京卷')")
    paperType: Optional[str] = Field(None, description="Paper type (e.g., '高考真题', '模拟试卷')", alias="paperType")
    mode: Literal['paper', 'question'] = Field(..., description="Entry mode: 'paper' (试卷录入) or 'question' (试题录入)")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "name": "2024年全国高考化学试卷",
                "subject": "化学",
                "year": "2024",
                "region": "全国卷I",
                "paperType": "高考真题",
                "mode": "paper"
            }
        }


class UploadResponse(BaseModel):
    """Response for paper upload endpoint"""
    taskId: str = Field(..., description="Task ID for tracking parsing progress", alias="taskId")

    class Config:
        populate_by_name = True


class ParseResult(BaseModel):
    """Parse result schema - returned by GET /api/paper/result/:taskId"""
    taskId: str = Field(..., description="Task ID", alias="taskId")
    status: str = Field(..., description="Processing status: processing, success, failed")
    metadata: Optional[PaperMetadata] = Field(None, description="Paper metadata")
    questions: List[QuestionItem] = Field(default_factory=list, description="Parsed questions")
    error: Optional[str] = Field(None, description="Error message (only when status=failed)")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "taskId": "550e8400-e29b-41d4-a716-446655440000",
                "status": "completed",
                "questions": []
            }
        }


class SubmitRequest(BaseModel):
    """Request for submitting proofread questions"""
    taskId: str = Field(..., description="Task ID", alias="taskId")
    questions: List[QuestionItem] = Field(..., description="Proofread questions")

    class Config:
        populate_by_name = True
