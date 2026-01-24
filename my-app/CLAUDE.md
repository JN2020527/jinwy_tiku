# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **晋文源试卷管理系统** (Jinwenyuan Paper Management System) - a full-stack application for managing educational content, question banks, papers, and tags.

**Monorepo Structure:**
- `my-app/` - Frontend: Umi Max 4 (React) + Ant Design Pro Components
- `backend/` - Backend: FastAPI + PostgreSQL + SQLAlchemy

The system's core feature is Word document parsing: users upload Word exam papers, the backend parses them into structured questions using python-docx, and users proofread/annotate the results before submitting to the question bank.

## Development Commands

### Frontend (my-app/)
```bash
cd my-app
npm run dev          # Start development server (http://localhost:8000)
npm run build        # Build for production
npm run format       # Format code with Prettier
npm start            # Alias for npm run dev
```

### Backend (backend/)
```bash
cd backend
source venv/bin/activate    # Activate virtual environment
pip install -r requirements.txt

# Start PostgreSQL
docker-compose up -d

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback migration
alembic downgrade -1
```

**API Documentation:** http://localhost:8000/docs (FastAPI auto-generated)

## Architecture

### High-Level Architecture

**Frontend → Backend Communication:**
- Frontend proxies `/api` requests to `http://localhost:8001` (configured in `my-app/.umirc.ts`)
- **Note**: Backend actually runs on port 8000, but proxy is configured for 8001. Ensure backend runs on 8001 or update proxy config.
- Mock data disabled in favor of real backend
- All API responses follow: `{ success: boolean, message: string, data: T }`

**Core Data Flow (Word Paper Parsing):**
1. User uploads Word file + metadata → `POST /api/paper/upload`
2. Backend creates task, parses document in background → Returns `taskId`
3. Frontend polls `GET /api/paper/result/{taskId}` until status is "success"
4. User proofreads questions in full-screen editor → Submits via `POST /api/paper/submit`
5. Backend saves to database via SQLAlchemy ORM

### Frontend Architecture (my-app/)

**Framework: Umi Max 4**
- **Convention-based routing**: Routes defined in `config/routes.ts`
- **Runtime configuration**: `src/app.tsx` for layout, initial state, and breadcrumbs
- **Build configuration**: `.umirc.ts` imports routes and settings from `config/`
- **Plugins enabled**: `antd`, `access`, `model`, `initialState`, `request`, `layout`

**Project Structure:**

```
src/
├── pages/              # Page components (route-based)
│   ├── ContentCenter/  # Product list, subject/answer management
│   ├── PaperUpload/    # Word paper upload and editing workflow
│   │   ├── index.tsx   # Upload page with multi-step form
│   │   └── Edit/       # Proofreading page (layout: false)
│   ├── QuestionTagging/ # Question tagging feature (NEW)
│   │   ├── index.tsx    # Main tagging page with 3-column layout
│   │   └── components/  # FilterPanel, QuestionList, QuestionDetail, TaggingForm
│   └── [other pages]   # System, Order, Customer, Statistics, etc.
├── services/           # API service layer (using @umijs/max request)
│   ├── tagSystem.ts    # Tag categories and knowledge tree APIs
│   ├── paperUpload.ts  # Paper upload, parsing, and submission
│   └── questionBankTask.ts
├── components/         # Shared components
│   ├── RichTextEditor/ # wangEditor integration
│   └── Guide/
├── models/             # Global state (Umi data flow)
├── utils/              # Utility functions
│   └── parseStem.ts    # HTML content parsing utilities
├── constants/          # Constants and enums
└── app.tsx            # Runtime config (layout, initial state)

config/
├── routes.ts           # Route definitions
└── defaultSettings.ts  # ProLayout settings (theme, layout)
```

### Backend Architecture (backend/)

**Project Structure:**
```
backend/
├── app/
│   ├── api/v1/          # API endpoints
│   │   └── paper.py     # Paper upload, result, submit endpoints
│   ├── core/            # Core functionality
│   │   ├── parser/      # Word document parsing modules
│   │   │   ├── docx_parser.py      # Main document parser
│   │   │   ├── structure_parser.py # Question structure detection
│   │   │   ├── content_parser.py   # Content extraction
│   │   │   ├── formula_parser.py   # Math formula handling
│   │   │   └── image_parser.py     # Image extraction
│   │   └── task_manager.py         # In-memory task tracking
│   ├── models/          # Database and Pydantic models
│   │   ├── database/    # SQLAlchemy ORM models
│   │   │   ├── paper.py
│   │   │   ├── question.py
│   │   │   ├── question_group.py
│   │   │   ├── question_content.py
│   │   │   └── image.py
│   │   └── schemas/     # Pydantic schemas for API
│   │       └── question.py
│   ├── services/        # Business logic layer
│   │   ├── paper_service.py    # Paper CRUD operations
│   │   ├── parse_service.py    # Document parsing orchestration
│   │   └── question_service.py # Question CRUD operations
│   ├── config.py        # Environment configuration (pydantic-settings)
│   ├── database.py      # Database connection and session
│   └── main.py          # FastAPI entry point
├── migrations/          # Alembic database migrations
├── storage/             # File storage (uploads, images)
├── docker-compose.yml   # PostgreSQL container
└── requirements.txt     # Python dependencies
```

