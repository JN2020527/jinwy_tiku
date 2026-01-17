from pydantic import BaseModel, Field
from typing import Optional, List


class QuestionItem(BaseModel):
    """Question item schema - matches frontend interface"""
    id: str = Field(..., description="Question ID")
    number: str = Field(..., description="Question number (e.g., '1', '2', '(1)', '(2)')")
    type: str = Field(..., description="Question type (e.g., '选择题', '填空题', '解答题')")
    stem: str = Field(..., description="Question stem in HTML format")
    options: Optional[List[str]] = Field(None, description="Answer options for multiple choice questions")
    answer: str = Field(..., description="Answer in HTML format")
    analysis: Optional[str] = Field(None, description="Solution analysis in HTML format")
    knowledgePoints: Optional[List[str]] = Field(None, description="Knowledge point IDs", alias="knowledgePoints")
    difficulty: Optional[int] = Field(None, ge=1, le=5, description="Difficulty level (1-5)")
    parentId: Optional[str] = Field(None, description="Parent question ID for sub-questions", alias="parentId")
    children: Optional[List['QuestionItem']] = Field(None, description="Sub-questions for material questions")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "1",
                "number": "1",
                "type": "选择题",
                "stem": "<p>下列关于化学反应的说法正确的是</p>",
                "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
                "answer": "<p>C</p>",
                "analysis": "<p>根据化学反应原理...</p>",
                "knowledgePoints": ["化学反应", "化学平衡"],
                "difficulty": 3
            }
        }


# Enable forward references for recursive model
QuestionItem.model_rebuild()
