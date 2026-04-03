"""
src/generator/instagram.py
Generator for Instagram platform.
Generates 1:1 format PNG for feed, and 9:16 format PNG for story.
"""
from pathlib import Path
from src.generator.base import load_template_metadata, fill_placeholders, export_pdf, export_images, BASE_DIR
from config.settings import OUTPUT_PPTX_DIR, OUTPUT_PDF_DIR, OUTPUT_IMG_DIR

def _generate_images(content: dict, template_id: str, platform_suffix: str):
    print(f"  [{platform_suffix}] Starting visual generation for {content['id']}")
    template_meta = load_template_metadata(template_id)
    template_path = BASE_DIR / "templates" / template_meta["path"]
    
    post_id = content["id"]
    pptx_out = OUTPUT_PPTX_DIR / f"{post_id}_{platform_suffix}.pptx"
    
    print(f"  [{platform_suffix}] Filling template placeholders...")
    fill_placeholders(template_path, content, pptx_out)
    
    print(f"  [{platform_suffix}] Converting to PDF...")
    pdf_path = export_pdf(pptx_out, OUTPUT_PDF_DIR)
    
    print(f"  [{platform_suffix}] Rendering PNG slides...")
    img_dir = OUTPUT_IMG_DIR / platform_suffix / post_id
    img_paths = export_images(pdf_path, img_dir)
    
    print(f"  [{platform_suffix}] Generated {len(img_paths)} images in {img_dir}")
    return img_paths

def generate_feed(content: dict, template_id: str):
    return _generate_images(content, template_id, "instagram_feed")

def generate_story(content: dict, template_id: str):
    # Depending on your architecture, you might need to map to the 9:16 template here
    # Since Instagram story specifically wants 9:16, we override or ensure the template is 9:16
    # Right now, using what's passed, but preferably pass story_dark_9x16
    return _generate_images(content, template_id, "instagram_story")
