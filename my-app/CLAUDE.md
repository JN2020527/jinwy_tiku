# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Question Bank & Test Paper Management System (晋文源试卷管理系统)** built with Umi Max 4.6.9, React 18, TypeScript, and Ant Design v5. It's an enterprise admin dashboard for managing educational content, test papers, and question taxonomies.

## Commands

### Development
```bash
npm run dev        # Start development server
npm start          # Alias for npm run dev
```

### Build
```bash
npm run build      # Production build using max build
```

### Code Quality
```bash
npm run format     # Format code with Prettier
```

### Setup
```bash
npm run setup      # Run Umi Max setup (also runs automatically on postinstall)
```

## Architecture

### Framework & Plugins

This project uses Umi Max with the following plugins enabled (configured in `.umirc.ts`):
- **antd**: Ant Design v5 integration
- **access**: RBAC framework (configured but not yet implemented)
- **model**: Lightweight hook-based state management
- **initialState**: Initial state handling via `getInitialState()` in `app.tsx`
- **request**: Unified request handler for all API calls
- **layout**: Ant Design Pro Layout with dark sidebar theme

### Routing System

Routes are **file-based** and configured in `config/routes.ts`. Key patterns:
- Nested routes use the `routes` array property
- Hidden menu items use `hideInMenu: true` (for detail/edit pages)
- Parent routes redirect to first child using `redirect`
- All page components are in `src/pages/` and auto-routed

Main route hierarchy:
```
/welcome                    - Landing page
/content                    - Content Center (parent)
  ├─ /content/product-list           - Product list (main page)
  ├─ /content/product-list/subject-manage    - Subject management (hidden)
  └─ /content/product-list/answer-manage     - Answer management (hidden)
/question-bank              - Question Bank (parent)
  ├─ /question-bank/tag-system       - Tag/knowledge system
  └─ /question-bank/task             - Task management
```

### Service Layer & Mock APIs

**Service Pattern:**
- All services in `src/services/` export async functions that wrap `request()` calls
- TypeScript interfaces define request/response types
- Services are consumed directly in page components (no Redux/RTK)

**Mock API Development:**
- Mock handlers in `mock/` directory intercept requests during development
- Pattern: `'METHOD /api/path': handler` in mock files
- Mock data persists in memory during dev session (CRUD operations work)
- Three mock files:
  - `mock/questionBankTask.ts` - Task CRUD with pagination/filtering
  - `mock/tagSystem.ts` - Complex hierarchical data (knowledge tree, question types, tag categories, textbooks)
  - `mock/userAPI.ts` - User authentication (basic)

**Current Services:**
- `src/services/questionBankTask.ts` - Task management API
- `src/services/tagSystem.ts` - Knowledge points, question types, tag attributes, textbook chapters

### State Management

Uses Umi's **model plugin** for lightweight state management:
- Models are in `src/models/` and export React hooks
- `src/models/global.ts` contains global shared state (e.g., `useUser()`)
- Initial state configured in `app.tsx` via `getInitialState()`
- **No Redux** - keeps state management minimal with hooks

### Data Patterns

**Hierarchical Tree Data:**
- Knowledge points, question types, and textbook chapters use tree structures
- CRUD operations support recursive add/update/delete on tree nodes
- Use Ant Design Tree component for display

**Three-Level Content Hierarchy:**
- Product → Subject → Answer (in Content Center)
- Navigation flows from ProductList to SubjectManage to AnswerManage

**ProTable Pattern:**
- Most list pages use `@ant-design/pro-components` ProTable
- Supports built-in search, filtering, pagination, and actions
- Use `actionRef` to trigger table refresh after mutations
- Request prop fetches data, columns define display and actions

### Component Architecture

**Key Component Types:**
- **Page Components** (`src/pages/`): Auto-routed, use PageContainer wrapper
- **Shared Components** (`src/components/`): Reusable across pages
- **Pro Components**: ProTable, ProForm, ModalForm heavily used for CRUD operations

