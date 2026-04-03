"""
src/generator/tiktok.py
Generator for TikTok platform.
Generates 9:16 format PNG slides for TikTok slideshows.
"""
from pathlib import Path
from src.generator.base import load_template_metadata, fill_placeholders, export_pdf, export_images, BASE_DIR
from config.settings import OUTPUT_PPTX_DIR, OUTPUT_PDF_DIR, OUTPUT_IMG_DIR

def generate_slideshow(content: dict, template_id: str):
    print(f"  [tiktok] Starting visual generation for {content['id']}")
    template_meta = load_template_metadata(template_id)
    template_path = BASE_DIR / "templates" / template_meta["path"]
    
    post_id = content["id"]
    pptx_out = OUTPUT_PPTX_DIR / f"{post_id}_tiktok.pptx"
    
    print("  [tiktok] Filling template placeholders...")
    fill_placeholders(template_path, content, pptx_out)
    
    print("  [tiktok] Converting to PDF...")
    pdf_path = export_pdf(pptx_out, OUTPUT_PDF_DIR)
    
    print("  [tiktok] Rendering vertical PNG slides...")
    img_dir = OUTPUT_IMG_DIR / "tiktok" / post_id
    img_paths = export_images(pdf_path, img_dir)
    
    print(f"  [tiktok] Generated {len(img_paths)} vertical images in {img_dir}")
    return img_paths
