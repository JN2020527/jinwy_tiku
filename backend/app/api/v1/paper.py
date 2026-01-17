from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import hashlib
import os
import json
import glob
from typing import List

from app.models.schemas.paper import PaperMetadata, UploadResponse, ParseResult, SubmitRequest
from app.models.schemas.response import ApiResponse
from app.models.schemas.question import QuestionItem
from app.core.task_manager import task_manager, TaskStatus
from app.database import get_db
from app.config import get_settings, init_storage
from app.services.parse_service import ParseService
from app.services.question_service import QuestionService

router = APIRouter()
settings = get_settings()


def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA256 hash of file content"""
    return hashlib.sha256(content).hexdigest()


async def parse_paper_async(task_id: str, file_path: str, metadata: dict):
    """Background task for parsing paper"""
    try:
        task_manager.update_status(task_id, TaskStatus.PROCESSING)

        # Initialize parse service
        parse_service = ParseService(file_path, task_id)

        # Execute parsing
        questions = parse_service.parse()

        # Set result
        task_manager.set_result(task_id, questions)
    except Exception as e:
        task_manager.set_error(task_id, str(e))


@router.post("/upload", response_model=ApiResponse[UploadResponse])
async def upload_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    metadata: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload Word document for parsing

    - Accepts .docx files and metadata JSON string
    - Returns taskId for tracking parsing progress
    """
    # Validate file type
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > settings.max_file_size:
        raise HTTPException(status_code=400, detail="File size exceeds maximum limit")

    # Calculate file hash
    file_hash = calculate_file_hash(content)

    # Initialize storage directories
    init_storage()

    # Parse and validate metadata
    try:
        metadata_dict = json.loads(metadata)
        paper_metadata = PaperMetadata(**metadata_dict)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid metadata: {str(e)}")

    # Convert to dict for storage
    metadata_for_storage = paper_metadata.model_dump()

    # Create task with metadata
    task_id = task_manager.create_task(metadata_for_storage)

    # Save file
    file_path = os.path.join(settings.upload_dir, f"{task_id}.docx")
    with open(file_path, "wb") as f:
        f.write(content)

    # Start background parsing task
    background_tasks.add_task(parse_paper_async, task_id, file_path, metadata_for_storage)

    return ApiResponse(
        success=True,
        message="File uploaded successfully",
        data=UploadResponse(taskId=task_id)
    )


@router.get("/result/{task_id}", response_model=ApiResponse[ParseResult])
async def get_parse_result(task_id: str):
    """
    Get parsing result by task ID

    - Returns status: pending, processing, completed, failed
    - Returns questions array when status=completed
    """
    task = task_manager.get_task(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    result = ParseResult(
        taskId=task_id,
        status=task.status.value,
        metadata=task.metadata,
        questions=task.questions if task.questions else [],
        error=task.error if task.status == TaskStatus.FAILED else None
    )

    return ApiResponse(
        success=True,
        message="Task retrieved successfully",
        data=result
    )


@router.post("/submit", response_model=ApiResponse[dict])
async def submit_questions(
    request: SubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Submit proofread questions to database

    - Saves questions to database
    - Returns success status
    """
    task = task_manager.get_task(request.taskId)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Save questions to database
    question_service = QuestionService(db)
    count = question_service.save_questions(request.taskId, request.questions)

    return ApiResponse(
        success=True,
        message=f"Successfully submitted {count} questions",
        data={"count": count}
    )


@router.get("/images/{task_id}/{image_id}")
async def get_image(task_id: str, image_id: str):
    """
    Get image by task ID and image ID

    - Returns image file
    """
    # Construct image directory path
    image_dir = os.path.join(settings.image_dir, task_id)

    if not os.path.exists(image_dir):
        raise HTTPException(status_code=404, detail="Image directory not found")

    # Find image file matching the pattern image_{image_id}_*.{ext}
    pattern = os.path.join(image_dir, f"image_{image_id}_*.*")
    matching_files = glob.glob(pattern)

    if not matching_files:
        raise HTTPException(status_code=404, detail="Image not found")

    # Return the first matching file
    image_path = matching_files[0]

    # Determine media type based on file extension
    ext = os.path.splitext(image_path)[1].lower()
    media_type_map = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp'
    }
    media_type = media_type_map.get(ext, 'image/png')

    return FileResponse(image_path, media_type=media_type)
