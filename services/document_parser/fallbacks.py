"""
Fallback OCR & Document Layout Engines.
Activates Surya or PaddleOCR if primary Marker conversion encounters an issue.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger("document_parser.fallbacks")


def fallback_surya(file_path: str, langs: List[str]) -> Dict[str, Any]:
    """
    Surya OCR / Layout fallback for multi-lingual documents (Hindi + English).
    Uses Surya's fast transformer-based text detector & recognizer.
    """
    logger.info(f"[Fallback:Surya] Attempting OCR on {file_path}")
    try:
        from PIL import Image
        import pypdfium2 as pdfium
        from surya.ocr import run_ocr
        from surya.model.recognition.model import load_model as load_rec_model
        from surya.model.recognition.processor import load_processor as load_rec_proc
        from surya.model.detection.model import load_model as load_det_model
        from surya.model.detection.processor import load_processor as load_det_proc

        # Convert PDF pages or image to PIL Images
        images: List[Image.Image] = []
        path = Path(file_path)
        if path.suffix.lower() == ".pdf":
            pdf = pdfium.PdfDocument(file_path)
            for page in pdf:
                images.append(page.render(scale=2).to_pil())
        else:
            images.append(Image.open(file_path).convert("RGB"))

        det_model, det_processor = load_det_model(), load_det_proc()
        rec_model, rec_processor = load_rec_model(), load_rec_proc()

        predictions = run_ocr(images, [langs] * len(images), det_model, det_processor, rec_model, rec_processor)

        md_pages = []
        for i, pred in enumerate(predictions):
            lines = [line.text for line in pred.text_lines]
            md_pages.append(f"## Page {i + 1}\n\n" + "\n".join(lines))

        full_md = "\n\n---\n\n".join(md_pages)
        return {
            "markdown": full_md,
            "images": [],
            "metadata": {"engine": "surya", "langs": langs},
            "pages": len(images),
        }
    except Exception as e:
        logger.warning(f"[Fallback:Surya] Execution failed: {e}")
        raise e


def fallback_paddleocr(file_path: str, lang: str = "en") -> Dict[str, Any]:
    """
    PaddleOCR fallback for robust text detection across rotated/skewed scans.
    """
    logger.info(f"[Fallback:PaddleOCR] Attempting OCR on {file_path}")
    try:
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang=lang)
        result = ocr.ocr(file_path, cls=True)

        lines = []
        if result and len(result) > 0 and result[0]:
            for line in result[0]:
                lines.append(line[1][0])

        return {
            "markdown": "\n\n".join(lines),
            "images": [],
            "metadata": {"engine": "paddleocr", "lang": lang},
            "pages": 1,
        }
    except Exception as e:
        logger.warning(f"[Fallback:PaddleOCR] Execution failed: {e}")
        raise e
