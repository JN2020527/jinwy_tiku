from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.database.question import Question
from app.models.database.question_content import QuestionContent, ContentType
from app.models.database.question_group import QuestionGroup
from app.models.schemas.question import QuestionItem


class QuestionService:
    """Service for question-related business logic"""

    def __init__(self, db: Session):
        """
        Initialize question service

        Args:
            db: Database session
        """
        self.db = db

    def save_questions(self, task_id: str, questions: List[QuestionItem]) -> int:
        """
        Save questions to database

        Args:
            task_id: Task ID
            questions: List of QuestionItem objects

        Returns:
            Number of questions saved
        """
        count = 0

        for question_item in questions:
            if question_item.children:
                # Material question with sub-questions
                count += self._save_material_question(task_id, question_item)
            else:
                # Regular question
                self._save_regular_question(task_id, question_item)
                count += 1

        self.db.commit()
        return count

    def _save_regular_question(
        self,
        task_id: str,
        question_item: QuestionItem,
        group_id: Optional[int] = None
    ) -> Question:
        """
        Save a regular question to database

        Args:
            task_id: Task ID
            question_item: QuestionItem object
            group_id: Optional group ID for sub-questions

        Returns:
            Created Question object
        """
        # Create question record
        question = Question(
            task_id=task_id,
            number=question_item.number,
            type=question_item.type,
            difficulty=question_item.difficulty,
            knowledge_points=question_item.knowledgePoints or [],
            answer_raw=question_item.answer,
            group_id=group_id,
            parent_number=question_item.parentId
        )

        self.db.add(question)
        self.db.flush()  # Get question ID

        # Save question contents (stem, answer, analysis)
        self._save_question_content(question.id, ContentType.STEM, question_item.stem)

        if question_item.answer:
            self._save_question_content(question.id, ContentType.ANSWER, question_item.answer)

        if question_item.analysis:
            self._save_question_content(question.id, ContentType.ANALYSIS, question_item.analysis)

        if question_item.options:
            # Save options as JSON
            options_html = "<br>".join(question_item.options)
            self._save_question_content(question.id, ContentType.OPTIONS, options_html)

        return question

    def _save_material_question(self, task_id: str, question_item: QuestionItem) -> int:
        """
        Save a material question with sub-questions

        Args:
            task_id: Task ID
            question_item: QuestionItem object with children

        Returns:
            Number of questions saved (including sub-questions)
        """
        # Create question group
        group = QuestionGroup(
            task_id=task_id,
            number=question_item.number,
            material_content=question_item.stem
        )

        self.db.add(group)
        self.db.flush()  # Get group ID

        # Save sub-questions
        count = 0
        for sub_question in question_item.children:
            self._save_regular_question(task_id, sub_question, group_id=group.id)
            count += 1

        return count

    def _save_question_content(
        self,
        question_id: int,
        content_type: ContentType,
        html: str
    ):
        """
        Save question content (stem, answer, analysis, options)

        Args:
            question_id: Question ID
            content_type: Content type
            html: HTML content
        """
        # For now, store empty tokens array
        # In production, you would parse HTML back to tokens or store tokens separately
        tokens = []

        content = QuestionContent(
            question_id=question_id,
            content_type=content_type,
            tokens=tokens,
            html=html
        )

        self.db.add(content)

    def get_questions_by_task_id(self, task_id: str) -> List[Question]:
        """
        Get all questions for a task

        Args:
            task_id: Task ID

        Returns:
            List of Question objects
        """
        return self.db.query(Question).filter(Question.task_id == task_id).all()

    def delete_questions_by_task_id(self, task_id: str):
        """
        Delete all questions for a task

        Args:
            task_id: Task ID
        """
        self.db.query(Question).filter(Question.task_id == task_id).delete()
        self.db.commit()
