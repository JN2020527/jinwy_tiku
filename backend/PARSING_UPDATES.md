# Word解析规则更新 - 代码更正方案

基于实际Word文档 `2026年1月16日初中化学作业.docx` 的格式分析，需要更正以下解析规则。

## 更新概述

### 问题列表
1. ❌ 【详解】属性块未被识别（只识别了【解析】）
2. ❌ 难度值格式不统一（0.65小数 vs 3整数）
3. ❌ 题组答案格式未支持：`3．B    4．A`
4. ❌ 小题答案格式未支持：`(1)答案1\n(2)答案2`
5. ❌ 材料题关键词不完整
6. ❌ 三种模式未区分（单题/题组/材料+小题）

---

## 代码更正

### 1. 更新 `content_parser.py`

#### 文件路径
`backend/app/core/parser/content_parser.py`

#### 修改内容

```python
import re
from typing import List, Dict, Optional, Tuple
from docx.text.paragraph import Paragraph


class ContentParser:
    """Parser for extracting question content and attributes"""

    # Attribute block patterns - 更新：支持【详解】
    ANSWER_PATTERN = re.compile(r"【答案】\s*(.+?)(?=【|$)", re.DOTALL)
    DIFFICULTY_PATTERN = re.compile(r"【难度】\s*([\d.]+)", re.DOTALL)  # 支持小数
    KNOWLEDGE_PATTERN = re.compile(r"【知识点】\s*(.+?)(?=【|$)", re.DOTALL)
    # 新增：支持【详解】和【解析】
    ANALYSIS_PATTERN = re.compile(r"【(?:解析|详解)】\s*(.+?)(?=【|$)", re.DOTALL)

    # Option patterns for multiple choice questions
    OPTION_PATTERN = re.compile(r"^([A-D])[.．、]\s*(.+)$")

    # 题组答案格式：3．B    4．A
    GROUPED_ANSWER_PATTERN = re.compile(r"(\d+)[．.]\s*([A-Z\u4e00-\u9fa5]+)")

    # 小题答案格式：(1)答案内容
    SUB_ANSWER_PATTERN = re.compile(r"\((\d+)\)\s*([^\(]+?)(?=\(\d+\)|$)", re.DOTALL)

    def __init__(self):
        """Initialize content parser"""
        pass

    def normalize_difficulty(self, value: float) -> Optional[int]:
        """
        统一难度值为1-5整数

        Args:
            value: 原始难度值（可能是0-1小数或1-5整数）

        Returns:
            1-5的整数难度等级
        """
        if value is None:
            return None

        # 如果是小数难度系数（0-1范围）
        if value <= 1.0:
            if value >= 0.85:
                return 1  # 简单
            elif value >= 0.75:
                return 2
            elif value >= 0.65:
                return 3  # 中等
            elif value >= 0.50:
                return 4
            else:
                return 5  # 困难
        else:
            # 已经是1-5整数
            return int(min(max(value, 1), 5))

    def parse_grouped_answers(self, answer_text: str) -> Dict[str, str]:
        """
        解析题组答案格式：3．B    4．A

        Args:
            answer_text: 答案文本

        Returns:
            字典 {"3": "B", "4": "A"}
        """
        matches = self.GROUPED_ANSWER_PATTERN.findall(answer_text)
        return {num: ans.strip() for num, ans in matches}

    def parse_sub_answers(self, answer_text: str) -> Dict[str, str]:
        """
        解析小题答案格式：(1)答案1\n(2)答案2

        Args:
            answer_text: 答案文本

        Returns:
            字典 {"(1)": "答案1", "(2)": "答案2"}
        """
        matches = self.SUB_ANSWER_PATTERN.findall(answer_text)
        return {f"({num})": ans.strip() for num, ans in matches}

    def detect_answer_mode(self, answer_text: str) -> str:
        """
        检测答案格式类型

        Returns:
            "single" | "grouped" | "sub"
        """
        if not answer_text:
            return "single"

        # 检测题组格式：3．B
        if self.GROUPED_ANSWER_PATTERN.search(answer_text):
            return "grouped"

        # 检测小题格式：(1)
        if self.SUB_ANSWER_PATTERN.search(answer_text):
            return "sub"

        return "single"

    def parse_grouped_analyses(self, analysis_text: str) -> Dict[str, str]:
        """
        解析题组解析格式：3．解析内容A\n4．解析内容B

        Args:
            analysis_text: 解析文本

        Returns:
            字典 {"3": "解析A", "4": "解析B"}
        """
        pattern = r"(\d+)[．.]\s*([^0-9\uff10-\uff19]+?)(?=\d+[．.]|$)"
        matches = re.findall(pattern, analysis_text, re.DOTALL)
        return {num: analysis.strip() for num, analysis in matches}

    def parse_sub_analyses(self, analysis_text: str) -> Dict[str, str]:
        """
        解析小题解析格式：（1）解析1\n（2）解析2

        Args:
            analysis_text: 解析文本

        Returns:
            字典 {"(1)": "解析1", "(2)": "解析2"}
        """
        # 支持全角和半角括号
        pattern = r"[（\(](\d+)[）\)]\s*([^（\(]+?)(?=[（\(]\d+[）\)]|$)"
        matches = re.findall(pattern, analysis_text, re.DOTALL)
        return {f"({num})": analysis.strip() for num, analysis in matches}

    def extract_attributes(self, text: str, mode: str = "single") -> Dict[str, any]:
        """
        Extract attributes from text (answer, difficulty, knowledge points, analysis)

        Args:
            text: Combined text from paragraphs
            mode: "single" | "grouped" | "sub"

        Returns:
            Dictionary with extracted attributes
        """
        attributes = {
            "answer": None,
            "difficulty": None,
            "knowledge_points": [],
            "analysis": None,
            "all_answers": [],
            "all_analyses": [],
            "grouped_answers": {},  # 题组答案字典
            "grouped_analyses": {}, # 题组解析字典
            "sub_answers": {},      # 小题答案字典
            "sub_analyses": {},     # 小题解析字典
        }

        # Extract answer block
        answer_match = self.ANSWER_PATTERN.search(text)
        if answer_match:
            answer_text = answer_match.group(1).strip()

            # 自动检测答案模式（如果未指定）
            if mode == "single":
                detected_mode = self.detect_answer_mode(answer_text)
                mode = detected_mode

            if mode == "grouped":
                attributes["grouped_answers"] = self.parse_grouped_answers(answer_text)
                # 第一个答案作为默认答案
                if attributes["grouped_answers"]:
                    first_key = list(attributes["grouped_answers"].keys())[0]
                    attributes["answer"] = attributes["grouped_answers"][first_key]
            elif mode == "sub":
                attributes["sub_answers"] = self.parse_sub_answers(answer_text)
                # 第一个答案作为默认答案
                if attributes["sub_answers"]:
                    first_key = list(attributes["sub_answers"].keys())[0]
                    attributes["answer"] = attributes["sub_answers"][first_key]
            else:
                attributes["answer"] = answer_text

        # Extract difficulty
        difficulty_match = self.DIFFICULTY_PATTERN.search(text)
        if difficulty_match:
            raw_difficulty = float(difficulty_match.group(1))
            attributes["difficulty"] = self.normalize_difficulty(raw_difficulty)

        # Extract knowledge points
        knowledge_match = self.KNOWLEDGE_PATTERN.search(text)
        if knowledge_match:
            knowledge_text = knowledge_match.group(1).strip()
            points = re.split(r"[,，;；、]", knowledge_text)
            attributes["knowledge_points"] = [p.strip() for p in points if p.strip()]

        # Extract analysis block
        analysis_match = self.ANALYSIS_PATTERN.search(text)
        if analysis_match:
            analysis_text = analysis_match.group(1).strip()

            if mode == "grouped":
                attributes["grouped_analyses"] = self.parse_grouped_analyses(analysis_text)
                # 第一个解析作为默认解析
                if attributes["grouped_analyses"]:
                    first_key = list(attributes["grouped_analyses"].keys())[0]
                    attributes["analysis"] = attributes["grouped_analyses"][first_key]
            elif mode == "sub":
                attributes["sub_analyses"] = self.parse_sub_analyses(analysis_text)
                # 第一个解析作为默认解析
                if attributes["sub_analyses"]:
                    first_key = list(attributes["sub_analyses"].keys())[0]
                    attributes["analysis"] = attributes["sub_analyses"][first_key]
            else:
                attributes["analysis"] = analysis_text

        return attributes

    def remove_attributes(self, text: str) -> str:
        """
        Remove attribute blocks from text to get clean question content

        Args:
            text: Text with attribute blocks

        Returns:
            Clean text without attribute blocks
        """
        # Remove all attribute blocks (支持【详解】)
        text = re.sub(r"【答案】.+?(?=【|$)", "", text, flags=re.DOTALL)
        text = re.sub(r"【难度】.+?(?=【|$)", "", text, flags=re.DOTALL)
        text = re.sub(r"【知识点】.+?(?=【|$)", "", text, flags=re.DOTALL)
        text = re.sub(r"【(?:解析|详解)】.+?(?=【|$)", "", text, flags=re.DOTALL)

        return text.strip()

    def extract_options(self, text: str) -> Tuple[str, Optional[List[str]]]:
        """
        Extract options from multiple choice question text

        Args:
            text: Question text

        Returns:
            Tuple of (stem_text, options_list)
        """
        lines = text.split("\n")
        stem_lines = []
        options = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            option_match = self.OPTION_PATTERN.match(line)
            if option_match:
                option_letter, option_text = option_match.groups()
                options.append(f"{option_letter}. {option_text.strip()}")
            else:
                if not options:  # Still in stem
                    stem_lines.append(line)

        stem = "\n".join(stem_lines).strip()
        return stem, options if options else None

    def parse_question_content(
        self, paragraphs: List[Paragraph], question_type: str, mode: str = "single"
    ) -> Dict[str, any]:
        """
        Parse question content from paragraphs

        Args:
            paragraphs: List of paragraphs for this question
            question_type: Type of question (选择题, 填空题, etc.)
            mode: "single" | "grouped" | "sub"

        Returns:
            Dictionary with parsed content
        """
        # Combine all paragraph text
        full_text = "\n".join([p.text for p in paragraphs])

        # Extract attributes
        attributes = self.extract_attributes(full_text, mode)

        # Remove attributes to get clean content
        clean_text = self.remove_attributes(full_text)

        # Extract stem and options
        if "选择" in question_type:
            stem, options = self.extract_options(clean_text)
        else:
            stem = clean_text
            options = None

        return {
            "stem": stem,
            "options": options,
            "answer": attributes["answer"],
            "difficulty": attributes["difficulty"],
            "knowledge_points": attributes["knowledge_points"],
            "analysis": attributes["analysis"],
            "grouped_answers": attributes.get("grouped_answers", {}),
            "grouped_analyses": attributes.get("grouped_analyses", {}),
            "sub_answers": attributes.get("sub_answers", {}),
            "sub_analyses": attributes.get("sub_analyses", {}),
            "paragraphs": paragraphs,  # Keep original paragraphs for token generation
        }
```

