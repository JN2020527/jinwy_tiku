# AGENTS.md

This file guides agentic coding assistants working in this repository (晋文源试卷管理系统 - Jinwenyuan Paper Management System).

## Project Structure

**Monorepo with two main applications:**

- `my-app/` - Frontend: UmiJS Max 4 + React + Ant Design Pro Components
- `backend/` - Backend: FastAPI + PostgreSQL + SQLAlchemy

---

## Frontend (my-app/)

### Build & Development Commands

```bash
cd my-app
npm run dev          # Start development server (port 8000)
npm run build        # Production build
npm run format       # Format code with Prettier
```

**Linting**: ESLint configured via `@umijs/max/eslint`. Run via UmiJS: `npx eslint <file>` or use IDE integration.

### Code Style Guidelines

**Import Order:** React → Third-party → Framework → Local services → CSS modules

**File Naming:** Page components: `pages/PageName/index.tsx`, Reusable: `components/ComponentName/index.tsx`, Services: `services/featureName.ts`, PascalCase for components, camelCase for functions

**Component Structure:**

```typescript
import React from "react";
import { PageContainer } from "@ant-design/pro-components";

const ComponentName: React.FC = () => {
  const [state, setState] = useState<T>(initialValue);

  const handler = async () => {
    try {
      const result = await apiCall();
      message.success("操作成功");
    } catch (error) {
      message.error("操作失败");
    }
  };

  return <PageContainer title="页面标题">{/* JSX */}</PageContainer>;
};
```

**API Calls Pattern:**

```typescript
// In services/feature.ts - define interfaces alongside API functions
export interface DataType { ... }
export async function getData(params: ParamType) {
  return request<ResponseType>('/api/endpoint', { method: 'GET', params });
}
```

**TypeScript Rules:** Define interfaces in service files, use `React.FC` for components, avoid `any`

**Styling:** CSS Modules (`import styles from './index.less'`) + inline styles for dynamic values

**Prettier Config:** 80 char width, single quotes, trailing commas, organized imports

---

## Backend (backend/)

### Build & Development Commands

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
docker-compose up -d
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Testing & Quality

```bash
pytest                          # Run all tests (test_*.py files)
pytest test_file.py             # Run specific test file
pytest test_file.py::test_func  # Run specific test function
pytest -v                       # Verbose output
pytest -s                       # Print output (no capture)
alembic revision --autogenerate -m "description"
alembic upgrade head            # Apply migrations
alembic downgrade -1            # Rollback
```

**Note**: pytest and pytest-asyncio installed. Test files are in backend/ root as test\_\*.py.

### Code Style Guidelines

**Import Order:** Standard library → Third-party → Local (absolute from app.\*)

**Naming Conventions:** Classes: PascalCase, Functions/variables: snake_case, Constants: UPPER_SNAKE_CASE

**Linting**: No formal linting configured (no pylint/black). Follow PEP 8 manually.

**Service Layer Pattern:**

```python
class PaperService:
    def __init__(self, db: Session):
        self.db = db

    def create_paper(self, task_id: str, metadata: PaperMetadata) -> Paper:
        try:
            paper = Paper(task_id=task_id, paper_metadata=metadata.model_dump())
            self.db.add(paper)
            self.db.commit()
            return paper
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
```

**API Endpoint Pattern:**

```python
@router.post("/upload", response_model=ApiResponse[UploadResponse])
async def upload_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return ApiResponse(success=True, message="Success", data=...)
```

**Error Handling:** Use `HTTPException` with status codes (400, 404, 500), rollback DB transactions on error

**Database Models:** Inherit from Base, include `created_at`/`updated_at` timestamps

**Pydantic Schemas:** Use `Field()` with descriptions, `Config: populate_by_name = True` for camelCase

**Configuration:** Use `get_settings()` singleton (cached), environment variables in `.env` (production) or `.env.local` (development)

---

## Cross-Cutting Concerns

**API Integration:** Frontend dev server runs on port 8000 (npm run dev), proxies `/api` to `http://localhost:8001` (backend dev server). Backend runs on port 8000. CORS enabled for both ports. All API responses in `{ success, message, data }` format

**Security:** Frontend uses `dangerouslySetInnerHTML` for rendering rich content (math formulas, images). Sanitize HTML before setting.

**Authentication:** Backend: No auth, Frontend: Umi access control (check `src/access.ts`)

**Documentation:** Backend: `/docs` (FastAPI auto-docs) and `/redoc`

---

## Before You Make Changes

1. **Read existing patterns** - Look at similar files in the same directory
2. **Follow conventions** - Match import order, naming, and structure
3. **Type safety** - No `as any` in TypeScript, no bare `except:` in Python
4. **Test locally** - Verify both frontend and backend work together
5. **Commit messages** - Be concise: "Add paper upload endpoint"
