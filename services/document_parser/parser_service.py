"""
DocumentParserService — Production-Grade Document Scanning & Parsing Engine.
Powered by Datalab Marker & marker-pdf with automatic GPU/CPU auto-tuning,
Hindi + English bilingual OCR, Supabase caching, and graceful fallbacks.
"""

import asyncio
import base64
import logging
import os
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import requests

from .cache import DocumentCache, compute_file_hash
from .fallbacks import fallback_paddleocr, fallback_surya

# Configure structured logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [DocumentParserService] %(message)s",
)
logger = logging.getLogger("document_parser.service")


class DocumentParserService:
    """
    High-performance, memory-efficient document parsing service.
    
    Features:
    - Official Marker-pdf Python API + Datalab Hosted Cloud API.
    - Automatic device detection: CUDA (balanced mode) / CPU (fast mode).
    - Bilingual English + Hindi (Devanagari) OCR & layout preservation.
    - Mathematical equation conversion to LaTeX.
    - Content-addressable SHA-256 caching (Supabase + Local).
    - Lazy singleton model initialization to prevent GPU/RAM exhaustion.
    """

    _models = None
    _model_lock = asyncio.Lock()
    _init_attempted = False

    def __init__(
        self,
        api_key: Optional[str] = None,
        device: Optional[str] = None,
        mode: Optional[str] = None,
        langs: Optional[str] = None,
        enable_cache: bool = True,
    ):
        """
        Initialize DocumentParserService.
        
        Args:
            api_key: Datalab Marker API key (defaults to DATALAB_API_KEY env var)
            device: Torch execution device ('cuda', 'cpu', or 'auto')
            mode: Marker execution mode ('balanced', 'fast', or 'auto')
            langs: Target languages comma-separated (default: 'en,hi')
            enable_cache: Enable content-hashed result caching
        """
        self.api_key = api_key or os.getenv("DATALAB_API_KEY", "")
        self.raw_device = device or os.getenv("TORCH_DEVICE", "auto").lower()
        self.raw_mode = mode or os.getenv("MARKER_MODE", "auto").lower()
        self.langs = (langs or os.getenv("MARKER_LANGS", "en,hi")).split(",")
        self.enable_cache = enable_cache
        self.cache = DocumentCache() if enable_cache else None

        # Resolve device & mode
        self.resolved_device, self.resolved_mode = self._resolve_runtime_profile()
        logger.info(
            f"Initialized DocumentParserService profile: device={self.resolved_device}, "
            f"mode={self.resolved_mode}, langs={self.langs}, cloud_api={'Enabled' if self.api_key else 'Disabled'}"
        )

    def _resolve_runtime_profile(self) -> tuple[str, str]:
        """Detect available compute resources and return (device, mode)."""
        device = self.raw_device
        if device == "auto":
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                device = "cpu"

        mode = self.raw_mode
        if mode == "auto":
            mode = "balanced" if device == "cuda" else "fast"

        return device, mode

    @classmethod
    def _load_local_marker_models(cls, device: str):
        """
        Lazy load local marker-pdf models once into class memory.
        Ensures high throughput and eliminates per-request model loading overhead.
        """
        if cls._models is not None:
            return cls._models

        try:
            from marker.models import load_all_models
            logger.info(f"Loading local marker-pdf models on device: {device} (Singleton)...")
            t0 = time.time()
            cls._models = load_all_models(device=device)
            logger.info(f"Local marker models loaded successfully in {time.time() - t0:.2f}s")
            return cls._models
        except Exception as e:
            logger.warning(f"Local marker-pdf library initialization failed: {e}")
            return None

    async def _parse_with_datalab_api(
        self,
        file_path: str,
        progress_cb: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Parse document via the official Datalab Marker Cloud API.
        Submits multipart payload, polls status, and extracts structured Markdown + images.
        """
        if not self.api_key:
            raise ValueError("DATALAB_API_KEY is not configured for cloud Marker parsing.")

        url = "https://www.datalab.to/api/v1/marker"
        headers = {
            "X-Api-Key": self.api_key,
            "User-Agent": "PrepForge-DocumentParser/1.0",
        }

        if progress_cb:
            progress_cb("Uploading document to Datalab Marker engine...")

        file_obj = Path(file_path)
        with open(file_path, "rb") as f:
            files = {"file": (file_obj.name, f, "application/pdf" if file_obj.suffix.lower() == ".pdf" else "image/png")}
            data = {
                "langs": ",".join(self.langs),
                "extract_images": "true",
                "paginate": "true",
            }
            resp = requests.post(url, headers=headers, files=files, data=data, timeout=60)

        if resp.status_code != 200:
            raise RuntimeError(f"Datalab Marker API submission failed: HTTP {resp.status_code} - {resp.text}")

        submit_data = resp.json()
        request_check_url = submit_data.get("request_check_url")
        if not request_check_url:
            raise RuntimeError(f"Datalab Marker did not return a polling URL: {submit_data}")

        # Poll for completion with exponential backoff
        delay = 1.5
        max_attempts = 40
        for attempt in range(max_attempts):
            await asyncio.sleep(delay)
            if progress_cb:
                progress_cb(f"Processing document on Marker cluster (poll {attempt + 1})...")

            poll_resp = requests.get(request_check_url, headers=headers, timeout=20)
            if poll_resp.status_code != 200:
                continue

            poll_data = poll_resp.json()
            status = poll_data.get("status")

            if status == "complete":
                markdown_content = poll_data.get("markdown", "")
                raw_images = poll_data.get("images", {})
                
                # Format extracted images
                images_list = []
                if isinstance(raw_images, dict):
                    for img_name, img_data in raw_images.items():
                        images_list.append({
                            "name": img_name,
                            "data": img_data,
                        })

                pages = poll_data.get("page_count") or 1
                metadata = {
                    "engine": "datalab-marker-cloud",
                    "runtime_sec": poll_data.get("runtime"),
                    "quality_score": poll_data.get("parse_quality_score"),
                    "langs": self.langs,
                }

                return {
                    "markdown": markdown_content,
                    "images": images_list,
                    "metadata": metadata,
                    "pages": pages,
                }
            elif status == "failed":
                raise RuntimeError(f"Datalab Marker cloud processing failed: {poll_data.get('error')}")

            delay = min(delay * 1.25, 4.0)

        raise TimeoutError("Datalab Marker processing exceeded timeout threshold (60s).")

    async def _parse_with_local_marker(
        self,
        file_path: str,
        mode: str,
        progress_cb: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Parse document locally using official marker-pdf Python API.
        Uses singleton loaded models and converts document on local GPU/CPU.
        """
        async with self._model_lock:
            models = self._load_local_marker_models(self.resolved_device)

        if not models:
            raise RuntimeError("Marker-pdf models are not loaded or dependencies are missing.")

        from marker.convert import convert_single_pdf

        if progress_cb:
            progress_cb(f"Converting document via local marker-pdf on {self.resolved_device}...")

        # Run CPU/GPU bound conversion in thread executor to keep async loop non-blocking
        loop = asyncio.get_running_loop()
        full_text, images, out_metadata = await loop.run_in_executor(
            None,
            lambda: convert_single_pdf(
                file_path,
                models,
                max_pages=None,
                langs=self.langs,
                batch_multiplier=2 if mode == "fast" else 1,
            ),
        )

        formatted_images = []
        if isinstance(images, dict):
            for img_name, img_obj in images.items():
                formatted_images.append({
                    "name": img_name,
                    "data": img_obj,
                })

        return {
            "markdown": full_text,
            "images": formatted_images,
            "metadata": {
                "engine": "marker-pdf-local",
                "device": self.resolved_device,
                "mode": mode,
                "langs": self.langs,
                **(out_metadata or {}),
            },
            "pages": out_metadata.get("pages", 1) if isinstance(out_metadata, dict) else 1,
        }

    async def parse_document(
        self,
        file_path: str,
        mode: str = "auto",
        progress_cb: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Primary entry point: Parse PDF/image document to clean structured Markdown.
        
        Args:
            file_path: Absolute or relative path to PDF or image file
            mode: 'auto', 'balanced' (GPU-optimized), or 'fast' (CPU-optimized)
            progress_cb: Optional async callback for pipeline progress updates
            
        Returns:
            Dict containing:
                "markdown": Clean formatted Markdown with LaTeX math & tables
                "images": Extracted figures, diagrams, and illustrations
                "metadata": Engine, language, and execution statistics
                "pages": Total document page count
        """
        path = Path(file_path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Target document not found at: {file_path}")

        # Check Cache Tier (SHA-256)
        file_hash = compute_file_hash(str(path))
        if self.enable_cache and self.cache:
            cached_result = self.cache.get(file_hash)
            if cached_result:
                if progress_cb:
                    progress_cb("Document retrieved instantly from cache.")
                return cached_result

        active_mode = self.resolved_mode if mode == "auto" else mode
        last_error = None

        # 1. Primary Strategy: Datalab Marker Cloud Engine (if API key present)
        if self.api_key:
            try:
                result = await self._parse_with_datalab_api(str(path), progress_cb)
                if self.enable_cache and self.cache:
                    self.cache.set(file_hash, result)
                return result
            except Exception as e:
                logger.warning(f"Datalab cloud parsing failed: {e}. Attempting local fallback...")
                last_error = e

        # 2. Secondary Strategy: Official local marker-pdf Python API
        try:
            result = await self._parse_with_local_marker(str(path), active_mode, progress_cb)
            if self.enable_cache and self.cache:
                self.cache.set(file_hash, result)
            return result
        except Exception as e:
            logger.warning(f"Local marker-pdf conversion failed: {e}. Attempting OCR fallback...")
            last_error = e

        # 3. Tertiary Strategy: Surya OCR / Layout Engine Fallback
        try:
            result = fallback_surya(str(path), self.langs)
            if self.enable_cache and self.cache:
                self.cache.set(file_hash, result)
            return result
        except Exception as surya_err:
            logger.warning(f"Surya fallback failed: {surya_err}. Attempting PaddleOCR fallback...")

        # 4. Quaternary Strategy: PaddleOCR Fallback
        try:
            result = fallback_paddleocr(str(path), lang="en")
            if self.enable_cache and self.cache:
                self.cache.set(file_hash, result)
            return result
        except Exception as paddle_err:
            logger.error(f"All parsing engines exhausted. Last error: {last_error or paddle_err}")
            raise RuntimeError(
                f"Failed to parse document '{path.name}' across all available Marker and OCR engines."
            ) from last_error

    async def parse_batch(
        self,
        file_paths: List[str],
        mode: str = "auto",
        concurrency: int = 4,
    ) -> List[Dict[str, Any]]:
        """
        Asynchronously process multiple document uploads in parallel with concurrency semaphore.
        """
        semaphore = asyncio.Semaphore(concurrency)

        async def _bounded_parse(fpath: str):
            async with semaphore:
                try:
                    return await self.parse_document(fpath, mode=mode)
                except Exception as err:
                    logger.error(f"Batch parse failure for {fpath}: {err}")
                    return {
                        "file": fpath,
                        "error": str(err),
                        "markdown": "",
                        "images": [],
                        "metadata": {"status": "failed"},
                        "pages": 0,
                    }

        tasks = [_bounded_parse(p) for p in file_paths]
        return await asyncio.gather(*tasks)
