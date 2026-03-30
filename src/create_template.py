import os
from pptx import Presentation
from pptx.util import Pt, Inches
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_PATH = os.path.join(BASE_DIR, "templates", "main_carousel.pptx")
OUTPUT_DIR = os.path.join(BASE_DIR, "templates")

# Colors matching the strategy
DARK_BG = RGBColor(20, 25, 30) # Very dark slate
TEAL = RGBColor(0, 128, 128)
CORAL = RGBColor(255, 127, 80)
TEXT_WHITE = RGBColor(240, 240, 240)
TEXT_GRAY = RGBColor(170, 170, 170)

def apply_dark_bg(slide):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = DARK_BG

def add_footer(slide, slide_num, total_slides):
    # Author handle
    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(9.2), Inches(3), Inches(0.5))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = "@DataScientistExplains"
    p.font.color.rgb = TEXT_GRAY
    p.font.size = Pt(16)
    
    # Progress/Slide num
    txBox2 = slide.shapes.add_textbox(Inches(8.5), Inches(9.2), Inches(1), Inches(0.5))
    tf2 = txBox2.text_frame
    p2 = tf2.paragraphs[0]
    p2.text = f"{slide_num}/{total_slides}"
    p2.font.color.rgb = TEAL
    p2.font.size = Pt(16)

def create_base_template():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    # Square presentation for LinkedIn (10x10 inches)
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(10)
    
    # Slide 1: Hook
    slide1 = prs.slides.add_slide(prs.slide_layouts[6]) # blank layout
    apply_dark_bg(slide1)
    add_footer(slide1, 1, 5)
    
    # Accent shape
    shape = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.5), Inches(0.5), Inches(3), Inches(0.1))
    shape.fill.solid()
    shape.fill.fore_color.rgb = CORAL
    shape.line.color.rgb = CORAL
    
    # Hook Title
    txBox = slide1.shapes.add_textbox(Inches(0.5), Inches(2), Inches(9), Inches(4))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "{{HOOK_TITLE}}"
    p.font.size = Pt(64)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    
    # Hook Subtitle
    txBox2 = slide1.shapes.add_textbox(Inches(0.5), Inches(6), Inches(9), Inches(1.5))
    tf2 = txBox2.text_frame
    tf2.word_wrap = True
    p2 = tf2.paragraphs[0]
    p2.text = "{{HOOK_SUB}}"
    p2.font.size = Pt(32)
    p2.font.color.rgb = TEAL
    
    # Slide 2: Body 1
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_bg(slide2)
    add_footer(slide2, 2, 5)
    
    txBox = slide2.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(4), Inches(0.5))
    p = txBox.text_frame.paragraphs[0]
    p.text = "HARD-WON LESSONS"
    p.font.size = Pt(14)
    p.font.color.rgb = CORAL
    p.font.bold = True
    
    txBox3 = slide2.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(1.5))
    p3 = txBox3.text_frame.paragraphs[0]
    p3.text = "{{BODY_1_TITLE}}"
    p3.font.size = Pt(44)
    p3.font.bold = True
    p3.font.color.rgb = TEXT_WHITE
    
    txBox4 = slide2.shapes.add_textbox(Inches(0.5), Inches(3.5), Inches(9), Inches(5))
    txBox4.text_frame.word_wrap = True
    p4 = txBox4.text_frame.paragraphs[0]
    p4.text = "{{BODY_1_TEXT}}"
    p4.font.size = Pt(28)
    p4.font.color.rgb = TEXT_GRAY

    # Slide 3: Body 2
    slide3 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_bg(slide3)
    add_footer(slide3, 3, 5)
    
    txBox = slide3.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(4), Inches(0.5))
    p = txBox.text_frame.paragraphs[0]
    p.text = "HARD-WON LESSONS"
    p.font.size = Pt(14)
    p.font.color.rgb = CORAL
    p.font.bold = True
    
    txBox3 = slide3.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(1.5))
    p3 = txBox3.text_frame.paragraphs[0]
    p3.text = "{{BODY_2_TITLE}}"
    p3.font.size = Pt(44)
    p3.font.bold = True
    p3.font.color.rgb = TEXT_WHITE
    
    txBox4 = slide3.shapes.add_textbox(Inches(0.5), Inches(3.5), Inches(9), Inches(5))
    txBox4.text_frame.word_wrap = True
    p4 = txBox4.text_frame.paragraphs[0]
    p4.text = "{{BODY_2_TEXT}}"
    p4.font.size = Pt(28)
    p4.font.color.rgb = TEXT_GRAY

    # Slide 4: Body 3
    slide4 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_bg(slide4)
    add_footer(slide4, 4, 5)
    
    txBox = slide4.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(4), Inches(0.5))
    p = txBox.text_frame.paragraphs[0]
    p.text = "HARD-WON LESSONS"
    p.font.size = Pt(14)
    p.font.color.rgb = CORAL
    p.font.bold = True
    
    txBox3 = slide4.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(1.5))
    p3 = txBox3.text_frame.paragraphs[0]
    p3.text = "{{BODY_3_TITLE}}"
    p3.font.size = Pt(44)
    p3.font.bold = True
    p3.font.color.rgb = TEXT_WHITE
    
    txBox4 = slide4.shapes.add_textbox(Inches(0.5), Inches(3.5), Inches(9), Inches(5))
    txBox4.text_frame.word_wrap = True
    p4 = txBox4.text_frame.paragraphs[0]
    p4.text = "{{BODY_3_TEXT}}"
    p4.font.size = Pt(28)
    p4.font.color.rgb = TEXT_GRAY
    
    # Slide 5: CTA
    slide5 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_dark_bg(slide5)
    add_footer(slide5, 5, 5)
    
    shape = slide5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.5), Inches(0.5), Inches(3), Inches(0.1))
    shape.fill.solid()
    shape.fill.fore_color.rgb = TEAL
    shape.line.color.rgb = TEAL
    
    txBox3 = slide5.shapes.add_textbox(Inches(0.5), Inches(2), Inches(9), Inches(2))
    p3 = txBox3.text_frame.paragraphs[0]
    p3.text = "{{CTA_TITLE}}"
    p3.font.size = Pt(54)
    p3.font.bold = True
    p3.font.color.rgb = TEXT_WHITE
    
    txBox4 = slide5.shapes.add_textbox(Inches(0.5), Inches(4.5), Inches(9), Inches(3))
    p4 = txBox4.text_frame.paragraphs[0]
    p4.text = "{{CTA_TEXT}}"
    p4.font.size = Pt(32)
    p4.font.color.rgb = TEXT_GRAY
    
    prs.save(TEMPLATE_PATH)
    print(f"Template successfully created at {TEMPLATE_PATH}")

if __name__ == "__main__":
    create_base_template()
