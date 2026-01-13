# Research & Technical Decisions: 试题批量导入

**Feature**: 试题批量导入 | **Date**: 2026-01-13

## Overview

本文档记录试题批量导入功能的技术调研和决策过程，解决Technical Context中的所有技术选型和实现方案问题。

## Research Areas

### 1. Word文档解析方案

**Decision**: 使用 python-docx 进行结构化解析

**Rationale**:
- **结构化解析优势**: python-docx可以访问Word文档的段落、样式、表格等结构信息，适合识别试题的层级关系
- **成熟稳定**: python-docx是Python生态中最成熟的Word文档处理库，社区活跃，文档完善
- **格式支持**: 支持.docx格式（Office 2007+），.doc格式可通过LibreOffice转换
- **性能可接受**: 对于1000题以内的文档，解析时间在可接受范围内（<5分钟）

**Alternatives Considered**:
- **python-docx2txt**: 只能提取纯文本，无法获取结构信息，不适合复杂试题解析
- **Apache POI (Java)**: 功能强大但需要引入Java依赖，增加部署复杂度，违反Maintainability原则
- **OCR方案**: 准确率低（<90%），不符合Data Integrity原则，且性能差

**Implementation Notes**:
- 使用段落样式（Heading 1/2/3）识别试题层级
- 使用编号格式（1. 2. 3.）识别题干、答案、解析
- 对于.doc格式，使用LibreOffice命令行工具转换为.docx后再解析

---

### 2. 异步任务处理方案

**Decision**: 使用 Celery + Redis 处理异步导入任务

**Rationale**:
- **长时间任务**: 500题导入可能需要5分钟，必须异步处理避免HTTP超时
- **进度追踪**: Celery支持任务状态查询和进度更新，满足FR-003实时进度显示需求
- **任务取消**: Celery支持任务撤销，满足FR-012取消操作需求
- **Django集成**: django-celery-results提供开箱即用的集成方案

**Alternatives Considered**:
- **Django Channels + WebSocket**: 实现复杂，增加系统复杂度，违反Maintainability原则
- **同步处理 + 轮询**: 无法支持任务取消，用户体验差
- **RQ (Redis Queue)**: 功能较简单，不支持任务撤销

**Implementation Notes**:
- Redis作为消息代理（broker）和结果后端（backend）
- 使用Celery的task.update_state()更新进度
- 前端通过轮询API获取任务状态和进度

---

### 3. 重复试题检测方案

**Decision**: 使用 题干文本相似度 + 数据库索引 实现重复检测

**Rationale**:
- **简单有效**: 对于10万题规模，基于题干文本的相似度检测足够准确
- **性能可控**: 使用PostgreSQL的全文搜索索引（GIN索引）加速查询
- **可扩展**: 后续可引入更复杂的算法（如SimHash、MinHash）

**Alternatives Considered**:
- **MD5哈希**: 无法检测相似但不完全相同的试题
- **向量相似度（Embedding）**: 需要引入机器学习模型，增加复杂度，当前规模不需要
- **Elasticsearch**: 引入新的存储系统，增加运维成本，违反Maintainability原则

**Implementation Notes**:
- 使用PostgreSQL的`pg_trgm`扩展计算文本相似度
- 在Question.stem字段上创建GIN索引
- 相似度阈值设为0.85（可配置）
- 检测到重复时，返回相似试题列表供用户选择处理方式

---

### 4. 文件上传和存储方案

**Decision**: 使用 Django FileField + 本地文件系统存储

**Rationale**:
- **简单直接**: Django内置文件上传处理，无需额外依赖
- **临时存储**: Word文档仅在解析时需要，解析完成后可删除，无需长期存储
- **成本低**: 本地存储无额外成本，符合小团队资源约束

**Alternatives Considered**:
- **对象存储（OSS/S3）**: 增加外部依赖和成本，当前规模不需要
- **数据库BLOB**: 影响数据库性能，不推荐

**Implementation Notes**:
- 上传文件存储在`media/uploads/temp/`目录
- 文件名使用UUID避免冲突
- 解析完成后，使用Celery定时任务清理7天前的临时文件
- 文件大小限制在Django settings中配置（FILE_UPLOAD_MAX_MEMORY_SIZE = 50MB）

---

### 5. 前端状态管理方案

**Decision**: 使用 Pinia 进行状态管理

**Rationale**:
- **Vue 3官方推荐**: Pinia是Vue 3的官方状态管理库，替代Vuex
- **类型安全**: 完整的TypeScript支持
- **简单直观**: API设计简洁，学习成本低，符合Maintainability原则

**Alternatives Considered**:
- **Vuex**: Vue 2时代的方案，Vue 3推荐使用Pinia
- **组件内状态**: 导入流程涉及多个页面，需要全局状态管理

**Implementation Notes**:
- 创建`importStore`管理导入流程状态（上传、解析、预览、导入）
- 存储当前任务ID、进度、解析结果、错误信息
- 使用Pinia的持久化插件（pinia-plugin-persistedstate）保存状态到localStorage