**Common Patterns:**
- **Tabs**: Multi-section pages (e.g., TagManage has 4 tabs)
- **Modals**: Forms for create/edit actions (use ModalForm from Pro Components)
- **Popconfirm**: Deletion confirmations
- **Message/Notification**: User feedback for actions

### TypeScript & Type Safety

- TypeScript 5.0.3 with strict mode
- All API responses typed with interfaces
- Auto-generated types in `src/.umi/` (don't edit directly)
- Type definitions for services follow pattern:
  ```typescript
  interface TaskItem {
    id: string;
    name: string;
    // ...
  }

  export async function getTasks(params: {...}): Promise<{ data: TaskItem[]; total: number; success: boolean }> {
    return request('/api/question-bank/tasks', { method: 'GET', params });
  }
  ```

## Key Feature Areas

### Content Center (`/content`)
Manages products, subjects, and answers in a hierarchical structure:
- **ProductList**: Browse products with activation codes, time ranges, statuses
- **SubjectManage**: Manage subjects (math, language, sciences) within products
- **AnswerManage**: Manage answer sheets linked to subjects

### Question Bank (`/question-bank`)
Manages question taxonomy and knowledge structure:
- **TagManage** (4-tab interface):
  1. Knowledge System: Textbook catalog + knowledge tree (side-by-side)
  2. Question Types: Hierarchical question type tree (MCQ, fill-in, essay, etc.)
  3. Tag Attributes: Category-based attributes (difficulty, ability, source, region, scenario)
  4. Textbook Chapters: Multi-version textbook management (人教版, 北师大版, 苏科版)
- **QuestionBankTask**: Task management with status tracking (Published/Pending/Draft)

## Configuration Files

- **`.umirc.ts`**: Main Umi configuration (plugins, routes, layout)
- **`config/routes.ts`**: Route definitions (file-based routing configuration)
- **`config/defaultSettings.ts`**: Layout theme and settings (dark sidebar, blue primary color)
- **`src/app.tsx`**: Runtime configuration (initial state, layout customization)
- **`tsconfig.json`**: TypeScript config (extends `.umi/tsconfig.json`)

## Development Notes

### Adding New Pages
1. Create component in `src/pages/` following existing patterns
2. Add route to `config/routes.ts`
3. Use PageContainer wrapper for consistent layout
4. For CRUD pages, use ProTable + ModalForm pattern

### Adding New APIs
1. Define TypeScript interfaces for request/response
2. Create service functions in `src/services/`
3. Create mock handlers in `mock/` during development
4. Use `request()` from `@umijs/max` for all API calls

### Mock API Pattern
```typescript
// mock/example.ts
export default {
  'GET /api/example': (req: any, res: any) => {
    res.json({ data: [], success: true });
  },
  'POST /api/example': (req: any, res: any) => {
    const body = req.body;
    // Handle request
    res.json({ success: true });
  },
};
```

### ProTable Usage
```typescript
<ProTable<DataType>
  actionRef={actionRef}
  request={async (params) => {
    const result = await serviceFunction(params);
    return { data: result.data, total: result.total, success: true };
  }}
  columns={columns}
  rowKey="id"
/>
```

### Tree Data CRUD
When working with tree structures (knowledge points, question types, textbooks):
- Use recursive functions for add/update/delete operations
- Preserve tree structure in mock data between requests
- Tree nodes have `id`, `name`, `children` properties
- Support both flat and nested data representations

## Build & Deployment

- Build output goes to `dist/` directory
- Production build uses `max build` command
- No special environment variables required (all configured in `.umirc.ts`)
- Static assets in `src/assets/` are automatically processed

## Code Quality Tools

- **Prettier**: Auto-formatting (includes organize imports plugin)
- **ESLint**: Linting (extends `@umijs/max` config)
- **Stylelint**: CSS/LESS linting
- **Husky**: Git hooks (pre-commit runs lint-staged)
- **lint-staged**: Runs linters only on staged files

## Language & Localization

- **Primary Language**: Chinese (Simplified)
- All UI labels, menu names, and messages are in Chinese
- Layout locale disabled (`locale: false` in layout config)
- No i18n framework - hardcoded Chinese strings throughout
