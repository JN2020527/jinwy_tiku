# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

晋文源题库管理系统 —— 一个面向 K12 教育内容的**纯前端原型项目**。核心业务是试题打标（标注知识点/题型/难度等）与题库标签体系管理。

**本项目不需要后端**：这是一个用于演示与交互验证的前端原型，数据来自 `mock/` 服务端 mock 或页面旁的 `mockData.ts` 本地 mock，无需也不应依赖真实后端服务。新增功能时请继续走"前端组件 + mock 数据"的方式，不要假设有可用的后端 API。

技术栈：**Umi Max 4** + **React 18** + **Ant Design 5 / Pro Components** + **wangEditor 5**（富文本）。TypeScript 全程。

## 常用命令

```bash
npm run dev              # 启动开发服务器 http://localhost:8000 (= npm run start)
npm run build            # 生产构建 (max build)
npm run format           # Prettier 格式化全部文件
npm run setup            # max setup —— 重新生成 src/.umi 类型 (装包后自动跑)
npm run test:teaching-plan  # 教学计划模块单元测试（tsx --test）
```

- Lint 通过 husky `pre-commit` → `lint-staged` 自动执行，使用 `max lint`（ESLint + Stylelint）+ Prettier。无独立 `npm run lint` 脚本；如需手动校验单文件用 `npx max lint <file>`。
- 测试仅覆盖 `src/features/teaching-plan/` 下的纯逻辑模块（scheduler + templateStore），使用 Node.js 原生 test runner（`tsx --test`）。无浏览器端测试框架。

## CodeGraph 知识图谱（必须使用）

本项目已配置 CodeGraph 知识图谱。**回答代码架构相关问题、查找符号关系、分析改动影响时，必须优先使用 CodeGraph，不要自行 grep/读文件。**

### MCP 工具（直接调用）

以下工具直接出现在工具列表中，优先使用：

- `codegraph_search` —— 按名称搜索符号（函数、类、组件等）
- `codegraph_context` —— 为任务构建代码上下文（入口 + 关联符号 + 源码）
- `codegraph_trace` —— 追踪两个符号之间的调用路径（"X 怎么到达 Y"）
- `codegraph_explore` —— 批量查看多个符号的源码和关系，按文件分组
- `codegraph_node` —— 查看单个符号的详情（含源码）

### CLI 命令（通过 Bash 调用）

MCP 未暴露的工具，通过 `codegraph <command>` CLI 调用（效果与 MCP 相同，读同一个数据库）：

- `codegraph impact <symbol>` —— 分析改动爆炸半径（影响哪些文件和符号）
- `codegraph callers <symbol>` —— 查谁调用了这个符号
- `codegraph callees <symbol>` —— 查这个符号调用了谁
- `codegraph files [path]` —— 查项目文件结构（比 ls 更快，只看已索引文件）
- `codegraph status [path]` —— 查索引健康状态和统计
- `codegraph sync [path]` —— 手动增量同步（通常不需要，自动同步已开启）
- `codegraph query <search>` —— 搜索符号（CLI 版 search）

CLI 命令示例：`codegraph impact sanitizeHtml --depth 2 --json`、`codegraph callers TagManage --json`。

### 使用规则

1. CodeGraph 返回的结果应视为已读，不需要再用 grep/Read 验证
2. MCP 工具优先，CLI 命令补充（impact/callers/callees 只有 CLI 版）
3. 只有当 CodeGraph 不可用或返回不足时，才回退到手动搜索

## 架构要点

### 路由与布局

- 路由定义在 `config/routes.ts`（**不是** `src/`）。`component: './X'` 相对 `src/pages/` 解析。
- 全屏页面（无侧边栏/头部）设 `layout: false`——打标页和在线校对页用此模式做沉浸式工作区。
- 顶层布局/主题在 `.umirc.ts` 的 `layout` 字段 + `config/defaultSettings.ts`；运行时布局逻辑在 `src/app.tsx`（`getInitialState` + `layout` 导出）。
- 注意路由命名与实现的错位：`/question-bank/*` 下的多个菜单项实际映射到 `src/pages/ContentCenter/` 组件（如标签体系 → `ContentCenter/TagManage`）。改路由时以 `routes.ts` 的 `component` 路径为准。
- `/preparation/*`（备课板块）下的教学计划模板、复习树、资产中心同样映射到 `ContentCenter/` 下的对应组件。

