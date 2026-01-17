# Word Paper Parsing Backend

Backend API for parsing Word documents into structured question data for the Jinwenyuan Paper Management System.

## Tech Stack

- **Python 3.11+**
- **FastAPI** - Modern web framework
- **PostgreSQL** - Database
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **python-docx** - Word document parsing
- **lxml** - XML processing for formulas

## Prerequisites

- Python 3.11 or higher
- Docker and Docker Compose (for PostgreSQL)
- pip (Python package manager)

## Installation

### 1. Clone and Navigate

```bash
cd /Users/hua/my-repo/jinwy_tiku/backend
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env if needed
```

### 5. Start PostgreSQL

```bash
docker-compose up -d
```

### 6. Run Database Migrations

```bash
alembic upgrade head
```

## Running the Application

### Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## API Endpoints

### Paper Upload and Parsing

- `POST /api/paper/upload` - Upload Word document
- `GET /api/paper/result/{taskId}` - Get parsing result
- `POST /api/paper/submit` - Submit proofread questions

### Health Check

- `GET /` - Root endpoint
- `GET /health` - Health check

## Project Structure

```
backend/
├── app/
│   ├── api/v1/          # API endpoints
│   ├── core/            # Core functionality (parsers, task manager)
│   ├── models/          # Database and Pydantic models
│   ├── services/        # Business logic
│   ├── config.py        # Configuration
│   ├── database.py      # Database connection
│   └── main.py          # FastAPI entry point
├── migrations/          # Alembic migrations
├── storage/             # File storage
├── docker-compose.yml   # PostgreSQL container
└── requirements.txt     # Python dependencies
```

## Development

### Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback:
```bash
alembic downgrade -1
```

### Testing

```bash
pytest
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `UPLOAD_DIR` - Directory for uploaded files
- `IMAGE_DIR` - Directory for extracted images
- `MAX_FILE_SIZE` - Maximum upload file size (bytes)
