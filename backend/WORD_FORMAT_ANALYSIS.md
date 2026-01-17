# Word文档格式分析与解析规则更正

## 实际Word文档格式分析

基于 `2026年1月16日初中化学作业.docx` 的实际格式分析：

### 格式特征

#### 1. **单题模式** (最常见)
```
题号．题干内容
选项A内容
选项B内容
【答案】答案内容
【难度】数字
【知识点】知识点1、知识点2
【详解】/【解析】详细解析内容
```

**示例**：
```
1．（青海省西宁市2025-2026学年九年级上学期期末调研测试化学试卷）如图是碳元素...
A．物质在常温下化学性质相对稳定
B．冬天取暖时，通风不足可能会导致B过量
C．物质转化为物质的过程是一个吸热反应
D．当物质为碳酸或碳酸钙时，只能通过分解反应生成
【答案】D
【难度】0.65
【知识点】分解反应、碳单质的稳定性、一氧化碳的毒性及安全使用
【详解】A、 物质A中碳元素显0价...
```

#### 2. **题组形式** (材料+多题干共享答案)
```
材料描述文字。回答下列小题
题号1．第一个题干
选项内容...
题号2．第二个题干
选项内容...
【答案】题号1．答案1    题号2．答案2
【难度】数字
【知识点】知识点列表
【解析】题号1．解析1
题号2．解析2
```

**示例**：
```
（25-26九年级上·江苏扬州·月考）阅读下列材料，完成下面小题
电动汽车已经走进了我们的生活...

3．下列关于锂电池的说法正确的是
A．C3H4O3属于氧化物
B．C3H4O3中碳、氧元素的质量比为
C．电动车在行驶过程中锂电池将电能转化成化学能
D．生产锂电池时添加石墨烯是利用了石墨烯的导热性

4．如图是某氢氧燃料电池工作原理示意图...
A．氢氧燃料电池中发生的反应与电解水相同
B．氢氧燃料电池工作时氢原子和氧原子个数不变

【答案】3．B    4．A
【难度】0.65
【知识点】氧化物的定义、化学式、分子式及涵义
【解析】3．A、氧化物中含有两种元素...
4．A、氢氧燃料电池中发生的反应...
```

#### 3. **材料+小题模式** (材料+独立小题，每题独立答案)
```
材料描述。回答下列小题。
题号．主题干
(1)小题题干1
(2)小题题干2
【答案】(1)答案1
(2)答案2
【难度】数字
【知识点】知识点列表
【详解】（1）详细解释1
（2）详细解释2
```

**示例**：
```
（北京市石景山区多校2025-2026学年九年级上学期期末联考化学试卷）中华优秀典籍...

8．(1)"五金第八"记载了制黄铜工艺。以炉甘石(主要成分为ZnCO3)与铜炼成黄铜，ZnCO3中含有的金属元素是    。
(2)"丹青第十四"记载了制墨方法："凡墨烧烟凝质而为之"...
(3)"珠玉第十八"记载了制琉璃工艺...

【答案】(1)锌/Zn
(2)化学反应前后元素种类不变（或质量守恒定律）
(3)氧化物（或非金属氧化物）
【难度】0.85
【知识点】用质量守恒定律确定物质组成、元素周期表及元素分类
【详解】（1）元素分为金属元素和非金属元素...
（2）根据质量守恒定律...
（3）氧化物是由两种元素组成...
```

---

## 关键识别规则

### 1. 题号识别
- **主题号**：`^\d+[．.]` （阿拉伯数字+全角或半角句点）
- **小题号**：`^\(\d+\)` （括号数字）
- **题组内题号**：`\d+[．.]` （在材料后出现的数字题号）

### 2. 材料题识别关键词
```python
MATERIAL_KEYWORDS = [
    "阅读下列材料，完成下面小题",
    "阅读下列材料，回答下列问题",
    "阅读下列材料，回答问题",
    "回答下列小题",
    "完成下列题目",
    "完成下面小题"
]
```

