from docx import Document
from docx.document import Document as DocumentType
from docx.oxml import parse_xml
from typing import List, Dict, Optional
import os
import hashlib
from PIL import Image
import io


class ImageInfo:
    """Container for image information"""
    def __init__(self, image_id: int, filename: str, file_path: str, content_type: str, size: int):
        self.image_id = image_id
        self.filename = filename
        self.file_path = file_path
        self.content_type = content_type
        self.size = size


class ImageParser:
    """Parser for extracting images from Word documents"""

    def __init__(self, document: DocumentType, output_dir: str):
        """
        Initialize image parser

        Args:
            document: python-docx Document object
            output_dir: Directory to save extracted images
        """
        self.document = document
        self.output_dir = output_dir
        self.images: List[ImageInfo] = []
        self.image_counter = 0

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

    def extract_all_images(self) -> List[ImageInfo]:
        """
        Extract all images from document and save to disk

        Returns:
            List of ImageInfo objects
        """
        # Get all image relationships
        for rel_id, rel in self.document.part.rels.items():
            if "image" in rel.target_ref:
                try:
                    image_part = rel.target_part
                    image_data = image_part.blob

                    # Generate image info
                    image_info = self._save_image(image_data, rel.target_ref)
                    if image_info:
                        self.images.append(image_info)
                except Exception as e:
                    print(f"Error extracting image {rel_id}: {e}")

        return self.images

    def _save_image(self, image_data: bytes, target_ref: str) -> Optional[ImageInfo]:
        """
        Save image to disk and return image info

        Args:
            image_data: Image binary data
            target_ref: Image reference from document

        Returns:
            ImageInfo object or None
        """
        try:
            # Determine content type from data
            content_type = self._detect_image_type(image_data)
            if not content_type:
                return None

            # Generate unique filename
            self.image_counter += 1
            image_hash = hashlib.md5(image_data).hexdigest()[:8]
            extension = self._get_extension(content_type)
            filename = f"image_{self.image_counter}_{image_hash}{extension}"
            file_path = os.path.join(self.output_dir, filename)

            # Save image
            with open(file_path, 'wb') as f:
                f.write(image_data)

            # Create image info
            image_info = ImageInfo(
                image_id=self.image_counter,
                filename=filename,
                file_path=file_path,
                content_type=content_type,
                size=len(image_data)
            )

            return image_info
        except Exception as e:
            print(f"Error saving image: {e}")
            return None

    def _detect_image_type(self, image_data: bytes) -> Optional[str]:
        """
        Detect image MIME type from binary data

        Args:
            image_data: Image binary data

        Returns:
            MIME type string or None
        """
        try:
            # Use PIL to detect image type
            img = Image.open(io.BytesIO(image_data))
            format_lower = img.format.lower()

            mime_types = {
                'jpeg': 'image/jpeg',
                'jpg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'bmp': 'image/bmp',
                'tiff': 'image/tiff',
                'webp': 'image/webp'
            }

            return mime_types.get(format_lower, f'image/{format_lower}')
        except Exception:
            # Fallback: check magic bytes
            if image_data.startswith(b'\xff\xd8\xff'):
                return 'image/jpeg'
            elif image_data.startswith(b'\x89PNG'):
                return 'image/png'
            elif image_data.startswith(b'GIF8'):
                return 'image/gif'
            elif image_data.startswith(b'BM'):
                return 'image/bmp'
            return None

    def _get_extension(self, content_type: str) -> str:
        """
        Get file extension from MIME type

        Args:
            content_type: MIME type

        Returns:
            File extension with dot
        """
        extensions = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/bmp': '.bmp',
            'image/tiff': '.tiff',
            'image/webp': '.webp'
        }
        return extensions.get(content_type, '.jpg')

    def get_image_by_id(self, image_id: int) -> Optional[ImageInfo]:
        """
        Get image info by ID

        Args:
            image_id: Image ID

        Returns:
            ImageInfo object or None
        """
        for img in self.images:
            if img.image_id == image_id:
                return img
        return None

    def find_image_references_in_paragraph(self, paragraph) -> List[int]:
        """
        Find image references in a paragraph

        Args:
            paragraph: Paragraph object

        Returns:
            List of image IDs referenced in paragraph
        """
        image_refs = []

        # Look for drawing elements in paragraph
        for run in paragraph.runs:
            # Check for inline images
            if hasattr(run._element, 'xpath'):
                drawings = run._element.xpath('.//w:drawing')
                for drawing in drawings:
                    # Extract image reference
                    # This is a simplified approach
                    image_refs.append(len(image_refs) + 1)

        return image_refs
