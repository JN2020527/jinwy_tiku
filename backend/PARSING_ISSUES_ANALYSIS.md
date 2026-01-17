# 解析规则分析报告

## 文档信息
- 文件：2026年1月16日初中化学作业.docx
- 总段落数：294
- 题型部分：4个（单选题、填空题、简答题、实验题）

## 当前解析规则的问题

### 问题1：题组识别失败（第3-6题）

**现象**：
- 第3-6题应该被识别为1个材料题，包含4个子题
- 实际被识别为4个独立的普通题目
- 丢失了材料内容（段落数31-32）

**文档结构**：
```
段落数30: 故选D。（第2题结论）
段落数31: （25-26九年级上·江苏扬州·月考）阅读下列材料，完成下面小题  ← 材料题标志
段落数32: 电动汽车已经走进了我们的生活...  ← 材料内容
段落数33: 3．下列关于锂电池的说法正确的是  ← 第3题
段落数34-37: 第3题选项
段落数38: 4．如图是某氢氧燃料电池工作原理...  ← 第4题
段落数40-43: 第4题选项
段落数45: 【答案】3．B    4．A  ← 两个答案
```

**根本原因**：
1. 没有识别"阅读下列材料，完成下面小题"为材料题标志
2. 材料段落数31-32没有被包含在任何题目中
3. 识别逻辑只依赖 `(1)`、`(2)` 这种子题编号

**应该是**：
- 1个材料题（题目3）
  - 材料内容：段落数31-32
  - 子题1（3）：段落数33-45
  - 子题2（4）：段落数38-49

---

### 问题2：答案段落拆分错误

**现象**：
- 段落数45：`【答案】3．B    4．A`  ← 两个答案在同一行
- 这导致答案识别时可能混乱

**正确应该是**：
- 第3题的答案在段落数33-45中
- 第4题的答案在段落数38-49中

**当前代码问题**：
- `ContentParser` 只提取第一个匹配的【答案】
- 但需要能够处理同一段落中多个【答案】的情况

**已有的修复**：
- 已修改 `ContentParser` 提取所有答案到 `all_answers`
- 已修改 `ParseService` 根据索引使用答案

---

### 问题3：第5-6题识别错误

**现象**：
- 被识别为2个独立的普通题目
- 但应该是一个材料题（有共同的材料）

**文档结构**：
```
段落数58: （25-26九年级上·北京东城·期末）钠原子的结构示意图为...回答下列小题。  ← 材料
段落数59-61: 第5题
段落数62-64: 第6题
段落数66: 【答案】5．C    6．C  ← 两个答案
```

**应该是**：
- 1个材料题（题目5）
  - 材料内容：段落数58
  - 子题1（5）：段落数59-66
  - 子题2（6）：段落数62-66（与子题1重叠？）

---

### 问题4：填空题识别失败（第7题）

**现象**：
- 第7题被识别为1个独立题目
- 实际应该是一个材料题，有3个子题（7-1, 7-2, 7-3）

**文档结构**：
```
段落数81: 7．（25-26九年级上·河南信阳·月考）化学源于生活...  ← 主题干
段落数82: (1)工人师傅在切割钢板时...  ← 子题1
段落数83: (2)冬天人们爱吃火锅...  ← 子题2
段落数84-90: 答案、难度、知识点、解析（包含子题1和2）
段落数91-99: 子题3和其答案
```

**问题**：
1. `(1)`、`(2)`、`(3)` 格式被识别为子题，但父题（第7题）丢失
2. 子题段落数没有被正确分组

---

## 改进方案

### 方案1：增强材料题识别

修改 `StructureParser` 的 `parse()` 方法：

```python
# 材料题标志
MATERIAL_KEYWORDS = [
    r'阅读下列材料，完成下面小题',
    r'阅读下列材料，回答下列问题',
    r'回答下列小题',
    r'完成下列题目',
]

def parse(self):
    # ... 现有逻辑 ...

    for i, para in enumerate(self.paragraphs):
        text = para.text.strip()

        # 检查是否为材料题标志
        if not current_question:
            for keyword in MATERIAL_KEYWORDS:
                if keyword in text:
                    # 创建材料题
                    current_question = QuestionBlock('material', i)
                    current_question.is_material_question = True
                    # 下一个段落是材料内容
                    current_question.material_content = []
                    continue

        # 如果在材料题中，收集材料内容
        if current_question and current_question.is_material_question and not current_question.has_questions:
            if not any(kw in text for kw in MATERIAL_KEYWORDS):
                current_question.material_content.append(para)
                continue

        # 题号识别（保持现有逻辑）
        question_match = self.QUESTION_NUMBER_PATTERN.match(text)
        if question_match:
            # ...
```

---

### 方案2：改进答案分配

已经修改了 `ContentParser` 和 `ParseService`：

**ContentParser**：
- 提取所有答案：`all_answers`
- 提取所有解析：`all_analyses`

**ParseService**：
- 材料题的子题使用索引：`answer_index=0` for 子题1，`answer_index=1` for 子题2

---

### 方案3：处理填空题的多小题

对于填空题等题型，需要识别主题干和多个小题：

```python
def parse(self):
    # ...

    # 填空题特殊处理
    if current_section and '填空' in current_section.type_name:
        # 识别主题干（7．开头）
        # 识别 (1) (2) (3) 等小题
        sub_questions = []
        current_sub_question = None

        for i, para in enumerate(self.paragraphs[section_start:]):
            text = para.text.strip()

            # 主题干
            question_match = self.QUESTION_NUMBER_PATTERN.match(text)
            if question_match:
                current_question = QuestionBlock(question_match.group(1), i)
                current_question.is_fill_in_parent = True  # 标记为填空题父题
                section.questions.append(current_question)

            # 小题编号
            sub_match = self.SUB_QUESTION_PATTERN.match(text)
            if sub_match:
                sub_number = sub_match.group(1)
                # 创建小题
                current_sub_question = QuestionBlock(f"(1)", i)
                # 收集该小题的段落
                sub_questions.append(current_sub_question)
```

---

### 方案4：段落归属逻辑改进

需要更智能的段落分配：

1. **材料题**：
   - 材料标志段落 → 标记
   - 后续段落直到下一个材料题标志或题型转换
   - 遇到题号（3. 4.）时，识别为子题
   - 收集该子题的所有段落（题干、选项、答案、解析）

2. **答案段落**：
   - 同一行有多个答案时，按题号分配
   - `【答案】3．B    4．A` → 分配给子题3和子题4

3. **解析段落**：
   - 可能跨越多个段落
   - 需要识别每个子题的解析结束位置

---

## 优先级建议

### 高优先级
1. **修复材料题识别**（问题1）
   - 添加材料题标志识别
   - 正确分组第3-6题

2. **验证答案分配逻辑**（问题2）
   - 已修改，需要测试

### 中优先级
3. **改进填空题识别**（问题4）
   - 识别主题干和多个小题
   - 正确分组第7-8题

### 低优先级
4. **完善段落归属逻辑**（问题3）
   - 更智能的段落分配
   - 处理重叠和边界情况

---

## 测试建议

修改后，用以下测试案例验证：

1. **第3-6题**：
   - 应该识别为1个材料题
   - 包含材料内容和2个子题（3、4）
   - 答案正确分配

2. **第7题**：
   - 应该识别为1个材料题
   - 主题干 + 3个小题
   - 每个小题有独立的答案

3. **第1-2题**：
   - 普通单选题
   - 验证答案和解析正确

4. **第8题**：
   - 填空题材料题
   - 多个小题和答案
