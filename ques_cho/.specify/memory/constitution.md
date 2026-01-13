<!--
Sync Impact Report:
- Version: 1.0.0 (Initial Constitution)
- Created: 2026-01-13
- Ratified: 2026-01-13
- Last Amended: 2026-01-13

Principles Defined:
  I. Data Integrity First (NON-NEGOTIABLE)
  II. Audit Trail (操作可追溯)
  III. User-Centric (用户友好)
  IV. Maintainability (代码可维护性)
  V. Data Security & Backup (数据安全与备份)

Technical Stack Decisions:
  - Frontend: Vue 3 + Ant Design Vue (明确选择，避免决策成本)
  - Backend: Python 3.9+ + Django/Django REST Framework
  - Database: PostgreSQL (明确选择，企业级可靠性)
  - Word解析: python-docx (结构化解析)
  - 部署: Docker容器化

Templates Consistency Check:
  ✅ .specify/templates/plan-template.md - Constitution Check section aligned
  ✅ .specify/templates/spec-template.md - Requirements structure aligned
  ✅ .specify/templates/tasks-template.md - Task phases aligned with principles
  ✅ .specify/templates/checklist-template.md - No conflicts
  ✅ .specify/templates/agent-file-template.md - No conflicts
  ✅ .claude/commands/*.md - All command files validated

Follow-up Actions:
  - Ready to proceed with /speckit.specify to create first feature specification
  - All templates are consistent with constitution principles
  - No pending clarifications or TODOs
-->

# 晋文源试题自动化筛选系统 Constitution

## Core Principles

### I. Data Integrity First (NON-NEGOTIABLE)

**试题数据的准确性和完整性是系统的生命线。**

- Word文档解析必须保证准确性，解析失败时必须有明确的错误提示和详细日志
- 试题导入过程中不能丢失任何信息（题目、选项、答案、解析等）
- 删除操作必须有二次确认机制，防止误删
- 数据库操作必须使用事务，确保数据一致性
- 关键数据修改前必须验证完整性约束

**Rationale**: 试题数据是核心资产，任何数据丢失或错误都会直接影响业务价值和用户信任。

### II. Audit Trail (操作可追溯)

**所有关键操作必须可追溯，支持问题排查和责任追踪。**

- 试题的增删改操作必须记录操作日志（操作人、时间、操作类型、变更内容）
- 批量删除、批量修改等高风险操作必须有详细记录
- 日志必须包含足够信息用于数据恢复和问题诊断
- 审计日志必须与业务数据分离存储，防止误删
- 提供日志查询界面，管理员可查看操作历史

**Rationale**: 内部系统需要明确责任，操作可追溯有助于问题定位和数据恢复。

### III. User-Centric (用户友好)

**界面操作必须简单直观，提升工作效率。**

- 筛选和搜索功能必须快速响应（<2秒），支持多条件组合
- 常用操作（选择、删除、编辑）必须在3次点击内完成
- 错误提示必须清晰易懂，避免技术术语，提供解决建议
- 批量操作必须有进度提示和中断机制
- 界面设计遵循一致性原则，减少学习成本

**Rationale**: 内部人员使用频繁，操作便捷性直接影响工作效率和满意度。

### IV. Maintainability (代码可维护性)

**代码必须清晰易懂，便于小团队长期维护。**

- 前后端分离，API接口清晰定义（使用RESTful规范）
- 复杂业务逻辑必须有注释说明（特别是Word解析、数据转换逻辑）
- 统一代码风格（前端ESLint + Prettier，后端Black/Flake8）
- 目录结构清晰，按功能模块组织
- 避免过度设计，优先简单直接的实现方案
- 关键配置（数据库连接、文件路径等）必须可配置化

**Rationale**: 小团队资源有限，代码可维护性直接影响长期迭代效率。

### V. Data Security & Backup (数据安全与备份)

**试题数据必须有安全保障和恢复机制。**

- 数据库必须定期自动备份（每日备份，保留7天）
- 支持试题数据导出为Excel/Word格式，避免数据锁定
- 实施基础权限管理（区分普通用户和管理员）
- 敏感操作（批量删除、数据清空）仅管理员可执行
- 提供数据恢复机制（从备份恢复）

**Rationale**: 数据安全是底线，备份和导出机制保证业务连续性。

## Technical Constraints

### Technology Stack

- **Frontend**: Vue 3 + Ant Design Vue
- **Backend**: Python 3.9+ + Django/Django REST Framework
- **Database**: PostgreSQL
- **Word解析**: python-docx 库（结构化解析）
- **部署**: 支持Docker容器化部署

### Performance Standards

- 页面首次加载时间 <3秒
- 筛选/搜索响应时间 <2秒
- 单次导入支持 <1000题（超过需分批）
- 支持并发用户数 <20人

### Code Quality

- 前端代码通过ESLint检查
- 后端代码通过Flake8/Black格式化
- 关键业务逻辑必须有单元测试
- API接口必须有文档（Swagger/OpenAPI）

## Development Workflow

### Git Workflow

- 主分支：`main`（生产环境）
- 功能分支：`feature/[功能名]`（从main分出）
- 修复分支：`fix/[问题描述]`
- Commit消息格式：`feat/fix/docs: 简短描述`

### Code Review

- 所有代码变更必须经过至少1人Review
- Review重点：数据完整性、日志记录、错误处理
- 合并前必须通过测试

### Testing Requirements

- 核心业务逻辑（Word解析、数据导入）必须有单元测试
- 关键接口（试题CRUD）必须有集成测试
- 测试覆盖率目标 >60%（不强制，但鼓励）

## Governance

### Constitution Authority

本宪法定义了"晋文源试题自动化筛选系统"的核心开发原则和技术约束，所有开发决策必须符合这些原则。

### Amendment Process

1. 宪法修订必须有充分理由（技术栈升级、业务需求重大变化等）
2. 修订需团队讨论并达成共识
3. 修订后必须更新版本号和修订日期
4. 修订历史必须记录在文档中

### Compliance Review

- 每个功能实现前必须检查是否符合宪法原则（使用plan.md的Constitution Check）
- 代码Review时必须验证：数据完整性、审计日志、用户体验、代码可维护性
- 违反原则的实现必须有充分的技术或业务理由，并记录在Complexity Tracking中

### Complexity Justification

任何增加系统复杂度的设计（引入新技术、新架构模式）必须：
- 说明为什么需要（解决什么问题）
- 说明为什么简单方案不可行
- 记录在实施计划的Complexity Tracking表格中

**Version**: 1.0.0 | **Ratified**: 2026-01-13 | **Last Amended**: 2026-01-13