**Key Backend Patterns:**

1. **Task Manager Pattern**: In-memory task tracking for async Word parsing
   - `TaskManager` in `core/task_manager.py` manages task lifecycle
   - States: `pending` → `processing` → `success`/`failed`
   - Frontend polls `/api/paper/result/{taskId}` to check status

2. **Service Layer Pattern**: Business logic separated from API endpoints
   - Services receive `Session` via dependency injection
   - Handle transactions, error handling, and DB operations
   - Example: `PaperService` in `services/paper_service.py`

3. **Parser Module System**: Modular Word document parsing
   - `DocxParser` orchestrates specialized parsers
   - `StructureParser` detects question boundaries and types
   - `ContentParser` extracts stem/options/answer/analysis
   - `FormulaParser` handles math formulas (OMML → HTML)
   - `ImageParser` extracts and saves embedded images

### Key Patterns and Workflows

#### 1. Frontend API Service Layer (my-app/src/services/)
All API calls use `@umijs/max` request utility:
```typescript
import { request } from '@umijs/max';

export async function getKnowledgeTree() {
    return request('/api/tags/knowledge-tree', { method: 'GET' });
}
```

#### 2. Word Paper Parsing Workflow
Multi-step process for Word document processing:

**Step 1: Upload Page** (`/question-bank/word-upload`)
- User uploads Word file with metadata (`PaperMetadata`)
- API: `POST /api/paper/upload` → Returns `{ taskId }`

**Step 2: Backend Processing**
- `parse_service.py` orchestrates document parsing
- `DocxParser` extracts questions, formulas, images
- Results stored in `TaskManager` (in-memory)

**Step 3: Polling & Navigation**
- Frontend polls `GET /api/paper/result/{taskId}`
- When status becomes "success", navigates to edit page

**Step 4: Proofreading Page** (`/question-bank/word-upload/edit`)
- Full-screen interface (layout: false)
- Question cards with rich text editors (wangEditor)
- Users annotate: type, difficulty, knowledge points
- Edit stem/options/answer/analysis HTML content

**Step 5: Submit**
- API: `POST /api/paper/submit` with corrected questions
- Backend saves to PostgreSQL via `PaperService` and `QuestionService`

**Key Interfaces** (shared between frontend/backend):
```typescript
// PaperMetadata
{ name, subject, year?, region?, paperType?, mode: 'paper'|'question' }

// QuestionItem
{
  id, number, type, stem, options?, answer, analysis?,
  knowledgePoints?, difficulty?, parentId?, children?
}
```

#### 3. Question Tagging Workflow (NEW)
Multi-step process for batch tagging questions with metadata:

**Page Route:** `/question-bank/tagging`

**Layout:** Three-column layout with fixed headers
- **Left Column (25%)**: Filter panel + Question list with pagination
- **Middle Column (50%)**: Question detail display (single or batch mode)
- **Right Column (25%)**: Tagging form (single or batch mode)

**Key Features:**
- **Single Mode**: Click a question to view and tag individually
- **Batch Mode**: Select multiple questions (checkbox) to tag in bulk
- **Keyboard Navigation**:
  - `↑/↓` or `←/→`: Navigate between questions
  - `Ctrl/Cmd + Enter`: Save and move to next question
- **Filter Options**: Subject, paper, tag status (untagged/partial/complete), keyword search
- **Tag Status Auto-calculation**: Based on presence of knowledge points, question type, difficulty, chapters

**State Management:**
- Local state with `useState` for questions, filters, selections
- Real-time filtering and pagination
- Auto-select first question on filter change

**Components:**
- `FilterPanel`: Subject/paper/status filters with search
- `QuestionList`: Paginated list with selection checkboxes
- `QuestionDetail`: Display question content (supports batch preview)
- `TaggingForm`: Form for tagging (adapts to single/batch mode)

#### 4. Route Configuration
Routes in `config/routes.ts` support:
- Nested routes with `routes` array
- `hideInMenu: true` for hidden pages
- `layout: false` for full-screen pages (e.g., paper editing at `/question-bank/word-upload/edit`)
- Icons from `@ant-design/icons`