---

### 6. API设计模式

**Decision**: 使用 RESTful API + 轮询模式

**Rationale**:
- **标准化**: RESTful API是行业标准，易于理解和维护
- **简单可靠**: 轮询模式实现简单，无需WebSocket等复杂技术
- **符合Constitution**: 避免过度设计，优先简单直接的实现方案

**Alternatives Considered**:
- **GraphQL**: 增加学习成本和复杂度，当前场景不需要
- **WebSocket**: 实现复杂，增加运维成本，违反Maintainability原则
- **Server-Sent Events (SSE)**: 浏览器兼容性问题，轮询更可靠

**API Endpoints**:
```
POST   /api/imports/upload/          # 上传Word文档
POST   /api/imports/parse/           # 触发解析任务
GET    /api/imports/tasks/{id}/      # 查询任务状态和进度
GET    /api/imports/preview/{id}/    # 获取解析结果预览
POST   /api/imports/confirm/{id}/    # 确认导入
POST   /api/imports/cancel/{id}/     # 取消任务
GET    /api/imports/logs/            # 查询导入日志
```

---

### 7. 数据库事务策略

**Decision**: 使用 Django ORM事务 + 部分成功导入策略

**Rationale**:
- **数据完整性**: 使用事务确保单个试题的导入是原子操作
- **用户友好**: 部分失败时不回滚全部，成功的试题入库，失败的生成错误报告
- **符合FR-006**: 支持部分成功导入

**Implementation Strategy**:
```python
# 伪代码示例
with transaction.atomic():
    for question_data in parsed_questions:
        try:
            with transaction.atomic():  # 嵌套事务（savepoint）
                question = Question.objects.create(**question_data)
                success_count += 1
        except Exception as e:
            ParseError.objects.create(
                task=import_task,
                position=question_data['position'],
                error_message=str(e)
            )
            error_count += 1
```

**Alternatives Considered**:
- **全部成功或全部回滚**: 用户体验差，一个错误导致全部失败
- **先验证后导入**: 需要两次遍历，性能差

---

### 8. 测试策略

**Decision**: 单元测试 + 集成测试 + 端到端测试

**Test Coverage**:
- **单元测试（pytest）**:
  - Word解析器测试（各种格式、边界情况）
  - 数据模型验证测试
  - 重复检测算法测试
  - 目标覆盖率: >70%

- **集成测试（pytest + Django TestCase）**:
  - 完整导入流程测试（上传 → 解析 → 预览 → 导入）
  - API端点测试
  - 数据库事务测试

- **端到端测试（Playwright/Cypress）**:
  - 用户导入流程测试（可选，时间允许时实现）

**Implementation Notes**:
- 使用pytest-django进行Django测试
- 准备测试用Word文档（包含各种格式和边界情况）
- 使用factory_boy生成测试数据
- CI/CD集成测试自动化

---

## Technology Stack Summary

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| Backend Framework | Django | 4.2+ | 成熟稳定，内置ORM和认证系统 |
| API Framework | Django REST Framework | 3.14+ | RESTful API标准实现 |
| Word解析 | python-docx | 0.8.11+ | 结构化解析，成熟稳定 |
| 异步任务 | Celery | 5.3+ | 支持进度追踪和任务取消 |
| 消息队列 | Redis | 7.0+ | 轻量级，易于部署 |
| 数据库 | PostgreSQL | 14+ | 企业级可靠性，全文搜索支持 |
| Frontend Framework | Vue | 3.3+ | 渐进式框架，易于学习 |
| UI Library | Ant Design Vue | 4.0+ | 企业级组件库，开箱即用 |
| 状态管理 | Pinia | 2.1+ | Vue 3官方推荐 |
| HTTP Client | Axios | 1.6+ | 标准HTTP客户端 |
| 测试框架 | pytest, Vitest | Latest | 行业标准测试工具 |
| 容器化 | Docker | 24+ | 标准化部署 |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Word文档格式多样性 | High | 提供格式规范文档和模板，详细错误提示 |
| 解析准确率不达标 | High | 充分测试，准备多样化测试用例，迭代优化解析器 |
| 大文档性能问题 | Medium | 限制单次导入1000题，使用异步任务，优化解析算法 |
| 并发导入冲突 | Low | 使用数据库事务，Celery任务队列自然串行化 |
| 依赖库兼容性 | Low | 锁定依赖版本，使用Docker容器化 |

---

## Next Steps

1. ✅ 技术调研完成，所有NEEDS CLARIFICATION已解决
2. ⏭️ Phase 1: 设计数据模型（data-model.md）
3. ⏭️ Phase 1: 定义API契约（contracts/openapi.yaml）
4. ⏭️ Phase 1: 编写快速开始指南（quickstart.md）
5. ⏭️ Phase 2: 生成任务清单（tasks.md）

