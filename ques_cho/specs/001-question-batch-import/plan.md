# Implementation Plan: 试题批量导入

**Branch**: `001-question-batch-import` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-question-batch-import/spec.md`

## Summary

实现试题批量导入功能，支持从Word文档（.doc/.docx）解析三种试题结构（简单题、材料题、试题集合）并导入到PostgreSQL数据库。采用Vue 3 + Ant Design Vue前端和Django REST Framework后端，使用python-docx进行结构化解析，确保数据完整性、操作可追溯性和用户友好的交互体验。

## Technical Context

**Language/Version**: Python 3.9+, JavaScript (Vue 3)  
**Primary Dependencies**: Django 4.2+, Django REST Framework, python-docx, Vue 3, Ant Design Vue, Celery (异步任务)  
**Storage**: PostgreSQL 14+  
**Testing**: pytest (backend), Vitest (frontend)  
**Target Platform**: Linux server (Docker容器化部署)  
**Project Type**: Web application (前后端分离)  
**Performance Goals**: 
- 100道试题导入时间 <3分钟
- 500道试题导入时间 <5分钟
- 筛选/搜索响应时间 <2秒
- 页面首次加载时间 <3秒

**Constraints**: 
- 单次上传文件大小 ≤50MB
- 单次导入试题数量 ≤1000题
- 并发用户数 <20人
- Word文档解析准确率 ≥95%

**Scale/Scope**: 
- 预计用户数 <20人（内部使用）
- 题库规模预计 10万题以内
- 单个Word文档平均 50-200题

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Data Integrity First ✅ PASS

**Requirements**:
- Word文档解析必须保证准确性，解析失败时必须有明确的错误提示和详细日志
- 试题导入过程中不能丢失任何信息
- 删除操作必须有二次确认机制
- 数据库操作必须使用事务

**Implementation Approach**:
- 使用python-docx进行结构化解析，解析失败时记录详细错误位置和原因（FR-005）
- 导入过程使用数据库事务，确保原子性（部分失败时可回滚或继续，FR-006）
- 导入前预览功能，用户确认后再入库（FR-009）
- 试题完整性验证：题干不能为空，答案和解析可选但需标记（FR-004）
- 删除操作需二次确认（前端实现）

**Compliance**: ✅ 完全符合

---

### II. Audit Trail ✅ PASS

**Requirements**:
- 试题的增删改操作必须记录操作日志
- 批量删除、批量修改等高风险操作必须有详细记录
- 日志必须包含足够信息用于数据恢复和问题诊断
- 审计日志必须与业务数据分离存储

**Implementation Approach**:
- 实现ImportLog模型记录每次导入操作（操作人、时间、文档名称、导入结果，FR-007）
- 使用Django信号机制自动记录试题的增删改操作
- 审计日志存储在独立表中，与业务数据分离
- 导入报告包含成功数量、失败数量、错误详情、耗时（FR-011）

**Compliance**: ✅ 完全符合

---

### III. User-Centric ✅ PASS

**Requirements**:
- 筛选和搜索功能必须快速响应（<2秒）
- 常用操作必须在3次点击内完成
- 错误提示必须清晰易懂，避免技术术语，提供解决建议
- 批量操作必须有进度提示和中断机制

**Implementation Approach**:
- 实时进度显示：已处理试题数/总试题数（FR-003）
- 错误提示包含错误位置、原因、修复建议（FR-005）
- 支持导入任务取消操作（FR-012）
- 使用Ant Design Vue组件提供一致的用户体验
- 导入流程：上传 → 解析预览 → 确认导入（3步完成）

**Compliance**: ✅ 完全符合

---

### IV. Maintainability ✅ PASS

**Requirements**:
- 前后端分离，API接口清晰定义（使用RESTful规范）
- 复杂业务逻辑必须有注释说明（特别是Word解析、数据转换逻辑）
- 统一代码风格（前端ESLint + Prettier，后端Black/Flake8）
- 目录结构清晰，按功能模块组织
- 避免过度设计，优先简单直接的实现方案

**Implementation Approach**:
- 前后端分离架构，使用Django REST Framework提供RESTful API
- API文档使用drf-spectacular生成OpenAPI规范
- Word解析逻辑封装在独立的parser模块，包含详细注释
- 代码风格检查集成到CI/CD流程
- 目录结构按功能模块组织（见Project Structure）

**Compliance**: ✅ 完全符合

---

### V. Data Security & Backup ✅ PASS

**Requirements**:
- 数据库必须定期自动备份（每日备份，保留7天）
- 支持试题数据导出为Excel/Word格式
- 实施基础权限管理（区分普通用户和管理员）
- 敏感操作（批量删除、数据清空）仅管理员可执行

**Implementation Approach**:
- 使用Django内置权限系统实现用户认证和权限管理
- 导入功能需要登录认证（依赖用户认证系统）
- 数据库备份通过Docker容器定时任务实现（部署配置）
- 导出功能作为后续功能（本期不实现，但数据模型支持）

**Compliance**: ✅ 完全符合（备份和导出功能在部署阶段实现）

---

**Overall Gate Status**: ✅ PASS - All principles satisfied, ready for Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/001-question-batch-import/
├── plan.md              # This file
├── research.md          # Phase 0: 技术调研和决策
├── data-model.md        # Phase 1: 数据模型设计
├── quickstart.md        # Phase 1: 快速开始指南
├── contracts/           # Phase 1: API契约
│   └── openapi.yaml     # OpenAPI规范
└── tasks.md             # Phase 2: 任务清单（由/speckit.tasks生成）
```

