# 当前配置说明

## 📋 配置概览

**环境类型：** 混合开发环境（数据库远程 + 文件本地）

```
┌─────────────────────────────────────────────┐
│  当前配置（2026-01-19）                      │
│                                             │
│  📊 数据库：远程阿里云 PostgreSQL            │
│     - 地址: 39.97.193.79:5432              │
│     - Schema: tiku                          │
│     - 与生产环境共享                        │
│                                             │
│  📁 文件存储：本地磁盘                       │
│     - Word文档: ./storage/uploads/          │
│     - 图片文件: ./storage/images/           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✅ 优点

1. **无需本地数据库** - 节省系统资源，不需要Docker
2. **数据持久化** - 数据保存在云端，不会丢失
3. **数据一致** - 本地开发和生产环境使用相同数据
4. **快速开始** - 无需安装配置数据库

---

## ⚠️ 注意事项

### 1. 测试数据管理
所有在本地上传的测试试卷数据都会保存到生产数据库中。

**建议做法：**
- 使用明确的测试标识命名（如：`测试-化学试卷-2026`）
- 定期清理测试数据
- 重要：不要上传敏感或错误的数据

### 2. 数据安全
- 不要在测试时使用真实学生数据
- 避免上传包含个人信息的试卷
- 测试完成后及时删除测试数据

### 3. 网络依赖
- 需要稳定的网络连接访问数据库
- 数据库操作会有网络延迟（通常50-200ms）
- 离线状态无法使用应用

---

## 🔧 数据管理工具

### 查看当前配置
```bash
cd backend
python check_db_location.py
```

### 清理测试数据（SQL脚本）

创建一个清理脚本：

```python
# cleanup_test_data.py
from sqlalchemy import create_engine, text
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url)

with engine.connect() as conn:
    # 查看所有试卷
    result = conn.execute(text("""
        SELECT task_id, paper_metadata->>'name' as name, created_at
        FROM tiku.papers
        ORDER BY created_at DESC
    """))

    print("Current papers in database:")
    for row in result:
        print(f"  - {row.name} (ID: {row.task_id[:8]}..., Created: {row.created_at})")

    # 删除测试数据（交互式确认）
    paper_name = input("\nEnter paper name to delete (or 'cancel'): ")
    if paper_name != 'cancel':
        conn.execute(text("""
            DELETE FROM tiku.papers
            WHERE paper_metadata->>'name' = :name
        """), {"name": paper_name})
        conn.commit()
        print(f"Deleted paper: {paper_name}")
```

---

## 📊 数据流程

### Word文档上传流程
```
1. 用户上传 .docx
   ↓
2. 文件保存到 ./storage/uploads/{taskId}.docx (本地)
   ↓
3. 解析提取图片 → ./storage/images/{taskId}/ (本地)
   ↓
4. 解析结果暂存内存
   ↓
5. 用户校对确认
   ↓
6. 提交数据 → 保存到阿里云PostgreSQL (远程)
   ├─ papers表：试卷元数据
   ├─ questions表：题目结构
   ├─ question_contents表：题干、答案、解析
   └─ images表：图片元数据（路径指向本地）
```

### 图片访问流程
```
1. 前端请求: GET /api/paper/images/{taskId}/{imageId}
   ↓
2. 后端查找: ./storage/images/{taskId}/image_{imageId}_*.*
   ↓
3. 返回图片文件 (从本地磁盘读取)
```

---

## 🗂️ 本地文件结构

```
backend/
└── storage/
    ├── uploads/                        # Word文档存储
    │   ├── abc-123-uuid.docx
    │   └── def-456-uuid.docx
    └── images/                         # 图片存储
        ├── abc-123-uuid/
        │   ├── image_1_inline.png
        │   ├── image_2_block.jpg
        │   └── ...
        └── def-456-uuid/
            └── ...
```

**注意：** 这些文件只存在本地，服务器上没有

---

## 🚀 日常使用流程

### 启动开发环境
```bash
# 1. 启动后端（会自动连接远程数据库）
cd backend
source venv/Scripts/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# 2. 启动前端
cd my-app
npm run dev

# 3. 访问应用
http://localhost:8002
```

### 上传测试试卷
1. 访问：http://localhost:8002/question-bank/word-upload
2. 填写试卷信息（建议加"测试"前缀）
3. 上传Word文档
4. 等待解析完成
5. 校对并提交

### 查看存储的数据
```bash
# 查看本地文件
cd backend
ls -lh storage/uploads/
ls -lh storage/images/

# 查看数据库（使用psql）
docker exec -it local_postgres psql -U postgres -d postgres
# 或使用Python脚本
python -c "from app.database import get_db; db = next(get_db()); print(db.execute('SELECT COUNT(*) FROM tiku.papers').scalar())"
```

---

## 🧹 定期维护

### 清理本地文件（每周/每月）
```bash
cd backend

