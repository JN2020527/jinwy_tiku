from typing import List, Dict
from docx.text.paragraph import Paragraph
from app.core.parser.docx_parser import DocxParser
from app.core.parser.structure_parser import StructureParser
from app.core.parser.content_parser import ContentParser
from app.core.parser.formula_parser import FormulaParser
from app.core.parser.image_parser import ImageParser
from app.core.parser.token_generator import TokenGenerator
from app.models.schemas.question import QuestionItem
from app.config import get_settings


class ParseService:
    """Service for orchestrating Word document parsing workflow"""
    CHOICE_TYPE_KEYS = ("选择", "单选", "多选", "选")

    def __init__(self, file_path: str, task_id: str):
        """
        Initialize parse service

        Args:
            file_path: Path to Word document
            task_id: Task ID for this parsing job
        """
        self.file_path = file_path
        self.task_id = task_id
        self.settings = get_settings()

        # Initialize parsers
        self.docx_parser = DocxParser(file_path)
        self.formula_parser = FormulaParser()
        self.content_parser = ContentParser()

        # Initialize image parser with task-specific output directory
        image_output_dir = f"{self.settings.image_dir}/{task_id}"
        self.image_parser = ImageParser(self.docx_parser.document, image_output_dir)

        # Initialize token generator with task_id
        self.token_generator = TokenGenerator(
            self.formula_parser, self.image_parser, task_id
        )

    def filter_attribute_paragraphs(self, paragraphs: List[Paragraph]) -> List[Paragraph]:
        """
        Filter out attribute block paragraphs and analysis details

        Args:
            paragraphs: List of paragraphs

        Returns:
            Filtered list without attribute blocks and analysis details
        """
        import re

        # Patterns for analysis details
        analysis_detail_pattern = re.compile(r"^(\d+)[．.]\s*([A-D])[、．.]")
        analysis_option_pattern = re.compile(r"^([A-D])、")

        filtered = []
        for para in paragraphs:
            text = para.text.strip()
            has_image = self._paragraph_has_image(para)

            # Skip empty paragraphs
            if not text and not has_image:
                continue

            # Skip paragraphs that contain attribute markers
            if any(attr in text for attr in ["【答案】", "【难度】", "【知识点】", "【解析】", "【详解】"]):
                continue

            # Skip analysis detail paragraphs (e.g., "3．A、解析内容")
            if analysis_detail_pattern.match(text):
                continue

            # Skip analysis option details (e.g., "A、解析内容")
            if analysis_option_pattern.match(text):
                continue

            # Skip conclusion statements (e.g., "故选A。")
            if text.startswith("故选"):
                continue

            filtered.append(para)
        return filtered

    def _is_choice_type(self, question_type: str) -> bool:
        return any(key in question_type for key in self.CHOICE_TYPE_KEYS)

    def _paragraph_is_option(self, paragraph: Paragraph) -> bool:
        text = paragraph.text.strip()
        if not text:
            return False
        import re

        return re.match(r"^[A-D][.．、]\s*", text) is not None

    def _paragraph_has_attribute_marker(self, paragraph: Paragraph) -> bool:
        text = paragraph.text.strip()
        if not text:
            return False
        return any(
            marker in text
            for marker in ["【答案】", "【难度】", "【知识点】", "【解析】", "【详解】"]
        )

    def _filter_choice_options_before_attributes(
        self, paragraphs: List[Paragraph]
    ) -> List[Paragraph]:
        filtered = []
        seen_attributes = False
        for para in paragraphs:
            if self._paragraph_has_attribute_marker(para):
                seen_attributes = True
                filtered.append(para)
                continue

            if not seen_attributes and self._paragraph_is_option(para):
                continue

            filtered.append(para)

        return filtered

    def _get_choice_option_paragraphs_before_attributes(
        self, paragraphs: List[Paragraph]
    ) -> List[Paragraph]:
        options = []
        for para in paragraphs:
            if self._paragraph_has_attribute_marker(para):
                break
            if self._paragraph_is_option(para):
                options.append(para)
        return options

    def _filter_question_paragraphs(
        self,
        paragraphs: List[Paragraph],
        question_type: str,
        remove_attributes: bool = True,
    ) -> List[Paragraph]:
        if remove_attributes:
            filtered = self.filter_attribute_paragraphs(paragraphs)
        else:
            filtered = [
                p
                for p in paragraphs
                if p.text.strip() or self._paragraph_has_image(p)
            ]

        if self._is_choice_type(question_type):
            if remove_attributes:
                filtered = [p for p in filtered if not self._paragraph_is_option(p)]
            else:
                filtered = self._filter_choice_options_before_attributes(filtered)

        return filtered

    def _paragraph_has_image(self, paragraph: Paragraph) -> bool:
        """Check if paragraph contains embedded images."""
        for run in paragraph.runs:
            try:
                if run._element.xpath('.//a:blip') or run._element.xpath('.//v:imagedata'):
                    return True
            except Exception:
                continue
        return False

    def _paragraph_has_formula(self, paragraph: Paragraph) -> bool:
        """Check if paragraph contains OMML formulas."""
        try:
            return "oMath" in paragraph._element.xml
        except Exception:
            return False

    def _escape_html(self, text: str) -> str:
        return (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

    def _build_option_html(
        self, options: List[str], paragraphs: List[Paragraph]
    ) -> List[str]:
        import re

        option_paragraphs = self._get_choice_option_paragraphs_before_attributes(paragraphs)

        option_map = {}
        order = []
        for opt in options:
            match = re.match(r"^([A-D])\.\s*(.*)$", opt)
            if match:
                letter, content = match.groups()
                order.append(letter)
                option_map[letter] = {"content": content, "is_html": False}

        for para in option_paragraphs:
            text = para.text.strip()
            match = re.match(r"^([A-D])[.．、]\s*", text)
            if not match:
                continue
            letter = match.group(1)
            if self._paragraph_has_formula(para):
                html = self.token_generator.tokens_to_html(
                    self.token_generator.generate_tokens([para])
                )
                html = re.sub(rf"^\s*{letter}[.．、]\s*", "", html)
                option_map[letter] = {"content": html, "is_html": True}

        result = []
        for letter in order:
            entry = option_map.get(letter, {"content": "", "is_html": False})
            content = entry["content"] or ""
            if entry["is_html"]:
                html = content
            else:
                html = self._escape_html(content)
            result.append(f"{letter}. {html}")

        return result

    def text_to_html(self, text: str) -> str:
        """
        Convert plain text to HTML format

        Args:
            text: Plain text

        Returns:
            HTML formatted text
        """
        if not text:
            return ""

        # Replace newlines with <br> tags
        html = text.replace("\n", "<br>")

        return html

    def parse(self) -> List[QuestionItem]:
        """
        Execute full parsing workflow

        Returns:
            List of QuestionItem objects
        """
        # Step 1: Extract images
        self.image_parser.extract_all_images()

        # Step 2: Parse document structure
        paragraphs = self.docx_parser.get_paragraphs()
        structure_parser = StructureParser(paragraphs)
        question_blocks = structure_parser.extract_question_blocks()

        # Step 3: Process each question block
        questions = []
        for block in question_blocks:
            if block.get("is_fill_in"):
                # Fill-in question with sub-questions
                parent_question = self._process_fill_in_question(block)
                questions.append(parent_question)
            elif block["is_material"]:
                # Material question with sub-questions (returns single QuestionItem)
                question = self._process_material_question(block)
                questions.append(question)
            else:
                # Regular question
                question = self._process_regular_question(block)
                questions.append(question)

        return questions

    def _process_fill_in_question(self, block: Dict) -> QuestionItem:
        """
        Process a fill-in question with sub-questions

        Args:
            block: Question block dictionary

        Returns:
            QuestionItem object with children
        """
        # Parse parent attributes to distribute answers/analyses
        parent_content = self.content_parser.parse_question_content(
            block["paragraphs"], block["type"], mode="sub"
        )

        parent_paragraphs_filtered = self._filter_question_paragraphs(
            block["paragraphs"], block["type"]
        )
        parent_tokens = self.token_generator.generate_tokens(parent_paragraphs_filtered)
        parent_html = self.token_generator.tokens_to_html(parent_tokens)

        # Process sub-questions with per-sub answers
        children = []
        for sub_block in block["sub_questions"]:
            sub_number = sub_block["number"]

            sub_answer = parent_content["sub_answers"].get(sub_number, "")
            sub_analysis = parent_content["sub_analyses"].get(sub_number, "")
            sub_analysis_html = self.text_to_html(sub_analysis)

            sub_paragraphs_filtered = self._filter_question_paragraphs(
                sub_block["paragraphs"], block["type"]
            )
            sub_tokens = self.token_generator.generate_tokens(sub_paragraphs_filtered)
            sub_stem_html = self.token_generator.tokens_to_html(sub_tokens)

            sub_question = QuestionItem(
                id=f"{block['number']}-{sub_number}",
                number=sub_number,
                type=block["type"],
                stem=sub_stem_html,
                answer=sub_answer or "",
                analysis=sub_analysis_html or None,
                knowledgePoints=parent_content["knowledge_points"],
                difficulty=parent_content["difficulty"],
                parentId=block["number"],
            )
            children.append(sub_question)

        # Create parent QuestionItem (intro stem + children)
        parent_question = QuestionItem(
            id=block["number"],
            number=block["number"],
            type=block["type"],
            stem=parent_html,
            answer="",
            children=children,
        )

        return parent_question

    def _process_regular_question(
        self, block: Dict, answer_index: int = 0
    ) -> QuestionItem:
        """
        Process a regular question block

        Args:
            block: Question block dictionary
            answer_index: Index of which answer to use if multiple exist

        Returns:
            QuestionItem object
        """
        # Parse content
        content = self.content_parser.parse_question_content(
            block["paragraphs"], block["type"]
        )

        # Generate tokens for stem
        stem_paragraphs = self._filter_question_paragraphs(
            content["paragraphs"], block["type"], remove_attributes=False
        )
        stem_tokens = self.token_generator.generate_tokens(stem_paragraphs)
        stem_html = self.token_generator.tokens_to_html(stem_tokens)

        # Use specified answer index if multiple answers exist
        all_answers = content.get("all_answers", [])
        if all_answers and len(all_answers) > answer_index:
            answer_html = all_answers[answer_index] or ""
        else:
            answer_html = content["answer"] or ""

        # Use specified analysis index if multiple analyses exist
        all_analyses = content.get("all_analyses", [])
        if all_analyses and len(all_analyses) > answer_index:
            analysis_html = all_analyses[answer_index] or ""
        else:
            analysis_html = content["analysis"] or ""

        # Create QuestionItem
        difficulty_value = content["difficulty"]
        if difficulty_value is not None and (
            difficulty_value < 1 or difficulty_value > 5
        ):
            difficulty_value = None

        options = content["options"]
        if options and self._is_choice_type(block["type"]):
            options = self._build_option_html(options, content["paragraphs"])

        question = QuestionItem(
            id=block["number"],
            number=block["number"],
            type=block["type"],
            stem=stem_html,
            options=options,
            answer=answer_html,
            analysis=analysis_html,
            knowledgePoints=content["knowledge_points"],
            difficulty=difficulty_value,
        )

        return question

    def _process_material_question(self, block: Dict) -> QuestionItem:
        """
        Process a material question with sub-questions

        Detects whether it's a question group (模式2) or sub-question material (模式3)

        Args:
            block: Question block dictionary

        Returns:
            QuestionItem (for both modes)
        """
        # Check sub-question format to determine mode
        if block["sub_questions"]:
            first_sub = block["sub_questions"][0]
            first_number = first_sub["number"]

            # If sub-question number is (1)(2) format → sub-question material mode
            if first_number.startswith("("):
                return self._process_sub_question_material(block)
            else:
                # If sub-question number is 3, 4 format → question group mode
                return self._process_question_group(block)

        # Fallback to original behavior
        return self._process_question_group(block)

    def _process_sub_question_material(self, block: Dict) -> QuestionItem:
        """
        Process material + sub-question mode (模式3): 主题 + (1)(2)(3)

        Answer format: 【答案】(1)答案1 (2)答案2
        Analysis format: 【详解】（1）解析1 （2）解析2

        Args:
            block: Question block dictionary

        Returns:
            QuestionItem with children
        """
        # Parse parent content to get sub-question answers and analyses
        parent_content = self.content_parser.parse_question_content(
            block["paragraphs"], block["type"], mode="sub"
        )

        # Process sub-questions
        children = []
        for idx, sub_block in enumerate(block["sub_questions"]):
            sub_number = sub_block["number"]  # "(1)", "(2)"

            # Get corresponding answer from parent's sub_answers
            sub_answer = parent_content["sub_answers"].get(sub_number, "")
            sub_analysis = parent_content["sub_analyses"].get(sub_number, "")

            # Convert analysis text to HTML format
            sub_analysis_html = self.text_to_html(sub_analysis)

            # Parse sub-question content
            sub_content = self.content_parser.parse_question_content(
                sub_block["paragraphs"], block["type"], mode="single"
            )

            # Filter out attribute blocks and analysis details from sub-question paragraphs
            sub_paragraphs_filtered = self._filter_question_paragraphs(
                sub_block["paragraphs"], block["type"]
            )

            # Generate sub-question HTML (without analysis details)
            sub_tokens = self.token_generator.generate_tokens(sub_paragraphs_filtered)
            sub_stem_html = self.token_generator.tokens_to_html(sub_tokens)

            sub_question = QuestionItem(
                id=f"{block['number']}-{sub_number}",
                number=sub_number,
                type=block["type"],
                stem=sub_stem_html,
                answer=sub_answer,
                analysis=sub_analysis_html,
                knowledgePoints=parent_content["knowledge_points"],
                difficulty=parent_content["difficulty"],
                parentId=block["number"],
            )
            children.append(sub_question)

        # Filter out attribute blocks from parent paragraphs before generating HTML
        parent_paragraphs_filtered = self.filter_attribute_paragraphs(block["paragraphs"])

        # Generate parent HTML (main stem without attributes)
        parent_tokens = self.token_generator.generate_tokens(parent_paragraphs_filtered)
        parent_html = self.token_generator.tokens_to_html(parent_tokens)

        parent_question = QuestionItem(
            id=block["number"],
            number=block["number"],
            type=block["type"],
            stem=parent_html,
            answer="",  # Parent has no independent answer
            children=children,
        )

        return parent_question

    def _process_question_group(self, block: Dict) -> QuestionItem:
        """
        Process question group mode (模式2): 材料 + 题3 + 题4

        Returns a parent QuestionItem with children array (JYeoo style).
        - Parent: Contains only material content
        - Children: Independent question items with relative numbering (1, 2, 3...)

        Answer format: 【答案】3．B    4．A
        Analysis format: 【解析】3．...  4．...

        Args:
            block: Question block dictionary

        Returns:
            Parent QuestionItem with children array
        """
        # Parse material section to get shared answers and analyses
        material_content = self.content_parser.parse_question_content(
            block["paragraphs"], block["type"], mode="grouped"
        )

        # Filter out attribute blocks from material paragraphs before generating HTML
        material_paragraphs_filtered = self.filter_attribute_paragraphs(block["paragraphs"])

        # Generate material stem HTML (only material content, no sub-questions or attributes)
        material_tokens = self.token_generator.generate_tokens(material_paragraphs_filtered)
        material_stem_html = self.token_generator.tokens_to_html(material_tokens)

        # Use the first sub-question number as the parent question ID
        first_sub_number = block["sub_questions"][0]["number"] if block["sub_questions"] else block["number"]

        # Process each sub-question as independent child
        children = []
        for idx, sub_block in enumerate(block["sub_questions"]):
            sub_number = sub_block["number"]  # Absolute number: "3", "4"
            relative_number = str(idx + 1)  # Relative number: "1", "2"

            # Get corresponding answer and analysis from grouped data
            sub_answer = material_content["grouped_answers"].get(sub_number, "")
            sub_analysis = material_content["grouped_analyses"].get(sub_number, "")

            # Convert analysis text to HTML format
            sub_analysis_html = self.text_to_html(sub_analysis)

            # Parse sub-question content
            sub_content = self.content_parser.parse_question_content(
                sub_block["paragraphs"], block["type"], mode="single"
            )

            # Filter out attribute blocks and analysis details from sub-question paragraphs
            sub_paragraphs_filtered = self._filter_question_paragraphs(
                sub_block["paragraphs"], block["type"]
            )

            # Generate sub-question stem HTML (only sub-question content, no material or analysis)
            sub_tokens = self.token_generator.generate_tokens(sub_paragraphs_filtered)
            sub_stem_html = self.token_generator.tokens_to_html(sub_tokens)

            # Create child QuestionItem with relative numbering
            child_question = QuestionItem(
                id=f"{first_sub_number}-{relative_number}",
                number=relative_number,  # Use relative number: "1", "2"
                type=block["type"],
                stem=sub_stem_html,
                options=sub_content["options"],
                answer=sub_answer,
                analysis=sub_analysis_html,
                knowledgePoints=material_content["knowledge_points"],
                difficulty=material_content["difficulty"],
                parentId=first_sub_number,
            )
            children.append(child_question)

        # Create parent QuestionItem (only contains material)
        parent_question = QuestionItem(
            id=first_sub_number,
            number=first_sub_number,
            type=block["type"],
            stem=material_stem_html,
            options=None,
            answer="",  # Parent has no answer
            analysis=None,  # Parent has no analysis
            knowledgePoints=material_content["knowledge_points"],
            difficulty=material_content["difficulty"],
            parentId=None,
            children=children,
        )

        return parent_question
