# 快速启动指南

## 本地开发环境（当前配置）

### 1. 启动后端服务
```bash
cd backend
source venv/Scripts/activate    # Windows Git Bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 2. 验证配置
```bash
python verify_local_config.py
```

**预期输出:**
```
[Environment]
  Environment: development
  Config file: .env.local

[File Storage]
  Upload directory: ./storage/uploads
  Image directory: ./storage/images

[SUCCESS] Local development configuration is correct!
```

### 3. 启动前端服务
```bash
cd my-app
npm run dev
```

访问: http://localhost:8002

---

## 服务地址

### 后端
- API服务: http://localhost:8001
- API文档: http://localhost:8001/docs
- 图片访问: http://localhost:8001/api/paper/images/{taskId}/{imageId}

### 前端
- 主页: http://localhost:8002
- Word上传: http://localhost:8002/question-bank/word-upload

### 数据库
- 主机: 39.97.193.79:5432
- 数据库: postgres
- Schema: tiku

---

## 配置文件说明

### 当前使用: `.env.local` (本地开发)
```env
DATABASE_URL=postgresql://postgres:Wax135!!!@39.97.193.79:5432/postgres?options=-csearch_path%3Dtiku
UPLOAD_DIR=./storage/uploads
IMAGE_DIR=./storage/images
ENVIRONMENT=development
```

### 生产环境: `.env`
```env
DATABASE_URL=postgresql://postgres:Wax135!!!@39.97.193.79:5432/postgres?options=-csearch_path%3Dtiku
UPLOAD_DIR=/home/juwk/img/uploads
IMAGE_DIR=/home/juwk/img/images
ENVIRONMENT=production
```

---

## 测试功能

### 测试图片API
```bash
# 使用测试脚本创建的图片
curl http://localhost:8001/api/paper/images/675b8fe1-ac49-4e90-bccf-a2240ad60858/1 -o test.png

# 或在浏览器打开
http://localhost:8001/api/paper/images/675b8fe1-ac49-4e90-bccf-a2240ad60858/1
```

### 测试Word上传
1. 访问 http://localhost:8002/question-bank/word-upload
2. 上传 .docx 文件
3. 查看解析结果
4. 校对并提交

---

## 管理工具

### 一键管理工具
```bash
cd backend
python manage.py
```

**功能菜单:**
1. 检查当前配置
2. 测试数据库连接
3. 查看数据库统计
4. 清理数据库测试数据
5. 清理本地存储文件
6. 测试图片存储
7. 验证数据库设置

### 快速命令

```bash
# 检查配置
python check_db_location.py

# 清理测试数据
python cleanup_test_data.py

# 清理本地文件
python cleanup_local_files.py
```

## 常用命令

### 数据库迁移
```bash
cd backend
alembic upgrade head           # 应用迁移
alembic current                # 查看当前版本
alembic revision --autogenerate -m "description"  # 创建新迁移
```

### 查看日志
```bash
# 后端日志在控制台输出
# 前端日志在浏览器控制台
```

### 清理存储（手动方式）
```bash
cd backend
rm -rf storage/uploads/* storage/images/*
```

---

## 故障排除

### 后端无法启动
```bash
# 检查端口是否被占用
netstat -an | grep 8001

# 检查配置
python verify_local_config.py

# 检查数据库连接
python test_connection.py
```

### 前端无法启动
```bash
# 检查端口
netstat -an | grep 8002

# 重新安装依赖
cd my-app
rm -rf node_modules
npm install
```

### 图片无法访问
```bash
# 检查存储目录
ls -la backend/storage/images/

# 测试图片API
python test_image_storage.py
```

---

## 详细文档

- 完整配置说明: [CONFIG_GUIDE.md](CONFIG_GUIDE.md)
- 项目文档: [CLAUDE.md](../CLAUDE.md)
- Word解析规则: [WORD_PARSING_GUIDE.md](../WORD_PARSING_GUIDE.md)
