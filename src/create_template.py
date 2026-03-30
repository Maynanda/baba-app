import os
from pptx import Presentation
from pptx.util import Pt, Inches
from pptx.enum.text import PP_ALIGN

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_PATH = os.path.join(BASE_DIR, "templates", "main_carousel.pptx")
OUTPUT_DIR = os.path.join(BASE_DIR, "templates")

def create_base_template():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    prs = Presentation()
    
    # Slide 1: Hook
    slide = prs.slides.add_slide(prs.slide_layouts[0]) # Title slide
    title = slide.shapes.title
    title.text = "{{TITLE}}"
    
    subtitle = slide.placeholders[1]
    subtitle.text = "Swipe to learn more \u2192"
    
    # Slide 2: Body
    slide2 = prs.slides.add_slide(prs.slide_layouts[1]) # Bullet slide
    title2 = slide2.shapes.title
    title2.text = "The Concept"
    
    body = slide2.placeholders[1]
    body.text = "{{BODY}}"
    
    # Slide 3: CTA
    slide3 = prs.slides.add_slide(prs.slide_layouts[1])
    title3 = slide3.shapes.title
    title3.text = "Call to Action"
    
    cta_body = slide3.placeholders[1]
    cta_body.text = "{{ACTION}}"
    
    prs.save(TEMPLATE_PATH)
    print(f"Template successfully created at {TEMPLATE_PATH}")

if __name__ == "__main__":
    create_base_template()
