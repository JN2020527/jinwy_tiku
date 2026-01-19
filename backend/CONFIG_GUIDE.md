# 配置指南 (Configuration Guide)

本项目支持**本地开发**和**生产部署**两种环境配置。

## 环境配置文件

### 1. `.env.local` - 本地开发配置（Windows）
用于在 Windows 开发环境中进行本地开发和测试。

**特点:**
- ✅ 数据库连接到阿里云 PostgreSQL
- ✅ 文件保存到本地目录 `./storage/uploads` 和 `./storage/images`
- ✅ 可以正常上传文件和访问图片
- ✅ 适合开发调试

**配置内容:**
```env
DATABASE_URL=postgresql://postgres:Wax135!!!@39.97.193.79:5432/postgres?options=-csearch_path%3Dtiku
UPLOAD_DIR=./storage/uploads
IMAGE_DIR=./storage/images
ENVIRONMENT=development
```

### 2. `.env` - 生产环境配置（Linux服务器）
用于部署到阿里云 Linux 服务器。

**特点:**
- ✅ 数据库连接到阿里云 PostgreSQL（内网访问更快）
- ✅ 文件保存到服务器路径 `/home/juwk/img/uploads` 和 `/home/juwk/img/images`
- ✅ 适合生产部署

**配置内容:**
```env
DATABASE_URL=postgresql://postgres:Wax135!!!@39.97.193.79:5432/postgres?options=-csearch_path%3Dtiku
UPLOAD_DIR=/home/juwk/img/uploads
IMAGE_DIR=/home/juwk/img/images
ENVIRONMENT=production
```

---

## 自动配置加载逻辑

系统会自动检测并加载配置文件（优先级从高到低）：

1. **`.env.local`** - 如果存在，优先使用（本地开发）
2. **`.env`** - 如果 `.env.local` 不存在，使用此文件（生产环境）

**代码实现:** `app/config.py`
```python
class Config:
    env_file = ".env.local" if os.path.exists(".env.local") else ".env"
```

---

## 使用场景

### 场景 1: 本地开发（推荐）

**步骤:**
1. 确保 `.env.local` 文件存在
2. 启动后端服务:
   ```bash
   cd backend
   source venv/Scripts/activate  # Windows: venv\Scripts\activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
   ```
3. 系统自动使用本地配置，文件保存到 `./storage/`

**验证配置:**
```bash
python verify_local_config.py
```

**输出示例:**
```
[Environment]
  Environment: development
  Config file: .env.local

[File Storage]
  Upload directory: ./storage/uploads
  Image directory: ./storage/images

[SUCCESS] Local development configuration is correct!
```

### 场景 2: 生产部署

**步骤:**
1. 删除或重命名 `.env.local`（如果存在）
2. 确保 `.env` 配置正确
3. 在 Linux 服务器上创建目录:
   ```bash
   mkdir -p /home/juwk/img/uploads
   mkdir -p /home/juwk/img/images
   chmod 755 /home/juwk/img
   ```
4. 部署并启动服务:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

---

## 数据库配置说明

### 数据库连接参数
- **主机:** 39.97.193.79
- **端口:** 5432
- **数据库:** postgres
- **用户名:** postgres
- **密码:** Wax135!!!
- **Schema:** tiku（所有表都在 tiku schema 下）

### Schema 配置
通过 URL 参数 `options=-csearch_path=tiku` 设置默认 schema。

**注意:** 在 `.env` 文件中，`%` 需要转义为 `%%`：
```
options=-csearch_path%%3Dtiku
```

### 数据库表结构
- `tiku.papers` - 试卷表
- `tiku.questions` - 题目表
- `tiku.question_groups` - 材料题组表
- `tiku.question_contents` - 题目内容表
- `tiku.images` - 图片元数据表
- `tiku.alembic_version` - 迁移版本表

---

## 文件存储配置

### 本地开发（Windows）
```
项目根目录/
└── backend/
    └── storage/
        ├── uploads/     # 上传的Word文档
        │   └── {taskId}.docx
        └── images/      # 提取的图片
            └── {taskId}/
                ├── image_1_xxx.png
                ├── image_2_xxx.jpg
                └── ...
```

### 生产环境（Linux）
```
/home/juwk/img/
├── uploads/     # 上传的Word文档
│   └── {taskId}.docx
└── images/      # 提取的图片
    └── {taskId}/
        ├── image_1_xxx.png
        ├── image_2_xxx.jpg
        └── ...
```

---

## 图片访问 API

### 获取图片
```
GET /api/paper/images/{taskId}/{imageId}
```

**示例:**
```
GET http://localhost:8001/api/paper/images/abc123/1
```

**返回:** 图片文件（image/png, image/jpeg 等）

**说明:**
- 系统会自动在 `IMAGE_DIR/{taskId}/` 目录下查找匹配的图片文件
- 支持的格式: PNG, JPG, JPEG, GIF, BMP

---

## 环境切换

### 从生产环境切换到开发环境
```bash
# 1. 创建或启用 .env.local
cp .env .env.local
# 修改 .env.local 中的路径为本地路径
sed -i 's|/home/juwk/img|./storage|g' .env.local
sed -i 's|ENVIRONMENT=production|ENVIRONMENT=development|g' .env.local

# 2. 重启服务
# 系统会自动检测并使用 .env.local
```

### 从开发环境切换到生产环境
```bash
# 1. 删除或重命名 .env.local
mv .env.local .env.local.backup

# 2. 重启服务
# 系统会自动使用 .env
```

---

## 常见问题 (FAQ)

### Q1: 为什么本地开发也要连接远程数据库？
**A:** 为了保证数据一致性，本地开发和生产环境共享同一个数据库。只有文件存储路径不同。

### Q2: 如何知道当前使用的是哪个配置？
**A:** 运行验证脚本:
```bash
python verify_local_config.py
```

### Q3: 本地开发时图片存储在哪里？
**A:** 存储在项目的 `backend/storage/images/` 目录下，会自动创建。

### Q4: 如何清理本地存储的文件？
**A:** 直接删除目录:
```bash
rm -rf storage/uploads/* storage/images/*
```

### Q5: 部署到服务器时需要注意什么？
**A:**
1. 删除 `.env.local` 文件（或确保服务器上不存在）
2. 确保 `/home/juwk/img` 目录存在且有写权限
3. 重启服务后会自动使用 `.env` 配置

---

## 验证工具

### 验证当前配置
```bash
python verify_local_config.py
```

### 验证数据库连接
```bash
python test_connection.py
```

### 验证数据库表结构
```bash
python verify_setup.py
```

---

## 技术细节

### 配置加载机制
项目使用 `pydantic-settings` 管理配置，支持环境变量和 `.env` 文件。

**优先级（从高到低）:**
1. 环境变量
2. `.env.local` 文件（如果存在）
3. `.env` 文件
4. 默认值（代码中定义）

### 文件路径处理
- **Windows:** 支持相对路径 `./storage/uploads`
- **Linux:** 支持绝对路径 `/home/juwk/img/uploads`
- 系统在启动时会自动创建目录（如果不存在）

### 数据库 Schema
所有模型类都配置了 `__table_args__ = {'schema': 'tiku'}` 确保表创建在正确的 schema 下。

---

## 相关文件

- `app/config.py` - 配置管理
- `.env` - 生产环境配置
- `.env.local` - 本地开发配置
- `.gitignore` - 已配置忽略 `.env` 和 `.env.local`
- `verify_local_config.py` - 配置验证工具
- `test_connection.py` - 数据库连接测试
- `verify_setup.py` - 数据库表验证

---

**最后更新:** 2026-01-19