# 备份重要文件（可选）
mkdir -p backups
cp -r storage backups/storage_$(date +%Y%m%d)

# 清理旧文件
find storage/uploads -mtime +30 -type f -delete  # 删除30天前的文件
find storage/images -mtime +30 -type d -empty -delete
```

### 清理数据库测试数据（按需）
```python
# 手动执行SQL
from sqlalchemy import create_engine, text
from app.config import get_settings

engine = create_engine(get_settings().database_url)
with engine.connect() as conn:
    # 删除包含"测试"的试卷
    result = conn.execute(text("""
        DELETE FROM tiku.papers
        WHERE paper_metadata->>'name' LIKE '%测试%'
        RETURNING task_id
    """))
    deleted_ids = [row[0] for row in result]
    conn.commit()
    print(f"Deleted {len(deleted_ids)} test papers")
```

---

## 📈 监控和诊断

### 检查数据库连接
```bash
python test_connection.py
```

### 检查表结构
```bash
python verify_setup.py
```

### 检查当前配置
```bash
python check_db_location.py
```

### 查看数据统计
```python
from sqlalchemy import create_engine, text
from app.config import get_settings

engine = create_engine(get_settings().database_url)
with engine.connect() as conn:
    stats = {}
    stats['papers'] = conn.execute(text("SELECT COUNT(*) FROM tiku.papers")).scalar()
    stats['questions'] = conn.execute(text("SELECT COUNT(*) FROM tiku.questions")).scalar()
    stats['images_meta'] = conn.execute(text("SELECT COUNT(*) FROM tiku.images")).scalar()

    print("Database Statistics:")
    for table, count in stats.items():
        print(f"  {table}: {count} rows")
```

---

## 🔄 未来迁移到生产环境

当需要将应用部署到服务器时：

### 步骤1：迁移文件
```bash
# 在服务器上创建目录
ssh user@39.97.193.79
mkdir -p /home/juwk/img/uploads
mkdir -p /home/juwk/img/images

# 从本地复制文件到服务器
scp -r backend/storage/uploads/* user@39.97.193.79:/home/juwk/img/uploads/
scp -r backend/storage/images/* user@39.97.193.79:/home/juwk/img/images/
```

### 步骤2：更新配置
删除 `.env.local`，使用 `.env` 配置文件（已配置好生产路径）

### 步骤3：部署代码
```bash
# 在服务器上
cd /path/to/project
git pull
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**数据库无需迁移** - 因为一直使用的就是远程数据库

---

## 📝 配置文件

### 当前使用：.env.local
```env
DATABASE_URL=postgresql://postgres:Wax135!!!@39.97.193.79:5432/postgres?options=-csearch_path%3Dtiku
UPLOAD_DIR=./storage/uploads
IMAGE_DIR=./storage/images
ENVIRONMENT=development
```

### 生产环境：.env
```env
DATABASE_URL=postgresql://postgres:Wax135!!!@39.97.193.79:5432/postgres?options=-csearch_path%3Dtiku
UPLOAD_DIR=/home/juwk/img/uploads
IMAGE_DIR=/home/juwk/img/images
ENVIRONMENT=production
```

---

## 💡 最佳实践

1. **命名规范**
   - 测试数据加前缀：`[测试] 化学试卷-第一章`
   - 正式数据：`2026年高考化学模拟卷-全国卷`

2. **定期清理**
   - 每周清理本地存储的旧文件
   - 每月清理数据库中的测试数据

3. **备份重要数据**
   - 定期导出重要试卷数据
   - 备份本地文件到其他位置

4. **性能优化**
   - 避免上传超大文件（>10MB）
   - 图片尽量使用压缩格式

5. **数据安全**
   - 不在测试环境使用真实学生数据
   - 定期更新数据库密码
   - 使用HTTPS连接数据库（生产环境）

---

## 🆘 常见问题

### Q: 为什么选择这种混合配置？
A: 考虑到：
- 电脑性能限制，无法运行Docker
- 需要快速开始开发，无需配置本地数据库
- 文件存储在本地，方便调试和查看
- 数据库在云端，保证数据持久化

### Q: 测试数据会影响生产吗？
A: 会的。测试数据和生产数据在同一个数据库中。建议：
- 使用明确的测试标识
- 定期清理测试数据
- 重要操作前确认数据正确性

### Q: 本地文件丢失了怎么办？
A:
- 本地文件只是缓存，主要数据在数据库
- 可以重新上传Word文档
- 图片元数据在数据库中，但图片文件本地独有

### Q: 如何切换到完全本地开发？
A: 如果以后电脑性能提升，可以：
```bash
# 安装并启动本地PostgreSQL或Docker
bash setup_local_db.sh
# 会自动切换配置
```

---

**配置确认日期：** 2026-01-19
**配置状态：** ✅ 已验证并正常运行
**维护人员：** 开发团队