---

### 2. 更新 `structure_parser.py`

#### 文件路径
`backend/app/core/parser/structure_parser.py`

#### 修改内容（在第45行附近添加）

```python
    MATERIAL_KEYWORDS = [
        r"阅读下列材料，完成下面小题",
        r"阅读下列材料，回答下列问题",
        r"阅读下列材料，回答问题",
        r"回答下列小题",
        r"完成下列题目",
        r"完成下面小题",  # 新增
    ]
```

---

### 3. 更新 `parse_service.py`

#### 文件路径
`backend/app/services/parse_service.py`

#### 修改内容

在 `_process_material_question` 方法中，需要判断是题组还是小题模式：

```python
def _process_material_question(self, block: Dict) -> QuestionItem:
    """
    Process a material question with sub-questions

    判断是题组形式还是材料+小题形式
    """
    # 检查子题的题号格式
    if block["sub_questions"]:
        first_sub = block["sub_questions"][0]
        first_number = first_sub["number"]

        # 如果子题号是 (1)(2) 格式 → 材料+小题模式
        if first_number.startswith("("):
            return self._process_sub_question_material(block)
        else:
            # 如果子题号是 3, 4 格式 → 题组形式
            return self._process_question_group(block)

    # 默认处理
    return self._process_question_group(block)

def _process_sub_question_material(self, block: Dict) -> QuestionItem:
    """
    处理材料+小题模式：主题 + (1)(2)(3)

    答案格式：【答案】(1)答案1 (2)答案2
    解析格式：【详解】（1）解析1 （2）解析2
    """
    # 解析父题内容（获取小题答案和解析）
    parent_content = self.content_parser.parse_question_content(
        block["paragraphs"], block["type"], mode="sub"
    )

    # 处理子题
    children = []
    for idx, sub_block in enumerate(block["sub_questions"]):
        sub_number = sub_block["number"]  # "(1)", "(2)"

        # 从父题的sub_answers中获取对应答案
        sub_answer = parent_content["sub_answers"].get(sub_number, "")
        sub_analysis = parent_content["sub_analyses"].get(sub_number, "")

        # 解析子题内容
        sub_content = self.content_parser.parse_question_content(
            sub_block["paragraphs"], block["type"], mode="single"
        )

        # 生成子题HTML
        sub_tokens = self.token_generator.generate_tokens(sub_block["paragraphs"])
        sub_stem_html = self.token_generator.tokens_to_html(sub_tokens)

        sub_question = QuestionItem(
            id=f"{block['number']}-{sub_number}",
            number=sub_number,
            type=block["type"],
            stem=sub_stem_html,
            answer=sub_answer,
            analysis=sub_analysis,
            knowledgePoints=parent_content["knowledge_points"],
            difficulty=parent_content["difficulty"],
            parentId=block["number"],
        )
        children.append(sub_question)

    # 生成父题HTML（主题干）
    parent_tokens = self.token_generator.generate_tokens(block["paragraphs"])
    parent_html = self.token_generator.tokens_to_html(parent_tokens)

    parent_question = QuestionItem(
        id=block["number"],
        number=block["number"],
        type=block["type"],
        stem=parent_html,
        answer="",  # 父题无独立答案
        children=children,
    )

    return parent_question

def _process_question_group(self, block: Dict) -> List[QuestionItem]:
    """
    处理题组形式：材料 + 题3 + 题4

    答案格式：【答案】3．B    4．A
    解析格式：【解析】3．...  4．...

    Returns:
        题目列表（每个题目独立返回）
    """
    # 解析材料部分（获取题组共享的答案和解析）
    material_content = self.content_parser.parse_question_content(
        block["paragraphs"], block["type"], mode="grouped"
    )

    questions = []
    for sub_block in block["sub_questions"]:
        sub_number = sub_block["number"]  # "3", "4"

        # 从材料的grouped_answers中获取对应答案
        sub_answer = material_content["grouped_answers"].get(sub_number, "")
        sub_analysis = material_content["grouped_analyses"].get(sub_number, "")

        # 解析子题内容
        sub_content = self.content_parser.parse_question_content(
            sub_block["paragraphs"], block["type"], mode="single"
        )

        # 生成题干HTML：材料 + 子题题干
        combined_paragraphs = block["paragraphs"] + sub_block["paragraphs"]
        sub_tokens = self.token_generator.generate_tokens(combined_paragraphs)
        sub_stem_html = self.token_generator.tokens_to_html(sub_tokens)

        question = QuestionItem(
            id=sub_number,
            number=sub_number,
            type=block["type"],
            stem=sub_stem_html,
            options=sub_content["options"],
            answer=sub_answer,
            analysis=sub_analysis,
            knowledgePoints=material_content["knowledge_points"],
            difficulty=material_content["difficulty"],
        )
        questions.append(question)

    return questions
```

