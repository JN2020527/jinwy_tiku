# Word上传解析功能说明与更正方案

## 📋 项目概述

**晋文源试卷管理系统** 的核心功能：将Word格式的考试试卷自动解析为结构化题目数据，支持在线校对和题库管理。

---

## ✅ 当前解析规则（现行）

### 结构识别
- 题型段落：以“`一、`/`二、`”开头的标题行。
- 题号：以“`1．`/`1.`”开头识别为题目起始。
- 小题号：以“`(1)`/`(2)`”开头识别为小问。
- 材料关键词：如“阅读下列材料，完成下面小题”“完成下列题目”等触发材料题模式（**填空题不触发材料模式**）。

### 小问处理（不拆 children）
- 以下题型的“(1)(2)(3)”作为**同题小问**直接保留在题干中，不再拆为 children：
  - 填空题
  - 简答题
  - 实验题
  - 解答题
  - 综合应用题

### 材料题与题组
- **材料 + 题组（模式2）**：材料后出现“3．/4．”这类编号，题目拆分为 children，答案/解析按“3．B 4．A”分配。
- **材料 + 小题（模式3）**：材料后出现“(1)(2)”并且题型非上述“内联小问题型”时，解析为父题 + children，小问答案/解析按“(1)…(2)…”分配。

### 属性块识别
- 支持识别并拆分：
  - `【答案】`
  - `【难度】`（支持 0-1 小数与 1-5 等级）
  - `【知识点】`
  - `【解析】/【详解】`
- 答案/解析支持三种模式：
  - 单题：`【答案】D`
  - 题组：`【答案】3．B 4．A`
  - 小问：`【答案】(1)…(2)…`

### 选项解析（选择题）
- 支持两种选项格式：
  - 行首：`A．…`
  - 同行多选项：`A．… B．…`
- 含公式的选项以 HTML 方式保留（MathML）。

### 公式、图片、下划线
- **公式**：OMML → MathML，保留在题干/选项/解析中。
- **图片**：提取为 `/api/paper/images/{taskId}/{imageId}`，并区分行内/块级：
  - 行内：`<img class="question-img inline" ... />`
  - 块级：`<img class="question-img" ... />`
- **下划线**：下划线文本转为 `<u>`，空白用 `&nbsp;` 保留长度。

---

## 🔄 完整解析流程

### 阶段1: 前端上传（my-app/src/pages/PaperUpload/index.tsx）
```
用户操作
 ↓
上传.docx文件 + 填写元数据（试卷名、学科、年份等）
 ↓
调用API: POST /api/paper/upload
 ↓
获得taskId，跳转到校对页面
```

### 阶段2: 后端接收（backend/app/api/v1/paper.py）
```
验证文件格式和大小
 ↓
生成任务ID（UUID）
 ↓
保存文件到storage/uploads/
 ↓
启动后台解析任务（BackgroundTasks）
 ↓
立即返回{taskId}
```

### 阶段3: 文档解析（backend/app/services/parse_service.py）

**核心编排器 ParseService 协调6个专业解析器：**

#### 1️⃣ DocxParser - 文档加载
- 使用python-docx加载Word文档
- 提取段落和表格

#### 2️⃣ ImageParser - 图片提取
- 从文档关系中提取所有图片
- 保存到storage/images/{taskId}/
- 生成访问URL

#### 3️⃣ StructureParser - 结构识别⭐
```python
识别内容：
- 题型段落: "一、选择题"
- 主题号: "1．题干"
- 小题号: "(1) 小题"
- 材料关键词: "阅读下列材料，完成下面小题"

输出：
question_blocks = [
    {
        "number": "1",
        "type": "选择题",
        "paragraphs": [段落列表],
        "is_material": False,
        "sub_questions": []
    },
    ...
]
```

#### 4️⃣ ContentParser - 内容提取⭐
```python
识别属性块：
【答案】D
【难度】0.65
【知识点】化学反应、化学平衡
【详解】/【解析】详细解释...

提取选项（选择题）：
A．选项A
B．选项B

输出：
{
    "stem": "题干文本",
    "options": ["A. 选项A", "B. 选项B"],
    "answer": "D",
    "difficulty": 3,  # 标准化后
    "knowledge_points": ["化学反应", "化学平衡"],
    "analysis": "详细解释"
}
```

