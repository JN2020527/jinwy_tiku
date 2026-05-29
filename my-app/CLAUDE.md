# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指引。

## 项目概览

晋文源试卷管理系统 —— 一个面向 K12 教育内容的**纯前端原型项目**。核心业务是 Word 试卷上传解析、试题打标（标注知识点/题型/难度等）与题库标签体系管理。

**本项目不需要后端**：这是一个用于演示与交互验证的前端原型，所有数据由 `mock/` 目录提供，无需也不应依赖真实后端服务。新增功能时请继续走"前端组件 + mock 数据"的方式，不要假设有可用的后端 API。

技术栈：**Umi Max 4** + **React 18** + **Ant Design 5 / Pro Components** + **wangEditor 5**（富文本）。TypeScript 全程。

## 常用命令

```bash
npm run dev        # 启动开发服务器 http://localhost:8000 (= npm run start)
npm run build      # 生产构建 (max build)
npm run format     # Prettier 格式化全部文件
npm run setup      # max setup —— 重新生成 src/.umi 类型 (装包后自动跑)
```

- 无测试框架配置（package.json 无 test 脚本）。
- Lint 通过 husky `pre-commit` → `lint-staged` 自动执行，使用 `max lint`（ESLint + Stylelint）+ Prettier。无独立 `npm run lint` 脚本；如需手动校验单文件用 `npx max lint <file>`。

## 架构要点

### 路由与布局
- 路由定义在 `config/routes.ts`（**不是** `src/`）。`component: './X'` 相对 `src/pages/` 解析。
- 全屏页面（无侧边栏/头部）设 `layout: false`——打标页用此模式做沉浸式工作区。
- 顶层布局/主题在 `.umirc.ts` 的 `layout` 字段 + `config/defaultSettings.ts`；运行时布局逻辑在 `src/app.tsx`（`getInitialState` + `layout` 导出）。
- 注意路由命名与实现的错位：`/question-bank/*` 下的多个菜单项实际映射到 `src/pages/ContentCenter/` 组件（如标签体系 → `ContentCenter/TagManage`）。改路由时以 `routes.ts` 的 `component` 路径为准。

### 数据流：两套 Mock 机制（关键）
本项目无后端，数据有**两种**来源，改某个页面前先确认它用哪一种：
- **服务端 mock**（`mock/*.ts`，经 `src/services/` 走 `/api` 请求）：用于 `TagManage`、`QuestionBankTask`。新增/改 service 接口时**必须同步**改对应 mock 文件，否则页面拿不到数据。
- **组件内本地 mock**（页面里 `import { ... } from './mockData'`）：用于 **`QuestionTagging`**（最复杂的页面）、`ContentCenter/ProductList`、`SubjectManage`。这些页面**不经过 `mock/` 目录**，数据直接在组件旁的 `mockData.ts` 里改。
- 服务端 mock 文件按 service 对应：`mock/tagSystem.ts`、`mock/questionBankTask.ts`，用 Umi 路由键写法（如 `'GET /api/tags/knowledge-tree'`）。
- API 统一走 `@umijs/max` 的 `request`，响应封装为 `{ success: boolean, message: string, data: T }`，mock 返回值需遵循同一封装。
- `.umirc.ts` 中 `proxy['/api'] → http://localhost:8001` 为历史遗留配置，当前无对应后端，可忽略。

### Service 层
`src/services/` 是唯一的 API 边界，按业务域拆分：
- `tagSystem.ts` —— 知识点树、题型树、属性标签分类、教材版本与章节的完整 CRUD。
- `questionBankTask.ts` —— 题库任务列表 CRUD。

### 业务页面
- `QuestionTagging/` —— 三栏全屏打标工作区，是本仓库最复杂的页面，详见下节。
- `ContentCenter/` —— TagManage（标签体系，含知识树/题型树/属性面板）、AnswerManage、ProductList、SubjectManage、QuestionBankTask。

### 试题打标页（QuestionTagging）
三栏布局：左（筛选 + 试卷/题目列表）/ 中（题目详情）/ 右（打标表单）。组件在 `components/`，类型集中在 `types.ts`。
- 键盘流：`↑↓←→` 题间导航，`Ctrl/Cmd+Enter` 存当前题并跳下一题。
- 单题 / 批量两种模式（批量用 Switch 控制每个字段是否写入）。
- **存疑标记**：打标人不确定时标记题目待复查。数据上是 `Question.doubtful?: boolean` 与 `Paper.doubtfulCount`；UI 上有橙色角标/Tag、列表统计（`3/10 · 2存疑`）、筛选器 `tagStatus` 的"存疑"选项。
- `tagStatus`（未打标/部分打标/已打标）由知识点、题型、难度、章节等字段是否填充自动推导，不要手动散落判断逻辑。

### HTML 内容处理（安全敏感）
试题题干/答案/解析都是 HTML，且常含数学公式（MathML）和图片：
- 渲染前**必须**经 `src/utils/sanitize.ts` 的 `sanitizeHtml()` 过滤——它白名单放行了 MathML 标签与表格/图片，禁用 data 属性。任何 `dangerouslySetInnerHTML` 都应先 sanitize（`QuestionTagging/components/QuestionDetail.tsx` 在用）。
- ⚠️ `src/utils/parseStem.ts` 与 `src/components/RichTextEditor/` 原仅服务于已删除的 PaperUpload，现为**孤儿代码**（全仓库无引用），新功能需要时可复用，否则可清理。

## 约定

- **TypeScript 配置自动生成**：`tsconfig.json` 继承 `src/.umi/tsconfig.json`，`src/.umi*` 全是生成产物，**不要手改**。
- 代码风格：单引号、`trailingComma: all`、printWidth 80（`.prettierrc`）；imports 由 `prettier-plugin-organize-imports` 自动整理。
- 新增页面流程：`config/routes.ts` 加路由 → `src/pages/<Name>/index.tsx` 建组件 → 需要数据则二选一（走 `src/services/` + `mock/` 服务端 mock，或在页面目录建 `mockData.ts` 本地 mock）→ 复杂页面拆 `components/` 子目录 + `types.ts`。
