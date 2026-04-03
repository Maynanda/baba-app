"""
src/generator/linkedin.py
Generator for LinkedIn platform.
Generates 1:1 format PDF doc for carousels.
"""
from pathlib import Path
from src.generator.base import load_template_metadata, fill_placeholders, export_pdf, BASE_DIR
from config.settings import OUTPUT_PPTX_DIR, OUTPUT_PDF_DIR

def generate(content: dict, template_id: str):
    print(f"  [linkedin] Starting visual generation for {content['id']}")
    template_meta = load_template_metadata(template_id)
    template_path = BASE_DIR / "templates" / template_meta["path"]
    
    post_id = content["id"]
    pptx_out = OUTPUT_PPTX_DIR / f"{post_id}_linkedin.pptx"
    
    print("  [linkedin] Filling template placeholders...")
    fill_placeholders(template_path, content, pptx_out)
    
    print("  [linkedin] Converting format to PDF...")
    pdf_path = export_pdf(pptx_out, OUTPUT_PDF_DIR)
    
    print(f"  [linkedin] Successfully generated LinkedIn PDF: {pdf_path}")
    return pdf_path
