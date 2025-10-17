from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import shutil, os
from utils.pdf_utils import extract_text_from_pdf
from ai.summarizer import call_model

# === Config ===
UPLOAD_DIR = "uploads"

# === FastAPI App ===
app = FastAPI()

app = FastAPI(
    title="InsightBridge API",
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json"
)


# === Upload Endpoint ===
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = extract_text_from_pdf(file_path)
    summary = call_model(extracted_text)

    return {
        "filename": file.filename,
        "summary": summary
    }