### 3. 属性块识别
```python
# 答案块（支持多种格式）
【答案】D
【答案】3．B    4．A          # 题组格式
【答案】(1)答案1\n(2)答案2    # 小题格式

# 难度（0-1的小数或1-5的整数）
【难度】0.65
【难度】3

# 知识点（顿号或逗号分隔）
【知识点】分解反应、碳单质的稳定性、一氧化碳的毒性
【知识点】氧化物的定义,化学式

# 解析/详解
【详解】...
【解析】...
【解析】3．...  # 题组格式，带题号前缀
【详解】（1）... # 小题格式，带小题号前缀
```

### 4. 题型段落识别
```python
TYPE_PATTERN = r"^([一二三四五六七八九十]+)、\s*(.+)$"
# 一、单选题
# 二、填空题
# 三、简答题
# 四、实验题
```

---

## 三种模式的判定逻辑

### 判定流程图
```
检测到题号N
  ↓
检查前面是否有材料关键词？
  ↓
  是 → 材料题模式
       ↓
       检查后续段落
       ↓
       发现 (1)(2) → 模式3：材料+小题
       发现 N+1．   → 模式2：题组形式
  ↓
  否 → 模式1：单题模式
```

### 模式1：单题模式
**特征**：
- 题号后直接是题干
- 紧跟选项（如果是选择题）
- 紧跟属性块：【答案】【难度】【知识点】【详解】

**数据结构**：
```python
{
    "number": "1",
    "type": "选择题",
    "paragraphs": [题干段落, 选项段落...],
    "is_material": False,
    "sub_questions": []
}
```

### 模式2：题组形式
**特征**：
- 材料描述 + "完成下面小题"
- 多个连续题号（3, 4, 5...）
- **共享一组属性块**：【答案】3．B 4．A
- 解析中带题号前缀

**数据结构**：
```python
{
    "number": "3-4",  # 题组编号
    "type": "选择题",
    "paragraphs": [材料段落],
    "is_material": True,
    "is_question_group": True,  # 新增标识
    "sub_questions": [
        {
            "number": "3",
            "paragraphs": [题3的段落],
            "answer_index": 0
        },
        {
            "number": "4",
            "paragraphs": [题4的段落],
            "answer_index": 1
        }
    ]
}
```

### 模式3：材料+小题模式
**特征**：
- 材料描述 + "回答下列小题"
- 主题号 + (1)(2)(3) 小题号
- 每个小题在答案中有对应：【答案】(1)... (2)...
- 解析中带小题号前缀：【详解】（1）...（2）...

**数据结构**：
```python
{
    "number": "7",
    "type": "填空题",
    "paragraphs": [主题干段落],
    "is_material": True,
    "is_sub_question_mode": True,  # 新增标识
    "sub_questions": [
        {
            "number": "(1)",
            "paragraphs": [小题1段落],
            "answer_index": 0
        },
        {
            "number": "(2)",
            "paragraphs": [小题2段落],
            "answer_index": 1
        }
    ]
}
```

---

## 关键问题与解决方案

### 问题1：如何区分模式2和模式3？

**解决方案**：检查材料后的第一个题目结构
```python
if has_material_keyword(para):
    # 向后扫描找第一个题目
    next_question = find_next_question()

    if next_question.startswith("(1)"):
        # 模式3：小题模式
        mode = "sub_question_mode"
    elif is_number_pattern(next_question):
        # 模式2：题组模式
        mode = "question_group"
```

### 问题2：如何解析多答案和多解析？

**当前实现**：
```python
# content_parser.py
ANSWER_PATTERN = re.compile(r"【答案】\s*(.+?)(?=【|$)", re.DOTALL)
all_answers = ANSWER_PATTERN.findall(text)  # 只能匹配一个答案块
```

**需要更正为**：
```python
# 新的答案解析逻辑
def parse_grouped_answers(answer_text):
    """
    解析题组答案：3．B    4．A
    """
    pattern = r"(\d+)[．.]\s*([A-Z\u4e00-\u9fa5]+)"
    matches = re.findall(pattern, answer_text)
    return {num: ans for num, ans in matches}

def parse_sub_answers(answer_text):
    """
    解析小题答案：(1)答案1 (2)答案2
    """
    pattern = r"\((\d+)\)\s*([^\(]+?)(?=\(\d+\)|$)"
    matches = re.findall(pattern, answer_text, re.DOTALL)
    return {f"({num})": ans.strip() for num, ans in matches}
```

### 问题3：难度值格式不一致

