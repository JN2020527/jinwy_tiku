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
                drawings = run._element.xpath('.//w:drawing')
                for drawing in drawings:
                    # For now, use a simple counter
                    # In production, extract actual image reference
                    image_refs.append(len(image_refs) + 1)
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

        for token in tokens:
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
                if self.task_id:
                    html_parts.append(f'<img src="/api/paper/images/{self.task_id}/{image_id}" />')
                else:
                    html_parts.append(f'<img src="/api/images/{image_id}" />')

        return "".join(html_parts)
