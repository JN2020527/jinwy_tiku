# 后端工具和脚本说明

## 📚 文档文件

| 文件名 | 说明 | 适用场景 |
|--------|------|----------|
| `QUICKSTART.md` | 快速启动指南 | 刚开始使用项目 |
| `CURRENT_CONFIG.md` | 当前配置详细说明 | 了解配置细节 |
| `CONFIG_GUIDE.md` | 完整配置指南 | 配置切换和管理 |
| `README_TOOLS.md` | 本文件 - 工具说明 | 查找工具用途 |

---

## 🛠️ 管理工具

### 1. `manage.py` - 一键管理工具 ⭐推荐
**功能：** 统一管理界面，包含所有常用功能

**使用方法：**
```bash
python manage.py
```

**菜单选项：**
- ✅ 检查当前配置
- ✅ 测试数据库连接
- ✅ 查看数据库统计
- ✅ 清理数据库测试数据
- ✅ 清理本地存储文件
- ✅ 测试图片存储
- ✅ 验证数据库设置

---

## 🔍 检查和诊断工具

### 2. `check_db_location.py` - 检查数据库位置
**功能：** 显示当前使用本地还是远程数据库

**使用方法：**
```bash
python check_db_location.py
```

**输出示例：**
```
[Data Storage Location]
  [WARNING] Using REMOTE database: 39.97.193.79
  [WARNING] Test data will be saved to PRODUCTION database!

[File Storage]
  Upload directory: ./storage/uploads
  [OK] Files stored on local disk
```

---

### 3. `test_connection.py` - 测试数据库连接
**功能：** 验证数据库连接是否正常

**使用方法：**
```bash
python test_connection.py
```

**输出示例：**
```
[OK] Connection successful!
[OK] PostgreSQL version: PostgreSQL 14.20...
[OK] Schema 'tiku' exists
[OK] Available databases: ['postgres']
```

---

### 4. `verify_setup.py` - 验证数据库设置
**功能：** 检查数据库表结构是否完整

**使用方法：**
```bash
python verify_setup.py
```

**输出示例：**
```
[Tables in tiku schema]
  [OK] papers
  [OK] questions
  [OK] question_groups
  [OK] question_contents
  [OK] images
  [OK] alembic_version

[OK] All 6 expected tables exist
```

---

### 5. `verify_local_config.py` - 验证本地配置
**功能：** 显示完整的本地开发配置信息

**使用方法：**
```bash
python verify_local_config.py
```

**输出示例：**
```
[Environment]
  Environment: development
  Config file: .env.local

[File Storage]
  Upload directory: ./storage/uploads
  Write access: [OK]

[SUCCESS] Local development configuration is correct!
```

---

### 6. `test_image_storage.py` - 测试图片存储
**功能：** 测试图片存储和API访问功能

**使用方法：**
```bash
python test_image_storage.py
```

**功能：**
- 创建测试图片
- 验证文件存储
- 生成API访问URL
- 可选择保留测试文件

---

## 🧹 清理工具

### 7. `cleanup_test_data.py` - 清理测试数据 ⭐推荐
**功能：** 从数据库中清理测试数据

**使用方法：**
```bash
python cleanup_test_data.py
```

**清理选项：**
1. 删除包含"测试"的试卷
2. 删除指定编号的试卷
3. 删除N天前的旧试卷
4. 仅查看统计信息

**交互式界面：**
```
[Current Papers] Total: 5
----------------------------------------------------------
1. 测试-化学试卷 (化学)
   ID: abc12345... | Created: 2026-01-19 14:30
2. 2026高考模拟卷 (数学)
   ID: def67890... | Created: 2026-01-18 10:15

Cleanup Options:
  1. Delete papers containing '测试' in name
  2. Delete a specific paper by number
  3. Delete papers older than N days
  4. View statistics only (no deletion)
  0. Cancel

Enter your choice (0-4):
```

---

### 8. `cleanup_local_files.py` - 清理本地文件 ⭐推荐
**功能：** 清理本地存储的Word文档和图片

**使用方法：**
```bash
python cleanup_local_files.py
```

**清理选项：**
1. 删除N天前的旧文件
2. 删除所有上传文件（保留图片）
3. 删除所有图片（保留上传文件）
4. 删除所有内容
5. 删除指定任务文件夹
6. 仅查看文件列表

