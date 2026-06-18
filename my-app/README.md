# 晋文源题库前端原型

这是一个面向 K12 教育内容管理场景的纯前端原型项目，用于验证题库任务、试题上传、在线校对、标签设定和试题打标等核心流程。项目不依赖真实后端、数据库或生产 API，所有演示数据均来自本地 mock 或页面内 mock 数据。

## 技术栈

- Umi Max 4
- React 18
- TypeScript
- Ant Design 5 / Pro Components
- wangEditor 5
- DOMPurify

## 本地启动

首次运行先安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

也可以使用等价命令：

```bash
npm run start
```

默认访问地址：

```text
http://localhost:8000
```

## 常用命令

```bash
npm run dev      # 启动本地开发服务
npm run start    # 等同于 npm run dev
npm run build    # 生产构建
npm run format   # 使用 Prettier 格式化代码
npm run setup    # 重新生成 Umi 相关产物
```

当前项目没有配置 `npm test` 脚本或自动化测试框架。变更后建议至少运行 `npm run build`，并在浏览器中完成对应流程的手动验证。

## 项目结构

```text
config/                 # Umi 路由、默认布局与项目配置
mock/                   # 本地 mock API
src/
  components/           # 跨页面复用组件
  hooks/                # 通用 React hooks
  pages/                # 页面与业务模块
  services/             # 前端请求边界
  utils/                # HTML 清洗、题干解析等工具
Public/                 # 静态资源
docs/                   # 设计与实现文档
```

主要业务模块：

- `src/pages/ContentCenter/TagManage`：标签设定，包括知识体系、专题体系、题型管理、属性设置和属性应用。
- `src/pages/ContentCenter/QuestionBankTask`：题库任务列表。
- `src/pages/PaperUpload`：Word 试题上传。
- `src/pages/PaperUpload/Edit`：上传后的在线校对，全屏页面。
- `src/pages/QuestionTagging`：试题打标，全屏工作区。
- `src/pages/ContentCenter/AnswerManage`：答案管理。

## 路由说明

路由集中维护在 `config/routes.ts`。

- `/content/*`：内容中心相关页面。
- `/question-bank/task`：题库任务。
- `/question-bank/word-upload`：试题上传。
- `/question-bank/word-upload/edit`：在线校对，使用 `layout: false`。
- `/question-bank/tagging-fullscreen`：试题打标，使用 `layout: false`。
- `/tag-system/*`：标签设定主路径。
- `/question-bank/tag-system/*`：兼容旧入口的重定向路径。

新增页面时请先更新 `config/routes.ts`，再在 `src/pages` 下按业务模块组织页面文件。

## Mock 数据与 Service 约定

项目是纯前端原型，新增功能时请继续使用“页面 + service + mock”或页面本地 mock 数据的方式，不要引入真实后端依赖。

已有 service/mock 配对：

```text
src/services/tagSystem.ts        <-> mock/tagSystem.ts
src/services/paperUpload.ts      <-> mock/paperUpload.ts
src/services/questionBankTask.ts <-> mock/questionBankTask.ts
```

`QuestionTagging` 使用页面内本地数据：

```text
src/pages/QuestionTagging/mockData.ts
```

如果新增或修改 `src/services/*` 中的接口，请同步更新对应的 `mock/*.ts`，并保持响应结构与页面消费方式一致。

## 开发约定

- 使用 TypeScript 和 React 函数组件。
- 复杂页面优先采用 feature-first 结构：`index.tsx`、`components/`、`types.ts`、相关 `.less` 文件。
- 新增组件前先搜索 `src/components` 和当前业务模块的 `components/`，优先复用或扩展已有组件，避免重复开发。
- Prettier 使用单引号、尾随逗号、80 字符宽度，并自动整理 imports。
- 不要手动修改 Umi 生成产物。
- 渲染题干、答案、解析等 HTML 内容前，必须使用 `src/utils/sanitize.ts` 中的清洗逻辑，再传给 `dangerouslySetInnerHTML`。

## 参考文档

- [Umi Max 文档](https://umijs.org/docs/max/introduce)
- [Ant Design 文档](https://ant.design/)
