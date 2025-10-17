import os
import fitz  # PyMuPDF
import requests
from dotenv import load_dotenv

# ✅ Load .env from backend folder explicitly
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

ENDPOINT = os.getenv("AZURE_MODEL_ENDPOINT")
API_KEY = os.getenv("AZURE_API_KEY")

if not ENDPOINT or not API_KEY:
    raise RuntimeError("Missing AZURE_MODEL_ENDPOINT or AZURE_API_KEY")

def generate_summary(file_path: str) -> str:
    # ✅ Extract full text from PDF
    doc = fitz.open(file_path)
    full_text = "\n".join([page.get_text() for page in doc])
    doc.close()

    # ✅ Construct payload for Azure Foundry
    payload = {
        "input_data": {
            "input_string": [
                {
                    "role": "user",
                    "content": f"Summarize the following:\n{full_text}"
                }
            ],
            "parameters": {
                "temperature": 0.3,
                "max_tokens": 512
            }
        }
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    # ✅ Call Azure model
    response = requests.post(ENDPOINT, json=payload, headers=headers)
    response.raise_for_status()

    # ✅ Extract summary text
    return response.json().get("output", "[No summary returned]")