#### 5️⃣ FormulaParser - 公式转换
- 检测OMML数学公式
- 转换为MathML格式
- 嵌入HTML

#### 6️⃣ TokenGenerator - HTML生成
```python
Token流：
[文本] → [公式MathML] → [图片img] → [文本]
  ↓
HTML输出：
<p>文本<math>...</math><img src="/api/..."/>...</p>
```

### 阶段4: 前端校对（my-app/src/pages/PaperUpload/Edit/index.tsx）
```
三栏布局：
┌──────────┬──────────────┬──────────┐
│ 原件预览  │   题目列表    │ 属性面板  │
│         │  [题1卡片]   │  题型     │
│ (Mock)  │  [题2卡片]   │  难度⭐⭐⭐│
│         │  [题3卡片]   │  知识点   │
│         │              │  富文本   │
└──────────┴──────────────┴──────────┘

功能：
- 点击题目卡片 → 右侧显示详细编辑面板
- 富文本编辑器（wangEditor）编辑题干/答案/解析
- 修改题型、难度、知识点
- 实时更新状态
```

### 阶段5: 提交入库（backend/app/api/v1/paper.py）
```
POST /api/paper/submit
 ↓
调用QuestionService
 ↓
保存到PostgreSQL：
- papers表（试卷元数据）
- questions表（题目主表）
- question_contents表（内容详情）
- images表（图片引用）
```

---

## 🔍 实际Word格式分析

基于 `2026年1月16日初中化学作业.docx` 分析发现：

### ✅ 三种题目模式

#### 模式1: 单题模式（最常见）
```
1．题干内容
A．选项A
B．选项B
【答案】D
【难度】0.65
【知识点】化学反应、化学平衡
【详解】详细解释...
```

#### 模式2: 题组形式（材料+多题共享答案）
```
阅读下列材料，完成下面小题
材料内容...

3．题3题干
A．选项...

4．题4题干
A．选项...

【答案】3．B    4．A
【难度】0.65
【知识点】知识点列表
【解析】3．解析3内容
4．解析4内容
```

#### 模式3: 材料+小题（独立小题答案）
```
7．主题干
(1)小题1题干
(2)小题2题干

【答案】(1)答案1
(2)答案2
【难度】0.85
【知识点】知识点列表
【详解】（1）解释1
（2）解释2
```

---

## ⚠️ 发现的问题

### 问题1: 【详解】未被识别
- **当前代码**: 只匹配 `【解析】`
- **实际文档**: 大量使用 `【详解】`
- **影响**: 解析丢失

### 问题2: 难度值格式不统一
- **实际格式**:
  - `【难度】0.65` （难度系数，0-1小数）
  - `【难度】3` （难度等级，1-5整数）
- **当前代码**: 只支持整数
- **影响**: 小数难度值解析失败

### 问题3: 题组答案格式未支持
- **实际格式**: `【答案】3．B    4．A`
- **当前代码**: 只能提取整块文本
- **影响**: 无法分配答案到各题

### 问题4: 小题答案格式未支持
- **实际格式**: `【答案】(1)答案1\n(2)答案2`
- **当前代码**: 只能提取整块文本
- **影响**: 无法分配答案到各小题

### 问题5: 材料关键词不完整
- **缺少**: "完成下面小题"
- **影响**: 部分材料题识别失败

### 问题6: 三种模式未区分
- **当前代码**: 只粗略区分"单题"和"材料题"
- **实际需求**: 区分三种精确模式
- **影响**: 题组答案分配错误

---

## ✅ 解决方案

### 已创建文档：
1. **WORD_FORMAT_ANALYSIS.md** - 详细格式分析
2. **PARSING_UPDATES.md** - 完整代码更正方案

### 核心更新：

#### 1. ContentParser增强
```python
class ContentParser:
    # 支持【详解】
    ANALYSIS_PATTERN = re.compile(r"【(?:解析|详解)】\s*(.+?)")

    # 支持小数难度
    DIFFICULTY_PATTERN = re.compile(r"【难度】\s*([\d.]+)")

    # 题组答案解析
    def parse_grouped_answers(self, text) -> Dict[str, str]:
        # "3．B    4．A" → {"3": "B", "4": "A"}

    # 小题答案解析
    def parse_sub_answers(self, text) -> Dict[str, str]:
        # "(1)答案1\n(2)答案2" → {"(1)": "答案1", "(2)": "答案2"}

    # 难度标准化
    def normalize_difficulty(self, value: float) -> int:
        # 0.65 → 3, 0.85 → 1, 3 → 3
```

