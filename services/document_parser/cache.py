"""
Document Conversion Caching Layer for Marker Parser.
Provides SHA-256 fingerprinting with Supabase persistence and local fallback.
"""

import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional
import urllib.request
import urllib.error

logger = logging.getLogger("document_parser.cache")

LOCAL_CACHE_DIR = Path(__file__).resolve().parent / ".cache"
LOCAL_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def compute_file_hash(file_path: str) -> str:
    """Compute a SHA-256 hash of a file for exact content-based deduplication."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            sha256.update(chunk)
    return sha256.hexdigest()


class DocumentCache:
    """
    Two-tier caching strategy:
    Tier 1: Supabase REST API ('marker_document_cache' table)
    Tier 2: Local atomic JSON disk cache (zero-network fallback)
    """

    def __init__(self):
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
        self.supabase_key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
            or ""
        )

    def get(self, file_hash: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached parsed document by file content hash."""
        # 1. Try Supabase Cache
        if self.supabase_url and self.supabase_key:
            try:
                url = f"{self.supabase_url}/rest/v1/marker_document_cache?doc_hash=eq.{file_hash}&select=*"
                req = urllib.request.Request(
                    url,
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/json",
                    },
                )
                with urllib.request.urlopen(req, timeout=3) as resp:
                    if resp.status == 200:
                        rows = json.loads(resp.read().decode())
                        if rows and isinstance(rows, list):
                            cached = rows[0]
                            logger.info(f"[Cache HIT - Supabase] Hash: {file_hash[:12]}...")
                            return {
                                "markdown": cached.get("markdown", ""),
                                "images": cached.get("images", []),
                                "metadata": cached.get("metadata", {}),
                                "pages": cached.get("pages", 1),
                                "cached": True,
                                "cache_source": "supabase",
                            }
            except Exception as e:
                logger.debug(f"Supabase cache lookup bypassed: {e}")

        # 2. Try Local File Cache
        local_file = LOCAL_CACHE_DIR / f"{file_hash}.json"
        if local_file.exists():
            try:
                with open(local_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    logger.info(f"[Cache HIT - Local] Hash: {file_hash[:12]}...")
                    data["cached"] = True
                    data["cache_source"] = "local"
                    return data
            except Exception as e:
                logger.warning(f"Failed to read local cache file {local_file}: {e}")

        return None

    def set(self, file_hash: str, parse_result: Dict[str, Any]) -> None:
        """Store parsed result in both Supabase and Local Cache."""
        payload = {
            "doc_hash": file_hash,
            "markdown": parse_result.get("markdown", ""),
            "images": parse_result.get("images", []),
            "metadata": parse_result.get("metadata", {}),
            "pages": parse_result.get("pages", 1),
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        # 1. Persist to Local File Cache
        local_file = LOCAL_CACHE_DIR / f"{file_hash}.json"
        try:
            with open(local_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Failed to write local cache: {e}")

        # 2. Persist to Supabase if accessible
        if self.supabase_url and self.supabase_key:
            try:
                url = f"{self.supabase_url}/rest/v1/marker_document_cache"
                data_bytes = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=data_bytes,
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=4) as resp:
                    if resp.status in (200, 201):
                        logger.info(f"[Cache STORE - Supabase] Hash: {file_hash[:12]}...")
            except Exception as e:
                logger.debug(f"Supabase cache store non-blocking notice: {e}")