**交互式界面：**
```
[Current Usage]
  Upload files:      3 files  (1.25 MB)
  Image folders:     3 folders
  Image files:      15 files  (856.34 KB)
  Total size:       2.09 MB

Cleanup Options:
  1. Delete files older than N days
  2. Delete all upload files (keep images)
  3. Delete all image files (keep uploads)
  4. Delete everything (uploads + images)
  5. Delete a specific task folder
  6. View file list only (no deletion)
  0. Cancel

Enter your choice (0-6):
```

---

## 🚀 设置和配置工具

### 9. `setup_local_db.sh` - 设置本地数据库
**功能：** 一键设置本地PostgreSQL Docker容器

**使用方法：**
```bash
bash setup_local_db.sh
```

**功能：**
- 启动本地PostgreSQL容器
- 更新`.env.local`配置
- 运行数据库迁移
- 创建表结构

**注意：** 需要Docker环境

---

## 📊 配置文件说明

### `.env.local` - 本地开发配置（当前使用）
```env
DATABASE_URL=postgresql://postgres:****@39.97.193.79:5432/postgres
UPLOAD_DIR=./storage/uploads
IMAGE_DIR=./storage/images
ENVIRONMENT=development
```

### `.env` - 生产环境配置
```env
DATABASE_URL=postgresql://postgres:****@39.97.193.79:5432/postgres
UPLOAD_DIR=/home/juwk/img/uploads
IMAGE_DIR=/home/juwk/img/images
ENVIRONMENT=production
```

### `.env.local.example` - 配置模板
包含三种配置选项的示例

---

## 📖 使用场景示例

### 场景1：开始新的开发
```bash
# 1. 检查配置
python check_db_location.py

# 2. 测试连接
python test_connection.py

# 3. 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 场景2：上传测试后清理
```bash
# 1. 清理数据库测试数据
python cleanup_test_data.py
# 选择选项1：删除包含"测试"的试卷

# 2. 清理本地文件
python cleanup_local_files.py
# 选择选项1：删除7天前的文件
```

### 场景3：定期维护（每周）
```bash
# 使用统一管理工具
python manage.py

# 选择以下操作：
# 3. 查看数据库统计
# 4. 清理测试数据
# 5. 清理本地文件
```

### 场景4：排查问题
```bash
# 1. 检查配置
python check_db_location.py

# 2. 测试数据库连接
python test_connection.py

# 3. 验证表结构
python verify_setup.py

# 4. 测试图片存储
python test_image_storage.py

# 5. 验证本地配置
python verify_local_config.py
```

---

## 🔗 相关命令

### Alembic数据库迁移
```bash
# 查看当前版本
alembic current

# 应用迁移
alembic upgrade head

# 创建新迁移
alembic revision --autogenerate -m "description"

# 回滚迁移
alembic downgrade -1
```

### 启动服务
```bash
# 后端
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# 前端
cd ../my-app && npm run dev
```

### 手动清理
```bash
# 清理本地文件（危险操作！）
rm -rf storage/uploads/*
rm -rf storage/images/*

# 重建目录
mkdir -p storage/uploads storage/images
```

---

## ⚠️ 注意事项

1. **数据库操作不可逆**
   - 删除数据库记录后无法恢复
   - 建议先使用"查看统计"功能确认

2. **文件清理**
   - 本地文件删除后无法恢复
   - 但可以重新上传Word文档重新生成

3. **测试数据标识**
   - 建议在试卷名称中加"测试"前缀
   - 方便后续批量清理

4. **定期维护**
   - 建议每周运行一次清理工具
   - 避免存储空间浪费

---

## 🆘 故障排除

### 工具无法运行
```bash
# 确保虚拟环境已激活
source venv/Scripts/activate  # Windows Git Bash

# 确保依赖已安装
pip install -r requirements.txt
```

### 数据库连接失败
```bash
# 检查网络连接
ping 39.97.193.79

# 测试数据库连接
python test_connection.py
```

### 文件路径错误
```bash
# 检查当前配置
python check_db_location.py

# 验证本地配置
python verify_local_config.py
```

---

## 📝 工具开发说明

所有工具脚本都位于 `backend/` 目录下：

**命名规范：**
- `check_*.py` - 检查类工具
- `test_*.py` - 测试类工具
- `verify_*.py` - 验证类工具
- `cleanup_*.py` - 清理类工具
- `setup_*.sh` - 设置脚本
- `manage.py` - 管理工具入口

**编码规范：**
- 使用纯ASCII输出（避免Windows编码问题）
- 交互式确认（避免误操作）
- 详细的错误提示
- 支持取消操作

---

**最后更新：** 2026-01-19
**维护人员：** 开发团队