#### 2. 模式检测与处理
```python
def extract_attributes(self, text, mode="single"):
    """
    mode参数:
    - "single": 单题模式
    - "grouped": 题组模式
    - "sub": 小题模式
    """
    if mode == "grouped":
        return self.parse_grouped_answers(answer_text)
    elif mode == "sub":
        return self.parse_sub_answers(answer_text)
    else:
        return answer_text
```

#### 3. ParseService智能分发
```python
def _process_material_question(self, block):
    # 检查子题格式
    first_sub_number = block["sub_questions"][0]["number"]

    if first_sub_number.startswith("("):
        # 模式3: 材料+小题
        return self._process_sub_question_material(block)
    else:
        # 模式2: 题组形式
        return self._process_question_group(block)
```

---

## 📊 对比表

| 特征 | 模式1 单题 | 模式2 题组 | 模式3 材料+小题 |
|------|----------|-----------|---------------|
| 题号格式 | 1, 2, 3 | 3, 4（连续） | 7 + (1)(2) |
| 材料 | 无 | 有 | 有 |
| 答案格式 | `【答案】D` | `【答案】3．B 4．A` | `【答案】(1)A (2)B` |
| 数据结构 | 单个QuestionItem | 多个独立QuestionItem | 父QuestionItem+children |

---

## 🎯 实施优先级

### P0 高优先级（立即修复）
- [x] 支持【详解】识别
- [x] 难度值标准化（0.65 → 3）
- [x] 题组答案解析
- [x] 小题答案解析
- [x] 更新材料关键词

### P1 中优先级（本周完成）
- [ ] 实现三种模式检测
- [ ] 更新ParseService分发逻辑
- [ ] 编写单元测试
- [ ] 真实文档端到端测试

### P2 低优先级（优化）
- [ ] 错误恢复机制
- [ ] 解析日志增强
- [ ] 前端展示优化

---

## 📁 相关文件

### 后端核心文件
```
backend/
├── app/
│   ├── api/v1/paper.py               # API端点
│   ├── core/
│   │   ├── parser/
│   │   │   ├── docx_parser.py        # 文档加载
│   │   │   ├── structure_parser.py   # ⭐结构识别
│   │   │   ├── content_parser.py     # ⭐内容提取
│   │   │   ├── formula_parser.py     # 公式转换
│   │   │   ├── image_parser.py       # 图片提取
│   │   │   └── token_generator.py    # HTML生成
│   │   └── task_manager.py           # 任务管理
│   └── services/
│       └── parse_service.py          # ⭐解析编排
├── WORD_FORMAT_ANALYSIS.md           # 格式分析文档
└── PARSING_UPDATES.md                # 更新方案文档
```

### 前端核心文件
```
my-app/
└── src/
    ├── pages/
    │   └── PaperUpload/
    │       ├── index.tsx              # 上传页面
    │       └── Edit/
    │           ├── index.tsx          # 校对页面
    │           ├── QuestionCard.tsx   # 题目卡片
    │           └── AttributePanel.tsx # 编辑面板
    └── services/
        └── paperUpload.ts             # API调用
```

---

## 🧪 测试方法

### 1. 单元测试
```bash
cd backend
pytest tests/test_content_parser.py -v
```

### 2. 真实文档测试
```bash
# 上传测试文档
curl -X POST http://localhost:8000/api/paper/upload \
  -F "file=@/path/to/test.docx" \
  -F "metadata={...}"

# 查看解析结果
curl http://localhost:8000/api/paper/result/{taskId}
```

### 3. 前端集成测试
```bash
cd my-app
npm run dev

# 访问 http://localhost:8000/question-bank/word-upload
# 上传文档并验证解析结果
```

---

## 📞 后续支持

详细的技术文档已创建：
- `backend/WORD_FORMAT_ANALYSIS.md` - 格式分析
- `backend/PARSING_UPDATES.md` - 代码更新方案

如需实施代码更新，请参考 `PARSING_UPDATES.md` 中的详细代码。
