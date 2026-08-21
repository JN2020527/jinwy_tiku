# 加工作业模块（HomeworkProduction）

实现《加工作业》需求 V0.2（21 条 AC）的新建、只读预览、编辑三个页面。一个入口组件 `index.tsx` 以 pathname 判定三种路由语义，学科从 query 读取并锁定。

## 运行与路由

模块路由已由资产中心任务在 `config/routes.ts` 注册，均指向 `./HomeworkProduction`（`hideInMenu`）：

| 路由 | 语义 |
| --- | --- |
| `/preparation/asset-center/homework/new?subject=xxx` | 新建：空白工作台 |
| `/preparation/asset-center/homework/:homeworkId?subject=xxx` | 只读预览 |
| `/preparation/asset-center/homework/:homeworkId/edit?subject=xxx` | 编辑：按原顺序预载 |

- 运行：`npm run dev`；构建：`npm run build`。
- `subject` 缺失或非法时页面给出「缺少有效学科上下文」并引导返回资产中心。
- 入口来自资产中心列表：「新建作业」→ new；名称点击 → 预览；操作列编辑 → edit；保存成功 → 返回 `/preparation/asset-center?subject=xxx`。

## 交互说明

- **三栏工作台**（新建/编辑共用）：左栏知识点树单选（选中父节点按全部后代叶子筛选并展开子树，支持树内搜索）；中栏筛选区（来源/题型/难度三行，每行单选/多选切换 + 顶部重置）、最新/最热排序、结果内搜索、分页（10 题/页）、题卡（来源/题型/难度/年份、题干、选项、答案解析折叠）与唯一主操作「加入作业/移除」；右栏已选作业面板（序号、上移、下移、移除、清空确认、0/60 计数）。
- **限制与提示文案**：去重（卡片按钮切换为「移除」+ 加入逻辑防重）；60 道上限提示「作业最多可添加 60 道题」；空列表保存提示「至少加入 1 道题」。
- **保存**：名称只在「保存作业」Modal 中填写（必填），编辑时预填当前名称；页面顶部不重复提供名称输入。调用 `saveHomework` 后，名称冲突错误落在 name 字段；编辑模式且影响计数（挂载/平台模板/教师任务）非零时，保存前用紧凑三列网格确认。
- **未保存离开**：返回按钮与 `history.block` 均轻确认（Modal 确认后离开，不保留现场），`beforeunload` 兜底；保存成功导航前解除阻止。dirty = 试题列表顺序变化，或保存弹窗中存在尚未提交的名称草稿。
- **预览**：参考教师端作业试卷的连续纸张排版，标题下提供班级/姓名纸面占位，题号与题干同行、选项桌面端双栏、答案解析折叠后以灰底分区呈现；学科与正式状态由页面标题区展示。预览无结构卡片与调序操作，试题内容按 ID 动态读取，缺题展示明确提示。
- **不含**教师端专属操作（相似题/纠错/收藏/下载）与复制/另存为入口。
- 编辑和新建发生题目列表变更时 dirty；保存弹窗打开期间，名称草稿同样纳入离开保护，取消弹窗即明确丢弃该草稿。

## 数据契约

页面从 `@/services/resourceAssets` 使用以下契约（由资源资产服务任务导出，页面未新增任何接口）：

| 名称 | 形态 |
| --- | --- |
| `QuestionOption` | `{ label, text }` |
| `PublishedQuestion` | `{ id, subject, knowledgeNodeIds, status, source, type, difficulty, year, stem, options?, answer, explanation, updatedAt, popularity }` |
| `HomeworkDetail` | `extends AssetItem { type: 'homework'; questionIds: string[] }` |
| `getAssetDetail({id, subject})` | `ApiResult<AssetItem \| StudyGuideDetail \| HomeworkDetail>`，运行时按 `type === 'homework'` 收窄 |
| `getResourceAssetContext({subject})` | 知识树 `knowledgeTree` 等上下文 |
| `getPublishedQuestions({subject})` | `ApiResult<PublishedQuestionPage>`，取 `list` 作为当前学科全部已发布试题，筛选/搜索/排序/分页在客户端完成（mock 未传 pageSize 时返回全量） |
| `getHomeworkQuestions({id, subject})` | `ApiResult<Array<{ questionId, question? }>>`，按返回顺序即为作业顺序 |
| `saveHomework({id?, subject, name, questionIds})` | `ApiResult<HomeworkDetail>`；有 id 走 PUT，无 id 走 POST |

