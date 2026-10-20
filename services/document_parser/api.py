"""
FastAPI Microservice for DocumentParserService.
Exposes async endpoints for Next.js, supporting single/batch PDF and image parsing.
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import List, Optional
import urllib.request

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from .parser_service import DocumentParserService

app = FastAPI(
    title="PrepForge Document Parser Service",
    description="Production-grade Marker-pdf Document Scanner & Markdown Extractor",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instance
parser_service = DocumentParserService()


class ParseUrlRequest(BaseModel):
    url: HttpUrl
    mode: Optional[str] = "auto"


@app.get("/health")
async def health_check():
    """Return parser runtime status, compute device, and configuration."""
    return {
        "status": "healthy",
        "device": parser_service.resolved_device,
        "mode": parser_service.resolved_mode,
        "langs": parser_service.langs,
        "cloud_api_available": bool(parser_service.api_key),
        "cache_enabled": parser_service.enable_cache,
    }


@app.post("/parse")
async def parse_uploaded_file(
    file: UploadFile = File(...),
    mode: str = Form("auto"),
):
    """
    Parse an uploaded PDF or image file into structured Markdown with extracted images.
    """
    suffix = Path(file.filename or "temp_doc.pdf").suffix
    if suffix.lower() not in [".pdf", ".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {suffix}. Supported: PDF, PNG, JPG, WEBP.",
        )

    # Save to tempfile safely
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = temp_file.name
        shutil.copyfileobj(file.file, temp_file)

    try:
        result = await parser_service.parse_document(temp_path, mode=mode)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/parse-url")
async def parse_file_from_url(payload: ParseUrlRequest):
    """
    Download and parse a document directly from a public URL (e.g. Supabase Storage bucket).
    """
    url_str = str(payload.url)
    suffix = Path(url_str.split("?")[0]).suffix or ".pdf"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = temp_file.name
        try:
            req = urllib.request.Request(url_str, headers={"User-Agent": "PrepForge-Downloader/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                temp_file.write(resp.read())
        except Exception as dl_err:
            raise HTTPException(status_code=400, detail=f"Failed to fetch document from URL: {dl_err}")

    try:
        result = await parser_service.parse_document(temp_path, mode=payload.mode or "auto")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/batch")
async def parse_batch_files(
    files: List[UploadFile] = File(...),
    mode: str = Form("auto"),
):
    """
    Asynchronously parse multiple documents concurrently.
    """
    temp_paths = []
    try:
        for file in files:
            suffix = Path(file.filename or "doc.pdf").suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                shutil.copyfileobj(file.file, temp_file)
                temp_paths.append(temp_file.name)

        results = await parser_service.parse_batch(temp_paths, mode=mode)
        return {"total": len(results), "documents": results}
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)
