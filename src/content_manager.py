import os
import json
import argparse
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
TEMPLATE_POST = {
    "post_date": datetime.now().strftime("%Y-%m-%d"),
    "slides": [
        {
            "HOOK_TITLE": "Default Hook Title",
            "HOOK_SUB": "Default Hook Subtitle \u2192",
            "BODY_1_TITLE": "1. Point One",
            "BODY_1_TEXT": "Explanation for point one.",
            "BODY_2_TITLE": "2. Point Two",
            "BODY_2_TEXT": "Explanation for point two.",
            "BODY_3_TITLE": "3. Point Three",
            "BODY_3_TEXT": "Explanation for point three.",
            "CTA_TITLE": "Found this helpful?",
            "CTA_TEXT": "I share real-world AI and Data Science lessons every week. Hit follow so you don't miss the next one."
        }
    ]
}

def list_posts():
    """List all available JSON posts in the data directory."""
    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    if not files:
        print("No post data found in data/")
        return
    
    print("\n--- Available Post Data ---")
    for f in sorted(files):
        print(f"- {f}")
    print("---------------------------\n")

def create_post(name):
    """Create a new JSON post from the default template."""
    filename = f"{name}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    if os.path.exists(filepath):
        print(f"Error: Post '{filename}' already exists.")
        return
    
    with open(filepath, 'w') as f:
        json.dump(TEMPLATE_POST, f, indent=2)
    
    print(f"Successfully created new post template: {filepath}")
    print("You can now edit this file with your content.")

def main():
    parser = argparse.ArgumentParser(description="Baba-App Content Manager & Data Generator")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # List command
    subparsers.add_parser("list", help="List all generated posts")
    
    # Create command
    create_parser = subparsers.add_parser("create", help="Create a new post template")
    create_parser.add_argument("name", help="Name of the post (slug)")
    
    args = parser.parse_args()
    
    if args.command == "list":
        list_posts()
    elif args.command == "create":
        create_post(args.name)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
