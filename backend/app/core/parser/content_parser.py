import re
from typing import List, Dict, Optional, Tuple
from docx.text.paragraph import Paragraph


class ContentParser:
    """Parser for extracting question content and attributes"""

    # Attribute block patterns
    ANSWER_PATTERN = re.compile(r"【答案】\s*(.+?)(?=【|$)", re.DOTALL)
    DIFFICULTY_PATTERN = re.compile(r"【难度】\s*([\d.]+)", re.DOTALL)  # Support decimals
    KNOWLEDGE_PATTERN = re.compile(r"【知识点】\s*(.+?)(?=【|$)", re.DOTALL)
    ANALYSIS_PATTERN = re.compile(r"【(?:解析|详解)】\s*(.+?)(?=【|$)", re.DOTALL)  # Support both 解析 and 详解

    # Option patterns for multiple choice questions
    OPTION_PATTERN = re.compile(r"^([A-D])[.．、]\s*(.+)$")

    # Grouped answer pattern: 3．B    4．A
    GROUPED_ANSWER_PATTERN = re.compile(r"(\d+)[．.]\s*([A-Z\u4e00-\u9fa5]+)")

    # Sub-question answer pattern: (1)答案内容
    SUB_ANSWER_PATTERN = re.compile(r"\((\d+)\)\s*([^\(]+?)(?=\(\d+\)|$)", re.DOTALL)

    def __init__(self):
        """Initialize content parser"""
        pass

    def normalize_difficulty(self, value: float) -> Optional[int]:
        """
        Normalize difficulty value to 1-5 integer scale

        Args:
            value: Raw difficulty value (0-1 decimal or 1-5 integer)

        Returns:
            1-5 integer difficulty level, or None if invalid
        """
        if value is None:
            return None

        try:
            value = float(value)
        except (ValueError, TypeError):
            return None

        # If decimal difficulty coefficient (0-1 range)
        if value <= 1.0:
            if value >= 0.85:
                return 1  # Easy
            elif value >= 0.75:
                return 2
            elif value >= 0.65:
                return 3  # Medium
            elif value >= 0.50:
                return 4
            else:
                return 5  # Hard
        else:
            # Already 1-5 integer
            return int(min(max(value, 1), 5))

    def parse_grouped_answers(self, answer_text: str) -> Dict[str, str]:
        """
        Parse grouped answer format: 3．B    4．A

        Args:
            answer_text: Answer text block

        Returns:
            Dictionary like {"3": "B", "4": "A"}
        """
        matches = self.GROUPED_ANSWER_PATTERN.findall(answer_text)
        return {num: ans.strip() for num, ans in matches}

    def parse_sub_answers(self, answer_text: str) -> Dict[str, str]:
        """
        Parse sub-question answer format: (1)答案1\n(2)答案2

        Args:
            answer_text: Answer text block

        Returns:
            Dictionary like {"(1)": "答案1", "(2)": "答案2"}
        """
        matches = self.SUB_ANSWER_PATTERN.findall(answer_text)
        return {f"({num})": ans.strip() for num, ans in matches}

    def detect_answer_mode(self, answer_text: str) -> str:
        """
        Detect answer format type

        Args:
            answer_text: Answer text block

        Returns:
            "single" | "grouped" | "sub"
        """
        if not answer_text:
            return "single"

        # Check for grouped format: 3．B
        if self.GROUPED_ANSWER_PATTERN.search(answer_text):
            return "grouped"

        # Check for sub-question format: (1)
        if self.SUB_ANSWER_PATTERN.search(answer_text):
            return "sub"

        return "single"

    def parse_grouped_analyses(self, analysis_text: str) -> Dict[str, str]:
        """
        Parse grouped analysis format: 3．解析内容A\n4．解析内容B

        Args:
            analysis_text: Analysis text block

        Returns:
            Dictionary like {"3": "解析A", "4": "解析B"}
        """
        pattern = r"(\d+)[．.](.+?)(?=\d+[．.]|$)"
        matches = re.findall(pattern, analysis_text, re.DOTALL)
        return {num: analysis.strip() for num, analysis in matches}

    def parse_sub_analyses(self, analysis_text: str) -> Dict[str, str]:
        """
        Parse sub-question analysis format: （1）解析1\n（2）解析2

        Args:
            analysis_text: Analysis text block

        Returns:
            Dictionary like {"(1)": "解析1", "(2)": "解析2"}
        """
        # Support both full-width and half-width parentheses
        pattern = r"[（\(](\d+)[）\)]\s*([^（\(]+?)(?=[（\(]\d+[）\)]|$)"
        matches = re.findall(pattern, analysis_text, re.DOTALL)
        return {f"({num})": analysis.strip() for num, analysis in matches}

    def extract_attributes(self, text: str, mode: str = "single") -> Dict[str, any]:
        """
        Extract attributes from text (answer, difficulty, knowledge points, analysis)

        Args:
            text: Combined text from paragraphs
            mode: "single" | "grouped" | "sub" | "auto"

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
            "grouped_answers": {},   # For grouped mode
            "grouped_analyses": {},  # For grouped mode
            "sub_answers": {},       # For sub-question mode
            "sub_analyses": {},      # For sub-question mode
        }

        # Extract answer block
        answer_match = self.ANSWER_PATTERN.search(text)
        if answer_match:
            answer_text = answer_match.group(1).strip()

            # Auto-detect mode if needed
            if mode == "single" or mode == "auto":
                detected_mode = self.detect_answer_mode(answer_text)
                if mode == "auto":
                    mode = detected_mode

            if mode == "grouped":
                attributes["grouped_answers"] = self.parse_grouped_answers(answer_text)
                # First answer as default
                if attributes["grouped_answers"]:
                    first_key = list(attributes["grouped_answers"].keys())[0]
                    attributes["answer"] = attributes["grouped_answers"][first_key]
            elif mode == "sub":
                attributes["sub_answers"] = self.parse_sub_answers(answer_text)
                # First answer as default
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
                # First analysis as default
                if attributes["grouped_analyses"]:
                    first_key = list(attributes["grouped_analyses"].keys())[0]
                    attributes["analysis"] = attributes["grouped_analyses"][first_key]
            elif mode == "sub":
                attributes["sub_analyses"] = self.parse_sub_analyses(analysis_text)
                # First analysis as default
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
        # Remove all attribute blocks (support both 解析 and 详解)
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
            mode: "single" | "grouped" | "sub" | "auto"

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