**观察**：
- `【难度】0.65` （小数，表示难度系数）
- `【难度】3` （整数1-5，表示难度等级）

**解决方案**：
```python
def normalize_difficulty(value):
    """统一难度值为1-5整数"""
    if value <= 1:  # 如果是小数难度系数
        # 0.85+ → 1星（简单）
        # 0.65-0.85 → 2-3星（中等）
        # <0.65 → 4-5星（困难）
        if value >= 0.85:
            return 1
        elif value >= 0.75:
            return 2
        elif value >= 0.65:
            return 3
        elif value >= 0.50:
            return 4
        else:
            return 5
    else:
        return int(value)  # 已经是1-5整数
```

---

## 更正后的解析流程

### 新增：QuestionGroup类
```python
class QuestionGroup:
    """题组容器（模式2专用）"""
    def __init__(self, material_number: str):
        self.material_number = material_number
        self.material_paragraphs = []
        self.questions = []  # 题组内的题目列表
        self.shared_attributes = {}  # 共享的答案/解析
```

### 更新：StructureParser.parse()
```python
def parse(self):
    # ... 现有逻辑

    # 检测材料题关键词
    if any(keyword in text for keyword in MATERIAL_KEYWORDS):
        material_mode_detected = True
        material_paragraphs = []
        continue

    # 检测题号
    if question_match:
        if material_mode_detected:
            # 判断是题组还是小题
            next_para_text = paragraphs[i+1].text if i+1 < len(paragraphs) else ""

            if SUB_QUESTION_PATTERN.match(next_para_text):
                # 模式3：材料+小题
                mode = "sub_question_mode"
                # 主题干 + (1)(2)(3)
            else:
                # 模式2：题组形式
                mode = "question_group"
                # 开始收集题组内的题目
```

### 更新：ContentParser.extract_attributes()
```python
def extract_attributes(self, text: str, mode: str = "single") -> Dict:
    """
    mode: "single" | "question_group" | "sub_question"
    """
    if mode == "question_group":
        # 解析：【答案】3．B    4．A
        return parse_grouped_answers(text)
    elif mode == "sub_question":
        # 解析：【答案】(1)答案1 (2)答案2
        return parse_sub_answers(text)
    else:
        # 单题模式：【答案】D
        return parse_single_answer(text)
```

---

## 测试用例

### 测试用例1：单题模式
```
输入：题号1 + 题干 + 【答案】D + 【难度】0.65
输出：
{
    "id": "1",
    "number": "1",
    "type": "选择题",
    "stem": "<p>题干HTML</p>",
    "answer": "<p>D</p>",
    "difficulty": 3
}
```

### 测试用例2：题组模式
```
输入：材料 + 题3 + 题4 + 【答案】3．B 4．A
输出：
{
    "id": "3",
    "number": "3",
    "type": "选择题",
    "stem": "<p>材料HTML + 题3题干</p>",
    "answer": "<p>B</p>",
    "parentId": "material-3-4",
    "children": []
}
{
    "id": "4",
    "number": "4",
    ...
    "answer": "<p>A</p>",
    "parentId": "material-3-4"
}
```

### 测试用例3：材料+小题模式
```
输入：主题干 + (1) + (2) + 【答案】(1)答案1 (2)答案2
输出：
{
    "id": "7",
    "number": "7",
    "type": "填空题",
    "stem": "<p>主题干HTML</p>",
    "answer": "",
    "children": [
        {
            "id": "7-1",
            "number": "(1)",
            "stem": "<p>小题1</p>",
            "answer": "<p>答案1</p>",
            "parentId": "7"
        },
        {
            "id": "7-2",
            "number": "(2)",
            ...
        }
    ]
}
```

---

## 实施优先级

### 高优先级 (P0)
1. ✅ 修复属性块识别：支持【详解】
2. ✅ 修复难度值转换
3. ✅ 修复题组答案解析：`3．B    4．A`
4. ✅ 修复小题答案解析：`(1)答案1\n(2)答案2`

### 中优先级 (P1)
5. 区分题组模式和小题模式
6. 实现题组数据结构
7. 实现答案分配逻辑（answer_index）

### 低优先级 (P2)
8. 优化材料题识别准确率
9. 处理复杂嵌套结构
10. 增强错误恢复能力