难度显示映射（easy/medium/hard → 容易/中等/困难）取自契约枚举，见 `filtering.ts`；来源/题型/年份等筛选项由题目数据推导，不预设字段清单（PRD §8）。

## 21 条 AC 实现映射

| AC | 实现位置 |
| --- | --- |
| AC-01 学科继承并锁定 | `index.tsx` + `routeContext.ts`（query 校验，页面无学科选择器） |
| AC-02 工作台交互形态 | `Workbench.tsx`（树单选/筛选行切换/重置/排序/搜索/分页/题卡） |
| AC-03 仅已发布正式试题 | 数据源 `getPublishedQuestions`（mock 只回 published） |
| AC-04 加入作业/切换移除 | `Workbench.tsx` 题卡唯一主操作 |
| AC-05 禁止重复 | `basket.ts addQuestionId` 防重 + 按钮态切换 |
| AC-06 60 道上限文案 | `basket.ts QUESTION_BASKET_LIMIT_MESSAGE` |
| AC-07 调整顺序/移除/清空 | `Workbench.tsx` 右栏（清空含确认） |
| AC-08 空列表禁存提示 | `index.tsx handleSaveClick`（至少加入 1 道题） |
| AC-09 保存名称冲突阻止 | `SaveHomeworkModal.tsx` 错误落 name 字段 |
| AC-10 保存成功返回列表 | `index.tsx handleSaveConfirm` 跳转资产中心 |
| AC-11 只读预览 | `Preview.tsx` |
| AC-12 编辑按原顺序预载 | `index.tsx loadWorkbench`（`getHomeworkQuestions` 顺序） |
| AC-13 编辑增删调序保存 | `Workbench.tsx` + `saveHomework({id})` |
| AC-14 未保存离开轻确认 | `index.tsx`（dirty + history.block + beforeunload） |
| AC-15 被引用试题保护 | 仅账本能力：本模块不触发下架/淘汰/删除；跨试题生命周期 UI 未改时为跟踪项（见「假设与待确认」） |
| AC-16 引用禁止删除 | 资产中心既有删除保护（本模块不涉及删除） |
| AC-17 无教师端专属操作 | `Workbench.tsx`/`Preview.tsx` 不含相似题/纠错/收藏/下载 |
| AC-18 学科类型不可修改 | 页面无学科/类型修改入口，保存 payload 固定 subject |
| AC-19 修订自动跟随新版本 | 预览/编辑均按 ID 实时读取试题当前内容 |
| AC-20 无复制入口 | 页面无复制/另存为 |
| AC-21 编辑改名冲突阻止 | `SaveHomeworkModal.tsx` + `saveHomework` 冲突落字段 |

## 假设与待确认

- **纸面占位**：预览中的班级、姓名横线只用于模拟成品作业阅读/打印形态，不属于作业对象字段，也不会保存。
- **AC-15 被引用试题保护**：本模块仅提供作业对试题的引用账本能力（questionIds 顺序列表），不触发试题下架/淘汰/删除；跨试题资产线的生命周期阻断依赖试题资产线实现，当前未核验通过，AC-15 记为跟踪项，不得静默跳过。
- **筛选字段范围**：按 PRD §8 由题目数据推导（来源/题型/难度），待试题资产线数据盘点后裁剪；当前页面不预设字段清单。
- **知识点树数据源**：取 `getResourceAssetContext` 的 `knowledgeTree`（key 结构），与试题 `knowledgeNodeIds` 对齐；若知识体系变更需随数据源核验单选交互。
- **客户端筛选**：`getPublishedQuestions` 未传 `pageSize` 时 mock 返回全量；若后端改为强制分页，需改为服务端筛选（契约已支持 type/difficulty/keyword/knowledgeNodeId/sort 单值查询，但多选来源暂无法表达）。
- **试题引用粒度**：作业按试题 ID 引用（question 粒度），题组（question_set）处理待试题资产线数据模型核验。
- **删除保护统计依赖**：影响计数（挂载/平台模板/教师任务）沿用《管理资源资产》V0.8 的引用统计依赖，字段来自 `HomeworkDetail`（`AssetItem`）。

- **路由注册**：三条路由由资产中心任务注册在 `config/routes.ts`，本模块只解析 pathname，不修改路由。
