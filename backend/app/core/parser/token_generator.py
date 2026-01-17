from typing import List, Dict, Any
from docx.text.paragraph import Paragraph
from docx.text.run import Run
from app.core.parser.formula_parser import FormulaParser
from app.core.parser.image_parser import ImageParser


class TokenGenerator:
    """Generator for creating rich text token streams from Word document content"""

    def __init__(self, formula_parser: FormulaParser, image_parser: ImageParser, task_id: str = None):
        """
        Initialize token generator

        Args:
            formula_parser: Formula parser instance
            image_parser: Image parser instance
            task_id: Task ID for generating image URLs
        """
        self.formula_parser = formula_parser
        self.image_parser = image_parser
        self.task_id = task_id

    def generate_tokens(self, paragraphs: List[Paragraph]) -> List[Dict[str, Any]]:
        """
        Generate token stream from paragraphs

        Args:
            paragraphs: List of paragraph objects

        Returns:
            List of token dictionaries
        """
        tokens = []

        for paragraph in paragraphs:
            # Process each run in the paragraph
            for run in paragraph.runs:
                run_tokens = self._process_run(run)
                tokens.extend(run_tokens)

            # Add line break after paragraph (except for last one)
            if paragraph != paragraphs[-1]:
                tokens.append({"t": "text", "v": "\n"})

        return tokens

    def _process_run(self, run: Run) -> List[Dict[str, Any]]:
        """
        Process a single run and generate tokens

        Args:
            run: Run object

        Returns:
            List of token dictionaries
        """
        tokens = []

        # Check for formula
        if self.formula_parser.has_formula(run._element):
            omml_xml = self.formula_parser.extract_omml_from_run(run._element)
            if omml_xml:
                mathml = self.formula_parser.omml_to_mathml(omml_xml)
                tokens.append({
                    "t": "math",
                    "omml": omml_xml,
                    "mathml": mathml or ""
                })
                return tokens

        # Check for images
        image_refs = self._find_image_in_run(run)
        if image_refs:
            for image_id in image_refs:
                tokens.append({
                    "t": "img",
                    "ref": image_id
                })
            return tokens

        # Process text with formatting
        text = run.text
        if not text:
            return tokens

        # Check for subscript/superscript
        if run.font.subscript:
            tokens.append({
                "t": "sub",
                "v": text
            })
        elif run.font.superscript:
            tokens.append({
                "t": "sup",
                "v": text
            })
        else:
            # Regular text
            tokens.append({
                "t": "text",
                "v": text
            })

        return tokens

    def _find_image_in_run(self, run: Run) -> List[int]:
        """
        Find image references in a run

        Args:
            run: Run object

        Returns:
            List of image IDs
        """
        image_refs = []

        # Check for drawing elements
        if hasattr(run._element, 'xpath'):
            try:
                # DrawingML images
                blips = run._element.xpath('.//a:blip')
                for blip in blips:
                    rel_id = blip.get(
                        '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed'
                    )
                    if rel_id:
                        image_id = self.image_parser.get_image_id_by_rel_id(rel_id)
                        if image_id:
                            image_refs.append(image_id)

                # VML images fallback
                if not image_refs:
                    v_images = run._element.xpath('.//v:imagedata')
                    for v_img in v_images:
                        rel_id = v_img.get(
                            '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
                        )
                        if rel_id:
                            image_id = self.image_parser.get_image_id_by_rel_id(rel_id)
                            if image_id:
                                image_refs.append(image_id)
            except Exception:
                pass

        return image_refs

    def tokens_to_html(self, tokens: List[Dict[str, Any]]) -> str:
        """
        Convert token stream to HTML

        Args:
            tokens: List of token dictionaries

        Returns:
            HTML string
        """
        html_parts = []

        def is_inline_image(index: int) -> bool:
            def has_visible_content(token: Dict[str, Any]) -> bool:
                token_type = token.get("t")
                if token_type == "text":
                    return bool(token.get("v", "").strip())
                if token_type in ("sub", "sup", "math"):
                    return True
                return False

            prev_token = tokens[index - 1] if index > 0 else None
            next_token = tokens[index + 1] if index + 1 < len(tokens) else None

            if prev_token and has_visible_content(prev_token):
                return True
            if next_token and has_visible_content(next_token):
                return True
            return False

        for i, token in enumerate(tokens):
            token_type = token.get("t")

            if token_type == "text":
                # Escape HTML and preserve newlines
                text = token.get("v", "")
                text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                text = text.replace("\n", "<br>")
                html_parts.append(text)

            elif token_type == "sub":
                text = token.get("v", "")
                html_parts.append(f"<sub>{text}</sub>")

            elif token_type == "sup":
                text = token.get("v", "")
                html_parts.append(f"<sup>{text}</sup>")

            elif token_type == "math":
                mathml = token.get("mathml", "")
                if mathml:
                    html_parts.append(mathml)
                else:
                    html_parts.append("[Formula]")

            elif token_type == "img":
                image_id = token.get("ref")
                inline_class = " inline" if is_inline_image(i) else ""
                if self.task_id:
                    html_parts.append(
                        f'<img class="question-img{inline_class}" '
                        f'src="/api/paper/images/{self.task_id}/{image_id}" />'
                    )
                else:
                    html_parts.append(
                        f'<img class="question-img{inline_class}" '
                        f'src="/api/images/{image_id}" />'
                    )

        return "".join(html_parts)