**Question Bank Routes:**
- `/question-bank/tag-system` - Tag system management
- `/question-bank/task` - Question bank tasks
- `/question-bank/word-upload` - Paper upload page
- `/question-bank/word-upload/edit` - Full-screen proofreading (layout: false)
- `/question-bank/tagging` - Question tagging page (NEW)

#### 5. Database Models
SQLAlchemy models follow this pattern:
- Inherit from `Base`
- Include `created_at`/`updated_at` timestamps
- Use relationships for foreign keys
- JSON columns for flexible metadata (e.g., `paper.paper_metadata`)

#### 6. Layout System
- **ProLayout** from `@ant-design/pro-components` provides the admin shell
- Settings in `config/defaultSettings.ts`: dark sidebar, light header, fixed sider
- Custom breadcrumb rendering in `src/app.tsx`
- Menu locale disabled (`locale: false`)

**Special Layouts:**
- Standard pages: Use `PageContainer` from `@ant-design/pro-components`
- Full-screen pages: Set `layout: false` in route config (e.g., paper proofreading)
- Three-column pages: Custom layout with `Row` and `Col` (e.g., question tagging)

## Important Notes

### Frontend (my-app/)

**TypeScript Configuration:**
- `tsconfig.json` extends from `.umi/tsconfig.json` (auto-generated)
- Do not manually edit the generated tsconfig

**Code Quality Tools:**
- **Prettier**: Auto-formatting on save
- **Husky + lint-staged**: Pre-commit hooks

**Rich Text Editor:**
- Uses `@wangeditor/editor-for-react` for question content editing
- Component wrapper in `src/components/RichTextEditor/`

**Keyboard Shortcuts:**
- **Question Tagging Page** (`/question-bank/tagging`):
  - `↑/↓` or `←/→`: Navigate between questions
  - `Ctrl/Cmd + Enter`: Save current question and move to next
  - Shortcuts work globally on the page (not just in specific inputs)

**API Proxy Configuration:**
- `.umirc.ts` proxies `/api` to `http://localhost:8001`
- **Important**: Backend runs on port 8000 by default. Either:
  - Update backend to run on port 8001: `uvicorn app.main:app --reload --port 8001`
  - Or update `.umirc.ts` proxy target to `http://localhost:8000`

**Mock Data:**
- Mock data currently disabled (`.umirc.ts`: `mock: false`)
- Use real backend API during development
- For new features without backend, create mock data in page directory (e.g., `QuestionTagging/mockData.ts`)

### Backend (backend/)

**Configuration:**
- Environment variables in `.env` (copy from `.env.example`)
- `app/config.py` uses `pydantic-settings` for type-safe config
- Access via `get_settings()` singleton (cached)

**Database:**
- PostgreSQL runs in Docker container (port 5432)
- Connection managed by SQLAlchemy
- Always use `get_db()` dependency injection in API endpoints

**Error Handling:**
- Use `HTTPException` with appropriate status codes (400, 404, 500)
- Services should rollback DB transactions on error
- Log errors for debugging

**Pydantic Schemas:**
- Use `Field()` with descriptions for API documentation
- `Config: populate_by_name = True` for camelCase compatibility with frontend
- Schemas in `models/schemas/` separate from database models

## Development Workflows

### Adding a New Frontend Page
1. Create component in `src/pages/[PageName]/index.tsx`
2. Add route in `config/routes.ts` with path, name, icon, component
3. Create corresponding service file in `src/services/` if API calls needed
4. For complex pages with multiple components, create a `components/` subdirectory

**Example: QuestionTagging Page Structure**
```
src/pages/QuestionTagging/
├── index.tsx              # Main page component with state management
├── components/            # Page-specific components
│   ├── FilterPanel.tsx    # Filter controls
│   ├── QuestionList.tsx   # Question list with selection
│   ├── QuestionDetail.tsx # Question display
│   └── TaggingForm.tsx    # Tagging form
├── types.ts               # TypeScript interfaces
└── mockData.ts            # Mock data for development
```

### Adding Backend API Endpoints
1. Define Pydantic schemas in `models/schemas/`
2. Create service class in `services/` for business logic
3. Add router function in `api/v1/` directory
4. Include router in `main.py` if new module

### Database Schema Changes
1. Modify SQLAlchemy models in `models/database/`
2. Create migration: `alembic revision --autogenerate -m "description"`
3. Review generated migration file in `migrations/versions/`
4. Apply migration: `alembic upgrade head`
5. Test rollback: `alembic downgrade -1`