### 数据流：两套 Mock 机制（关键）

本项目无后端，数据有**两种**来源，改某个页面前先确认它用哪一种：

- **服务端 mock**（`mock/*.ts`，经 `src/services/` 走 `/api` 请求）：用于 TagManage、TeachingPlanTemplate、AssetCenter、PaperUpload、QuestionBankTask。新增/改 service 接口时**必须同步**改对应 mock 文件，否则页面拿不到数据。
- **组件内本地 mock**（页面里 `import { ... } from './mockData'`）：用于 **`QuestionTagging`**（最复杂的页面）、`ContentCenter/ProductList`、`SubjectManage`。这些页面**不经过 `mock/` 目录**，数据直接在组件旁的 `mockData.ts` 里改。

已有 service/mock 配对：

```
src/services/tagSystem.ts        ↔ mock/tagSystem.ts
src/services/teachingPlan.ts     ↔ mock/teachingPlan.ts
src/services/paperUpload.ts      ↔ mock/paperUpload.ts
src/services/questionBankTask.ts ↔ mock/questionBankTask.ts
```

- 服务端 mock 文件用 Umi 路由键写法（如 `'GET /api/tags/knowledge-tree'`）。
- API 统一走 `@umijs/max` 的 `request`，响应封装为 `{ success: boolean, message: string, data: T }`。
- `.umirc.ts` 中 `proxy['/api'] → http://localhost:8001` 为历史遗留配置，当前无对应后端，可忽略。

### Service 层

`src/services/` 是唯一的 API 边界，按业务域拆分：

- `tagSystem.ts` —— 知识点树、题型树、属性标签分类、教材版本与章节、资源管理（资产中心）、属性应用的完整 CRUD。本文件最大，涵盖知识体系、专题体系、复习树、题型管理、属性设置、属性应用、资产中心等多个页面的所有接口。
- `teachingPlan.ts` —— 教学计划模板的 CRUD + 生命周期（activate/stop/restart）+ 版本管理（createDraftVersion/copy）。
- `paperUpload.ts` —— 试题上传。
- `questionBankTask.ts` —— 题库任务。
- `resourceModel.ts` / `resourceAuditModel.ts` / `resourceReferenceModel.ts` / `resourceReferences.ts` —— 资源（课件/学案/拓展包/作业）的类型系统、载体约束、版本管理、生命周期与引用关系。这些是纯模型文件，不含 API 调用，被 `tagSystem.ts` 和资产中心页面消费。

### 教学计划模块（Teaching Plan）

`src/features/teaching-plan/` 是独立的领域逻辑层，不依赖 React，可被 service 和页面同时消费：

- `types.ts` —— 全部类型定义：模板、任务、排期、冲突、输入/输出 DTO。课时以 0.5 为步长（`CLASS_HOUR_STEP = 0.5`）。
- `scheduler.ts` —— 纯函数 `scheduleTeachingPlan()`：按 anchorWeek 贪心排期，检测重复节点、停用节点、超容量等冲突。
- `templateStore.ts` —— `TeachingPlanTemplateStore` 类：内存中的领域仓库，实现模板 CRUD + 版本管理（草稿/启动/停用/归档）+ 草稿版本派生 + 复制。所有 mutation 返回新对象（`structuredClone`）。
- `index.ts` —— barrel export。
- `*.test.ts` —— 使用 Node.js 原生 test runner 的单元测试。

模板生命周期：`draft → active → stopped → archived`（曾启动过的模板不能直接删除，只能归档）。

### 资源模型（Asset Center 类型系统）

`src/services/resourceModel.ts` 定义了资产中心的类型体系：

- 资源分两类：附件型（`courseware` 课件 / `extension` 拓展包）和组合型（`studyGuide` 学案 / `homework` 作业）。
- 每种资源类型有合法载体约束（课件→PPT，拓展包→PDF/音频/视频，学案/作业→在线组合内容）。
- 版本管理：每个资源有版本历史（current/pending/historical），可通过追加文件创建待生效版本，再激活切换。
- 生命周期：`unlisted → listed → archived`（归档可恢复为未上架）。