### Source Code (repository root)

```text
backend/
├── config/                      # Django项目配置
│   ├── settings/
│   │   ├── base.py             # 基础配置
│   │   ├── development.py      # 开发环境配置
│   │   └── production.py       # 生产环境配置
│   ├── urls.py                 # 根URL配置
│   └── wsgi.py
├── apps/
│   ├── questions/              # 试题管理应用
│   │   ├── models.py           # Question, Material, QuestionSet
│   │   ├── serializers.py      # DRF序列化器
│   │   ├── views.py            # API视图
│   │   └── urls.py
│   ├── imports/                # 导入功能应用
│   │   ├── models.py           # ImportTask, ImportLog, ParseError
│   │   ├── serializers.py
│   │   ├── views.py            # 上传、解析、导入API
│   │   ├── tasks.py            # Celery异步任务
│   │   ├── parsers/            # Word解析器
│   │   │   ├── base.py         # 基础解析器接口
│   │   │   ├── simple_parser.py    # 简单题解析器
│   │   │   ├── material_parser.py  # 材料题解析器
│   │   │   └── set_parser.py       # 试题集合解析器
│   │   └── urls.py
│   └── users/                  # 用户认证（依赖项）
│       ├── models.py
│       └── views.py
├── tests/
│   ├── unit/                   # 单元测试
│   │   ├── test_parsers.py     # 解析器测试
│   │   └── test_models.py
│   └── integration/            # 集成测试
│       └── test_import_flow.py # 导入流程测试
├── requirements/
│   ├── base.txt                # 基础依赖
│   ├── development.txt         # 开发依赖
│   └── production.txt          # 生产依赖
└── manage.py

frontend/
├── src/
│   ├── views/                  # 页面组件
│   │   └── import/
│   │       ├── UploadPage.vue      # 上传页面
│   │       ├── PreviewPage.vue     # 预览页面
│   │       └── ResultPage.vue      # 结果页面
│   ├── components/             # 通用组件
│   │   ├── QuestionCard.vue        # 试题卡片
│   │   ├── ProgressBar.vue         # 进度条
│   │   └── ErrorList.vue           # 错误列表
│   ├── services/               # API服务
│   │   └── importService.js        # 导入相关API调用
│   ├── stores/                 # Pinia状态管理
│   │   └── importStore.js          # 导入状态
│   ├── router/
│   │   └── index.js                # 路由配置
│   └── App.vue
├── tests/
│   └── unit/
│       └── components/
└── package.json

docker/
├── docker-compose.yml          # 开发环境编排
├── Dockerfile.backend          # 后端镜像
├── Dockerfile.frontend         # 前端镜像
└── nginx.conf                  # Nginx配置
```

**Structure Decision**: 采用Web应用结构（Option 2），前后端完全分离。后端使用Django应用模块化组织（questions、imports、users），前端使用Vue 3单页应用。这种结构符合Constitution的Maintainability原则，便于小团队维护和功能扩展。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

本功能设计完全符合Constitution所有原则，无需记录违规情况。

