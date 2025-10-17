import fitz  # PyMuPDF

def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    full_text = "".join([page.get_text() for page in doc])
    doc.close()
    return full_text.strip()
