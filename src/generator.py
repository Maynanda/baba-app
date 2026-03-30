import json
import os
import glob
from pptx import Presentation

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
TEMPLATE_PATH = os.path.join(BASE_DIR, "templates", "main_carousel.pptx")
OUTPUT_PPTX_DIR = os.path.join(BASE_DIR, "output", "pptx")

def replace_text_in_shape(shape, placeholder_dict):
    """
    Search and replace text in a PPTX shape based on a dictionary of placeholders.
    Allows formatting to be kept if possible.
    """
    if not shape.has_text_frame:
        return
        
    for paragraph in shape.text_frame.paragraphs:
        # Check if any key exists in the raw text of the entire paragraph
        # If so, we replace text run-by-run for exact matches
        para_text = "".join(run.text for run in paragraph.runs)
        
        for key, value in placeholder_dict.items():
            placeholder = f"{{{{{key}}}}}" # e.g. {{TITLE}}
            if placeholder in para_text:
                # Replace the entire text of the first run and clear others 
                # to maintain the original style of the paragraph, but handle simple replacements.
                if paragraph.runs:
                    paragraph.runs[0].text = para_text.replace(placeholder, value)
                    for i in range(1, len(paragraph.runs)):
                        paragraph.runs[i].text = ""

def generate_carousel(json_file_path):
    # Verify template exists
    if not os.path.exists(TEMPLATE_PATH):
        print(f"Error: Template not found at {TEMPLATE_PATH}")
        print("Please create the master template first.")
        return

    # Load data
    with open(json_file_path, 'r') as f:
        data = json.load(f)
        
    print(f"Loaded data for post date: {data.get('post_date')}")

    # Load Presentation
    prs = Presentation(TEMPLATE_PATH)
    
    # In a full-fledged version, you might duplicate slides based on the number of body slides in your JSON.
    # For now, we assume the template has corresponding master slides. We'll simply iterate through all slides
    # and try to replace ALL tags found in the JSON across all slides.
    
    # Flatten JSON data for simple global replacement into a single dictionary
    placeholders = {}
    for slide_data in data.get('slides', []):
        for key, val in slide_data.items():
            if key != 'type':
                placeholders[key] = str(val)
                
    print(f"Replacing placeholders: {placeholders.keys()}")
    
    # Replace text in slides
    for slide in prs.slides:
        for shape in slide.shapes:
            if shape.has_text_frame:
                replace_text_in_shape(shape, placeholders)
            # You can add logic for tables or grouping here if needed
                
    # Save the result
    output_filename = f"carousel_{os.path.basename(json_file_path).replace('.json', '.pptx')}"
    output_path = os.path.join(OUTPUT_PPTX_DIR, output_filename)
    
    prs.save(output_path)
    print(f"Successfully generated carousel: {output_path}")

def process_all_files():
    """Finds all JSON files in data dir and processes them."""
    json_files = glob.glob(os.path.join(DATA_DIR, "*.json"))
    for file in json_files:
        print(f"Processing {file}...")
        generate_carousel(file)

if __name__ == "__main__":
    process_all_files()
