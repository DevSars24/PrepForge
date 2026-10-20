"""
Runner script for PrepForge Document Parser Microservice.
Launches Uvicorn server on port 8000.
"""

import os
import uvicorn
from dotenv import load_dotenv

# Load workspace root .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

if __name__ == "__main__":
    host = os.getenv("DOCUMENT_PARSER_HOST", "0.0.0.0")
    port = int(os.getenv("DOCUMENT_PARSER_PORT", "8000"))
    print(f"Starting Document Parser Service on http://{host}:{port} ...")
    uvicorn.run("services.document_parser.api:app", host=host, port=port, reload=False, workers=1)