### 业务页面

#### 试题打标页（QuestionTagging）

三栏布局：左（筛选 + 试卷/题目列表）/ 中（题目详情）/ 右（打标表单）。组件在 `components/`，类型集中在 `types.ts`。

- 键盘流：`↑↓←→` 题间导航，`Ctrl/Cmd+Enter` 存当前题并跳下一题。
- 单题 / 批量两种模式（批量用 Switch 控制每个字段是否写入）。
- **存疑标记**：打标人不确定时标记题目待复查。数据上是 `Question.doubtful?: boolean` 与 `Paper.doubtfulCount`；UI 上有橙色角标/Tag、列表统计（`3/10 · 2存疑`）、筛选器 `tagStatus` 的"存疑"选项。
- `tagStatus`（未打标/部分打标/已打标）由知识点、题型、难度、章节等字段是否填充自动推导，不要手动散落判断逻辑。

#### 标签体系（ContentCenter/TagManage）

`Knowledge.tsx` / `Topic.tsx` / `Review.tsx` / `QuestionType.tsx` / `Attributes.tsx` / `AttributeApplication.tsx`（含 `NodeRelations.tsx` 和 `TagConfig.tsx` 两个 tab）。共用 `components/` 下的 `TagSystemTreePanel`、`QuestionTypeTreePanel` 等面板组件。

**复习树**（`Review.tsx`）是教学计划的资源来源——其末级节点可设置 `suggestedHours`（建议课时），被教学计划模板引用后按 `anchorWeek` 排期。

#### 备课板块（ContentCenter/TeachingPlanTemplate, AssetCenter）

- `TeachingPlanTemplate` —— 教学计划模板管理，消费 `src/features/teaching-plan/` 的调度器与 `src/services/teachingPlan.ts`。
- `AssetCenter` —— 资产中心，管理课件/学案/拓展包/作业等正式资源，按复习树节点组织。

### HTML 内容处理（安全敏感）

试题题干/答案/解析都是 HTML，且常含数学公式（MathML）和图片：

- 渲染前**必须**经 `src/utils/sanitize.ts` 的 `sanitizeHtml()` 过滤——它白名单放行了 MathML 标签与表格/图片，禁用 data 属性。任何 `dangerouslySetInnerHTML` 都应先 sanitize（`QuestionTagging/components/QuestionDetail.tsx` 在用）。
- ⚠️ `src/utils/parseStem.ts` 与 `src/components/RichTextEditor/` 原仅服务于已删除的 PaperUpload，现为**孤儿代码**（全仓库无引用），新功能需要时可复用，否则可清理。

## 参考文档

- `docs/adr/` —— 架构决策记录（复习树模型、资源归属、生命周期与版本管理、教学计划排期等）。
- [Umi Max 文档](https://umijs.org/docs/max/introduce)
- [Ant Design 文档](https://ant.design/)

## 约定

- **TypeScript 配置自动生成**：`tsconfig.json` 继承 `src/.umi/tsconfig.json`，`src/.umi*` 全是生成产物，**不要手改**。
- 代码风格：单引号、`trailingComma: all`、printWidth 80（`.prettierrc`）；imports 由 `prettier-plugin-organize-imports` 自动整理。Prettier 版本为 **2.x**（非 3.x），配置文件格式需与之兼容。
- 新增页面流程：`config/routes.ts` 加路由 → `src/pages/<Name>/index.tsx` 建组件 → 需要数据则二选一（走 `src/services/` + `mock/` 服务端 mock，或在页面目录建 `mockData.ts` 本地 mock）→ 复杂页面拆 `components/` 子目录 + `types.ts`。
- **领域逻辑**：纯计算/校验/状态机逻辑应放在 `src/features/<name>/` 下，与 React 解耦，便于测试和复用。参考 `src/features/teaching-plan/` 的模式。
- **不可变性**：领域层使用 `structuredClone()` 确保所有 mutation 返回新对象，不修改入参。React 层遵循同样的不可变更新模式。
- **`useRequest` 类型推断**：service 层返回 `Promise<T>`（已 unwrap），但 `useRequest` 默认推断为 `unknown`。需加 `formatResult: (res: T) => res` 触发 `OptionsWithFormat` 重载才能得到正确类型。