---

## 测试计划

### 测试用例1：单题模式
```python
# 输入段落
paragraphs = [
    "1．题干内容",
    "A．选项A",
    "【答案】D",
    "【难度】0.65",
    "【知识点】知识点A、知识点B",
    "【详解】详细解释内容"
]

# 预期输出
{
    "answer": "D",
    "difficulty": 3,  # 0.65 → 3
    "knowledge_points": ["知识点A", "知识点B"],
    "analysis": "详细解释内容"
}
```

### 测试用例2：题组形式
```python
# 输入
material_text = """
阅读下列材料，完成下面小题
材料内容...
3．题3题干
A．选项
4．题4题干
【答案】3．B    4．A
【难度】0.65
【解析】3．解析3
4．解析4
"""

# 预期输出（两个独立QuestionItem）
[
    {
        "id": "3",
        "number": "3",
        "answer": "B",
        "analysis": "解析3"
    },
    {
        "id": "4",
        "number": "4",
        "answer": "A",
        "analysis": "解析4"
    }
]
```

### 测试用例3：材料+小题
```python
# 输入
text = """
7．主题干
(1)小题1
(2)小题2
【答案】(1)答案1
(2)答案2
【难度】0.85
【详解】（1）解释1
（2）解释2
"""

# 预期输出
{
    "id": "7",
    "children": [
        {
            "id": "7-(1)",
            "number": "(1)",
            "answer": "答案1",
            "analysis": "解释1",
            "parentId": "7"
        },
        {
            "id": "7-(2)",
            "number": "(2)",
            "answer": "答案2",
            "analysis": "解释2",
            "parentId": "7"
        }
    ]
}
```

---

## 实施步骤

1. ✅ 创建分析文档（已完成）
2. ⏳ 更新 `content_parser.py`（待实施）
3. ⏳ 更新 `structure_parser.py`（待实施）
4. ⏳ 更新 `parse_service.py`（待实施）
5. ⏳ 编写单元测试
6. ⏳ 使用真实Word文档测试
7. ⏳ 修复发现的Bug
8. ⏳ 更新API文档

## 兼容性说明

所有更改向后兼容，默认mode为"single"，保持原有行为不变。
