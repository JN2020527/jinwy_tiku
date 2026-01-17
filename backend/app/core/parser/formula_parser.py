from lxml import etree
from typing import Optional
import os


class FormulaParser:
    """Parser for converting OMML (Office Math Markup Language) to MathML"""

    # OMML namespace
    OMML_NS = {
        'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    }

    def __init__(self):
        """Initialize formula parser"""
        # Load OMML to MathML XSLT transformation if available
        self.xslt_transform = None
        self._load_xslt()

    def _load_xslt(self):
        """Load OMML to MathML XSLT stylesheet"""
        # Note: In production, you would load the official Microsoft OMML2MML.xsl
        # For now, we'll use a basic transformation approach
        pass

    def extract_omml_from_run(self, run_element) -> Optional[str]:
        """
        Extract OMML XML from a run element

        Args:
            run_element: Run element that may contain math

        Returns:
            OMML XML string or None
        """
        try:
            # Look for oMath element in run
            math_elements = run_element.findall('.//m:oMath', self.OMML_NS)
            if math_elements:
                # Return the first math element as string
                return etree.tostring(math_elements[0], encoding='unicode')
        except Exception:
            pass
        return None

    def omml_to_mathml(self, omml_xml: str) -> Optional[str]:
        """
        Convert OMML XML to MathML

        Args:
            omml_xml: OMML XML string

        Returns:
            MathML string or None
        """
        try:
            # Parse OMML XML
            omml_tree = etree.fromstring(omml_xml.encode('utf-8'))

            # Basic conversion (simplified)
            # In production, use proper XSLT transformation
            mathml = self._basic_omml_to_mathml(omml_tree)
            return mathml
        except Exception as e:
            print(f"Error converting OMML to MathML: {e}")
            return None

    def _basic_omml_to_mathml(self, omml_element) -> str:
        """
        Basic OMML to MathML conversion (simplified implementation)

        Args:
            omml_element: OMML element tree

        Returns:
            MathML string
        """
        # This is a simplified conversion
        # In production, use the official OMML2MML.xsl transformation

        mathml_parts = ['<math xmlns="http://www.w3.org/1998/Math/MathML">']

        # Process OMML elements
        self._process_omml_element(omml_element, mathml_parts)

        mathml_parts.append('</math>')
        return ''.join(mathml_parts)

    def _process_omml_element(self, element, mathml_parts):
        """
        Recursively process OMML elements and convert to MathML

        Args:
            element: OMML element
            mathml_parts: List to append MathML parts to
        """
        tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag

        # Map OMML elements to MathML
        if tag == 'r':  # Run (text)
            text_elem = element.find('.//m:t', self.OMML_NS)
            if text_elem is not None and text_elem.text:
                mathml_parts.append(f'<mi>{text_elem.text}</mi>')

        elif tag == 'f':  # Fraction
            num = element.find('.//m:num', self.OMML_NS)
            den = element.find('.//m:den', self.OMML_NS)
            mathml_parts.append('<mfrac>')
            if num is not None:
                mathml_parts.append('<mrow>')
                for child in num:
                    self._process_omml_element(child, mathml_parts)
                mathml_parts.append('</mrow>')
            if den is not None:
                mathml_parts.append('<mrow>')
                for child in den:
                    self._process_omml_element(child, mathml_parts)
                mathml_parts.append('</mrow>')
            mathml_parts.append('</mfrac>')

        elif tag == 'sSup':  # Superscript
            base = element.find('.//m:e', self.OMML_NS)
            sup = element.find('.//m:sup', self.OMML_NS)
            mathml_parts.append('<msup>')
            if base is not None:
                mathml_parts.append('<mrow>')
                for child in base:
                    self._process_omml_element(child, mathml_parts)
                mathml_parts.append('</mrow>')
            if sup is not None:
                mathml_parts.append('<mrow>')
                for child in sup:
                    self._process_omml_element(child, mathml_parts)
                mathml_parts.append('</mrow>')
            mathml_parts.append('</msup>')

        elif tag == 'sSub':  # Subscript
            base = element.find('.//m:e', self.OMML_NS)
            sub = element.find('.//m:sub', self.OMML_NS)
            mathml_parts.append('<msub>')
            if base is not None:
                mathml_parts.append('<mrow>')
                for child in base:
                    self._process_omml_element(child, mathml_parts)
                mathml_parts.append('</mrow>')
            if sub is not None:
                mathml_parts.append('<mrow>')
                for child in sub:
                    self._process_omml_element(child, mathml_parts)
                mathml_parts.append('</mrow>')
            mathml_parts.append('</msub>')

        else:
            # Process children for other elements
            for child in element:
                self._process_omml_element(child, mathml_parts)

    def has_formula(self, run_element) -> bool:
        """
        Check if a run element contains a formula

        Args:
            run_element: Run element to check

        Returns:
            True if contains formula, False otherwise
        """
        try:
            math_elements = run_element.findall('.//m:oMath', self.OMML_NS)
            return len(math_elements) > 0
        except Exception:
            return False
